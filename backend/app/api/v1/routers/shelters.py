from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.presentation.dependencies import get_current_user, require_roles
from app.presentation.schemas import ShelterCreate, ShelterResponse
from app.infrastructure.db.models import Shelter, User
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point

router = APIRouter(prefix="/shelters", tags=["Cyclone Shelters"])

@router.post("", response_model=ShelterResponse, status_code=status.HTTP_201_CREATED)
async def create_shelter(
    payload: ShelterCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "ZONE_OFFICER"]))
):
    point = from_shape(Point(payload.longitude, payload.latitude), srid=4326)
    
    shelter = Shelter(
        ward_id=payload.ward_id,
        name=payload.name,
        address=payload.address,
        location=point,
        capacity=payload.capacity,
        contact_person=payload.contact_person,
        contact_phone=payload.contact_phone
    )
    db.add(shelter)
    await db.flush()
    
    return ShelterResponse(
        id=shelter.id,
        ward_id=shelter.ward_id,
        name=shelter.name,
        address=shelter.address,
        capacity=shelter.capacity,
        latitude=payload.latitude,
        longitude=payload.longitude,
        contact_person=shelter.contact_person,
        contact_phone=shelter.contact_phone,
        created_at=shelter.created_at
    )

@router.get("", response_model=List[ShelterResponse])
async def get_shelters(
    ward_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = select(Shelter).where(Shelter.deleted_at == None)
    if ward_id:
        query = query.where(Shelter.ward_id == ward_id)
        
    res = await db.execute(query)
    shelters = res.scalars().all()
    
    out = []
    for s in shelters:
        lat, lon = 0.0, 0.0
        if s.location is not None:
            # Parse Point from WKB
            from shapely import wkb
            geom = wkb.loads(bytes(s.location.data))
            lon, lat = geom.x, geom.y
            
        out.append(
            ShelterResponse(
                id=s.id,
                ward_id=s.ward_id,
                name=s.name,
                address=s.address,
                capacity=s.capacity,
                latitude=lat,
                longitude=lon,
                contact_person=s.contact_person,
                contact_phone=s.contact_phone,
                created_at=s.created_at
            )
        )
    return out
