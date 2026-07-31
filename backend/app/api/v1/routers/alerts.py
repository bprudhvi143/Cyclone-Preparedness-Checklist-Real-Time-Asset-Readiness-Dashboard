from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.presentation.dependencies import get_alert_service, get_current_user, require_roles
from app.services.alert_service import AlertService
from app.presentation.schemas import SystemAlertResponse, SystemAlertUpdate
from app.infrastructure.db.models import User

router = APIRouter(prefix="/alerts", tags=["System Alerts"])

@router.get("", response_model=List[SystemAlertResponse])
async def get_alerts(
    zone_id: Optional[UUID] = None,
    alert_service: AlertService = Depends(get_alert_service),
    current_user: User = Depends(get_current_user)
):
    """Retrieve active warnings and critical alerts. Enforces zone limits for Zone Officers."""
    target_zone = zone_id
    if current_user.role == "ZONE_OFFICER":
        target_zone = current_user.zone_id
        
    alerts = await alert_service.alert_repo.get_active_alerts(zone_id=target_zone)
    return [SystemAlertResponse.model_validate(a) for a in alerts]

@router.post("/{id}/review", response_model=SystemAlertResponse)
async def review_alert(
    id: UUID,
    payload: SystemAlertUpdate,
    alert_service: AlertService = Depends(get_alert_service),
    current_user: User = Depends(require_roles(["ADMIN", "ZONE_OFFICER"]))
):
    """Acknowledge or resolve an active alert."""
    if payload.status == "RESOLVED":
        if not payload.resolution_remarks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resolution remarks are required to resolve an alert."
            )
        alert = await alert_service.resolve_alert(id, current_user.id, payload.resolution_remarks)
    else:
        # Simply update status / assignment
        alert = await alert_service.alert_repo.get_by_id(id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        alert.status = payload.status
        if payload.assigned_to:
            alert.assigned_to = payload.assigned_to
        alert_service.alert_repo.db.add(alert)
        await alert_service.alert_repo.db.flush()
        
    if not alert:
         raise HTTPException(status_code=404, detail="Alert not found")
         
    return SystemAlertResponse.model_validate(alert)
