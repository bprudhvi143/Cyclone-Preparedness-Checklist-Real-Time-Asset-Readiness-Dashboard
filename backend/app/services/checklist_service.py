import os
import uuid
import datetime
from typing import Optional, List, Dict, Any
from fastapi import UploadFile, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.core.config import settings
from app.infrastructure.db.models import (
    ChecklistTemplate, ChecklistSubmission, ChecklistResponse, PhotoMetadata,
    Shelter, Asset, ChecklistQuestion
)
from app.infrastructure.db.repositories.custom_repositories import ChecklistSubmissionRepository
from app.presentation.schemas import ChecklistSubmissionCreate, ChecklistSubmissionResponse
from app.exceptions.exceptions import NotFoundError, ValidationError, ConflictError
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

class ChecklistService:
    def __init__(self, submission_repo: ChecklistSubmissionRepository, alert_service=None):
        self.submission_repo = submission_repo
        self.alert_service = alert_service

        # Initialize upload directory
        if not os.path.exists(settings.UPLOAD_DIR):
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    async def get_active_template(self, disaster_type_id: uuid.UUID) -> ChecklistTemplate:
        """Fetch the active template including sections and questions sorted by sort_order."""
        db = self.submission_repo.db
        query = (
            select(ChecklistTemplate)
            .options(
                selectinload(ChecklistTemplate.sections)
                .selectinload(ChecklistSection.questions)
            )
            .where(
                and_(
                    ChecklistTemplate.disaster_type_id == disaster_type_id,
                    ChecklistTemplate.is_active == True,
                    ChecklistTemplate.deleted_at == None
                )
            )
        )
        result = await db.execute(query)
        template = result.scalars().first()
        if not template:
            raise NotFoundError("No active checklist template exists for this disaster type")
        
        # Sort internal lists to guarantee layout order
        template.sections.sort(key=lambda s: s.sort_order)
        for s in template.sections:
            s.questions.sort(key=lambda q: q.sort_order)
            
        return template

    async def create_submission(
        self,
        payload: ChecklistSubmissionCreate,
        user_id: uuid.UUID,
        uploaded_photos: Dict[uuid.UUID, UploadFile]
    ) -> ChecklistSubmission:
        """Process a new checklist submission, saving photos and triggering alerts."""
        db = self.submission_repo.db

        if not payload.shelter_id and not payload.asset_id:
            raise ValidationError("A submission must target either a shelter or an asset.")
        if payload.shelter_id and payload.asset_id:
            raise ValidationError("A submission cannot target both a shelter and an asset.")

        # Check for duplicate submissions in the cycle
        dup_filter = {"operational_cycle_id": payload.operational_cycle_id}
        if payload.shelter_id:
            dup_filter["shelter_id"] = payload.shelter_id
            target_entity = await db.get(Shelter, payload.shelter_id)
        else:
            dup_filter["asset_id"] = payload.asset_id
            target_entity = await db.get(Asset, payload.asset_id)

        if not target_entity:
            raise NotFoundError("Target shelter or asset not found")

        existing_count = await self.submission_repo.count(dup_filter)
        if existing_count > 0:
            raise ConflictError("A checklist has already been submitted for this resource in this cycle.")

        # Construct spatial coordinates
        gps_point = from_shape(Point(payload.longitude, payload.latitude), srid=4326)

        # 1. Create main ChecklistSubmission
        submission = ChecklistSubmission(
            operational_cycle_id=payload.operational_cycle_id,
            user_id=user_id,
            shelter_id=payload.shelter_id,
            asset_id=payload.asset_id,
            status="PENDING",
            submitted_gps=gps_point,
            submitted_at=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(submission)
        await db.flush()

        # 2. Add Responses
        for resp in payload.responses:
            question = await db.get(ChecklistQuestion, resp.question_id)
            if not question:
                raise NotFoundError(f"Question with ID {resp.question_id} not found")

            # Check if photo is required and verify attachment is provided
            if question.requires_photo and resp.question_id not in uploaded_photos:
                raise ValidationError(f"Question '{question.question_text}' requires photo verification.")

            response_obj = ChecklistResponse(
                submission_id=submission.id,
                question_id=resp.question_id,
                response_value=resp.response_value,
                remarks=resp.remarks
            )
            db.add(response_obj)
            await db.flush()

            # Handle photo saving if provided
            if resp.question_id in uploaded_photos:
                file = uploaded_photos[resp.question_id]
                photo_meta = await self._save_photo(file, response_obj.id, user_id, gps_point)
                db.add(photo_meta)
                await db.flush()

            # Trigger alert if critical question fails (Response = 'NO')
            if question.is_critical and resp.response_value == "NO" and self.alert_service:
                await self.alert_service.trigger_alert(submission.id, question.id)

        await db.commit()
        
        # Load fully populated object
        return await self.submission_repo.get_with_responses(submission.id)

    async def _save_photo(
        self,
        file: UploadFile,
        response_id: uuid.UUID,
        user_id: uuid.UUID,
        gps_location
    ) -> PhotoMetadata:
        """Validate, compress, and save photo file to local storage, returning metadata."""
        # Validate format
        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
        if ext not in [".jpg", ".jpeg", ".png"]:
            raise ValidationError("Only JPEG and PNG images are allowed.")

        # Read and check size limit (5MB)
        content = await file.read()
        if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise ValidationError(f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE_MB}MB.")

        # Unique filename using UUID
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)

        # Write to disk
        with open(filepath, "wb") as f:
            f.write(content)

        return PhotoMetadata(
            response_id=response_id,
            file_path=filepath,
            file_size_bytes=len(content),
            mime_type=file.content_type or "image/jpeg",
            uploaded_by=user_id,
            gps_location=gps_location,
            device_timestamp=datetime.datetime.now(datetime.timezone.utc)
        )
