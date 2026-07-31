from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.presentation.dependencies import get_current_user, require_roles
from app.presentation.schemas import AssetCreate, AssetResponse, AssetCategoryResponse
from app.infrastructure.db.models import Asset, AssetCategory, User
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

router = APIRouter(prefix="/assets", tags=["Asset Management"])

@router.get("/categories", response_model=List[AssetCategoryResponse])
async def get_asset_categories(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = select(AssetCategory).order_by(AssetCategory.name)
    res = await db.execute(query)
    categories = res.scalars().all()
    return [AssetCategoryResponse.model_validate(c) for c in categories]

@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    payload: AssetCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(["ADMIN", "ZONE_OFFICER"]))
):
    point = None
    if payload.latitude is not None and payload.longitude is not None:
        point = from_shape(Point(payload.longitude, payload.latitude), srid=4326)
        
    asset = Asset(
        category_id=payload.category_id,
        ward_id=payload.ward_id,
        shelter_id=payload.shelter_id,
        name=payload.name,
        serial_number=payload.serial_number,
        status=payload.status,
        location=point
    )
    db.add(asset)
    await db.flush()
    
    return AssetResponse(
        id=asset.id,
        category_id=asset.category_id,
        ward_id=asset.ward_id,
        shelter_id=asset.shelter_id,
        name=asset.name,
        serial_number=asset.serial_number,
        status=asset.status,
        latitude=payload.latitude,
        longitude=payload.longitude,
        created_at=asset.created_at
    )

@router.get("", response_model=List[AssetResponse])
async def get_assets(
    ward_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = select(Asset).where(Asset.deleted_at == None)
    if ward_id:
        query = query.where(Asset.ward_id == ward_id)
    if category_id:
        query = query.where(Asset.category_id == category_id)
        
    res = await db.execute(query)
    assets = res.scalars().all()
    
    out = []
    for a in assets:
        lat, lon = None, None
        if a.location is not None:
            from shapely import wkb
            geom = wkb.loads(bytes(a.location.data))
            lon, lat = geom.x, geom.y
            
        out.append(
            AssetResponse(
                id=a.id,
                category_id=a.category_id,
                ward_id=a.ward_id,
                shelter_id=a.shelter_id,
                name=a.name,
                serial_number=a.serial_number,
                status=a.status,
                latitude=lat,
                longitude=lon,
                created_at=a.created_at
            )
        )
    return out
