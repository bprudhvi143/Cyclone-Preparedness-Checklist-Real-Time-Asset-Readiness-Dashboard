from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.presentation.dependencies import get_current_user, require_roles
from app.presentation.schemas import DashboardStatsResponse
from app.infrastructure.db.models import (
    ReadinessSnapshot, ChecklistSubmission, SystemAlert, Shelter, Asset, ActivityLog, User
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard Real-time Telemetry"])

@router.get("/statistics", response_model=DashboardStatsResponse)
async def get_dashboard_statistics(
    operational_cycle_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggregate real-time telemetry metrics for the Executive Command Center dashboard."""
    # 1. Fetch latest pre-calculated city-wide score
    city_score_query = (
        select(ReadinessSnapshot.score)
        .where(
            and_(
                ReadinessSnapshot.operational_cycle_id == operational_cycle_id,
                ReadinessSnapshot.entity_type == "CITY"
            )
        )
        .order_by(ReadinessSnapshot.calculated_at.desc())
        .limit(1)
    )
    city_score_res = await db.execute(city_score_query)
    overall_readiness = city_score_res.scalar() or 0.0

    # 2. Total and ready shelters
    shelter_cnt_query = select(func.count(Shelter.id)).where(Shelter.deleted_at == None)
    shelter_cnt_res = await db.execute(shelter_cnt_query)
    total_shelters = shelter_cnt_res.scalar() or 0

    ready_shelter_query = (
        select(func.count(ReadinessSnapshot.id))
        .where(
            and_(
                ReadinessSnapshot.operational_cycle_id == operational_cycle_id,
                ReadinessSnapshot.entity_type == "SHELTER",
                ReadinessSnapshot.score >= 90.0
            )
        )
    )
    ready_shelter_res = await db.execute(ready_shelter_query)
    ready_shelters = ready_shelter_res.scalar() or 0

    # 3. Active critical alerts
    alert_query = select(func.count(SystemAlert.id)).where(
        and_(SystemAlert.status != "RESOLVED", SystemAlert.severity == "CRITICAL")
    )
    alert_res = await db.execute(alert_query)
    active_alerts = alert_res.scalar() or 0

    # 4. Total and functional assets
    asset_cnt_query = select(func.count(Asset.id)).where(Asset.deleted_at == None)
    asset_cnt_res = await db.execute(asset_cnt_query)
    total_assets = asset_cnt_res.scalar() or 0

    functional_asset_query = select(func.count(Asset.id)).where(
        and_(Asset.deleted_at == None, Asset.status == "FUNCTIONAL")
    )
    functional_asset_res = await db.execute(functional_asset_query)
    functional_assets = functional_asset_res.scalar() or 0
    functional_pct = (functional_assets / total_assets * 100.0) if total_assets > 0 else 100.0

    # 5. Pending submissions
    pending_query = select(func.count(ChecklistSubmission.id)).where(
        and_(ChecklistSubmission.status == "PENDING", ChecklistSubmission.deleted_at == None)
    )
    pending_res = await db.execute(pending_query)
    pending_submissions = pending_res.scalar() or 0

    # 6. Recent activity stream
    activity_query = select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(10)
    activity_res = await db.execute(activity_query)
    activities = activity_res.scalars().all()
    
    activity_stream = []
    for act in activities:
        activity_stream.append({
            "id": str(act.id),
            "description": act.action_description,
            "timestamp": act.created_at.isoformat(),
            "ip_address": act.ip_address
        })

    return DashboardStatsResponse(
        overall_readiness=float(overall_readiness),
        total_shelters=total_shelters,
        ready_shelters=ready_shelters,
        active_critical_alerts=active_alerts,
        total_assets=total_assets,
        functional_asset_pct=round(functional_pct, 2),
        pending_submissions=pending_submissions,
        recent_activity=activity_stream
    )
