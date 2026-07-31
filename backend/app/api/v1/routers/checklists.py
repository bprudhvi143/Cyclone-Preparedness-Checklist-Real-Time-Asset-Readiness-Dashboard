import json
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Form, UploadFile, File, Request, status
from app.presentation.dependencies import get_checklist_service, get_current_user
from app.services.checklist_service import ChecklistService
from app.presentation.schemas import ChecklistTemplateResponse, ChecklistSubmissionResponse, ChecklistSubmissionCreate
from app.infrastructure.db.models import User
from app.exceptions.exceptions import ValidationError

router = APIRouter(prefix="/checklists", tags=["Checklists"])

@router.get("/templates/active", response_model=ChecklistTemplateResponse)
async def get_active_template(
    disaster_type_id: UUID,
    checklist_service: ChecklistService = Depends(get_checklist_service),
    current_user: User = Depends(get_current_user)
):
    """Fetch the active checklist template for a specific disaster type."""
    template = await checklist_service.get_active_template(disaster_type_id)
    return ChecklistTemplateResponse.model_validate(template)

@router.post("/submissions", response_model=ChecklistSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_checklist(
    request: Request,
    payload: str = Form(...),
    checklist_service: ChecklistService = Depends(get_checklist_service),
    current_user: User = Depends(get_current_user)
):
    """
    Submit a completed checklist. 
    Accepts multipart/form-data containing:
    - `payload`: A JSON string representing ChecklistSubmissionCreate
    - Multiple files: Form parameters named with the question UUID containing verification photos.
    """
    try:
        data = json.loads(payload)
        submission_payload = ChecklistSubmissionCreate(**data)
    except Exception as e:
        raise ValidationError(f"Invalid JSON payload: {str(e)}")

    # Extract all files from request form
    form = await request.form()
    uploaded_photos = {}
    
    for key, value in form.items():
        if isinstance(value, UploadFile):
            try:
                question_uuid = UUID(key)
                uploaded_photos[question_uuid] = value
            except ValueError:
                # Ignore non-UUID form keys (e.g. general files)
                pass

    submission = await checklist_service.create_submission(
        submission_payload,
        current_user.id,
        uploaded_photos
    )
    
    # Map back to response model
    # Convert points back to floats
    lat, lon = 0.0, 0.0
    if submission.submitted_gps is not None:
        from shapely import wkb
        geom = wkb.loads(bytes(submission.submitted_gps.data))
        lon, lat = geom.x, geom.y

    resp_details = []
    for r in submission.responses:
        photo_url = None
        if r.photo:
            photo_url = f"/api/v1/checklists/photos/{r.photo.id}"
        resp_details.append({
            "id": r.id,
            "question_id": r.question_id,
            "response_value": r.response_value,
            "remarks": r.remarks,
            "photo_url": photo_url
        })

    return ChecklistSubmissionResponse(
        id=submission.id,
        operational_cycle_id=submission.operational_cycle_id,
        user_id=submission.user_id,
        shelter_id=submission.shelter_id,
        asset_id=submission.asset_id,
        status=submission.status,
        submitted_at=submission.submitted_at,
        reviewed_by=submission.reviewed_by,
        reviewed_at=submission.reviewed_at,
        rejection_remarks=submission.rejection_remarks,
        responses=resp_details
    )
