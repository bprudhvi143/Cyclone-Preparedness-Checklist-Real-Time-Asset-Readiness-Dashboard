from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.presentation.dependencies import get_current_user
from app.presentation.schemas import ZoneResponse, WardResponse
from app.infrastructure.db.models import Zone, Ward, User

router = APIRouter(prefix="/locations", tags=["Administrative Hierarchy"])

@router.get("/zones", response_model=List[ZoneResponse])
async def get_zones(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Zone).order_by(Zone.name)
    res = await db.execute(query)
    zones = res.scalars().all()
    return [ZoneResponse.model_validate(z) for z in zones]

@router.get("/wards", response_model=List[WardResponse])
async def get_wards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Ward).order_by(Ward.number)
    res = await db.execute(query)
    wards = res.scalars().all()
    
    # Boundary parsing to float points array
    out = []
    for w in wards:
        # Note: In mock or simple local dev without PostGIS fully linked, boundary might be None
        # In full PostGIS, shape parsing uses shapely to map coordinate arrays
        boundary_list = None
        if w.boundary:
            from shapely import wkb
            # Read geom
            geom = wkb.loads(bytes(w.boundary.data))
            boundary_list = [list(coord) for coord in geom.exterior.coords]
        
        out.append(
            WardResponse(
                id=w.id,
                zone_id=w.zone_id,
                number=w.number,
                name=w.name,
                boundary=boundary_list,
                created_at=w.created_at
            )
        )
    return out
