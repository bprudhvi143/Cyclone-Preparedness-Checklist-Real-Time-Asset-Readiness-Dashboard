from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from app.infrastructure.db.repositories.base_repository import BaseRepository
from app.infrastructure.db.models import (
    User, Ward, Shelter, Asset, ChecklistSubmission, ChecklistTemplate, SystemAlert, ReadinessSnapshot, ChecklistResponse
)
from geoalchemy2.functions import ST_Distance, ST_GeomFromText

class UserRepository(BaseRepository[User]):
    def __init__(self, db):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        query = select(User).where(and_(User.email == email, User.deleted_at == None))
        result = await self.db.execute(query)
        return result.scalars().first()


class WardRepository(BaseRepository[Ward]):
    def __init__(self, db):
        super().__init__(Ward, db)


class ShelterRepository(BaseRepository[Shelter]):
    def __init__(self, db):
        super().__init__(Shelter, db)


class AssetRepository(BaseRepository[Asset]):
    def __init__(self, db):
        super().__init__(Asset, db)


class ChecklistSubmissionRepository(BaseRepository[ChecklistSubmission]):
    def __init__(self, db):
        super().__init__(ChecklistSubmission, db)

    async def get_with_responses(self, submission_id: UUID) -> Optional[ChecklistSubmission]:
        """Fetch submission complete with nested responses and photo metadata."""
        query = (
            select(ChecklistSubmission)
            .options(
                selectinload(ChecklistSubmission.responses)
                .selectinload(ChecklistResponse.photo)
            )
            .where(and_(ChecklistSubmission.id == submission_id, ChecklistSubmission.deleted_at == None))
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_pending_reviews(self, zone_id: Optional[UUID] = None) -> List[ChecklistSubmission]:
        """Fetch all submissions pending review, optionally filtered by zone for Zone Officers."""
        query = (
            select(ChecklistSubmission)
            .options(selectinload(ChecklistSubmission.responses))
            .where(and_(ChecklistSubmission.status == "PENDING", ChecklistSubmission.deleted_at == None))
        )
        
        if zone_id:
            # Filter by joining ward
            query = query.join(Shelter, isouter=True).join(Asset, isouter=True)
            query = query.join(Ward, or_(Shelter.ward_id == Ward.id, Asset.ward_id == Ward.id))
            query = query.where(Ward.zone_id == zone_id)

        result = await self.db.execute(query.order_by(ChecklistSubmission.submitted_at.desc()))
        return list(result.scalars().all())


class SystemAlertRepository(BaseRepository[SystemAlert]):
    def __init__(self, db):
        super().__init__(SystemAlert, db)

    async def get_active_alerts(self, zone_id: Optional[UUID] = None) -> List[SystemAlert]:
        """Fetch all active alerts, joined with submission and question details."""
        query = (
            select(SystemAlert)
            .options(selectinload(SystemAlert.question), selectinload(SystemAlert.submission))
            .where(SystemAlert.status != "RESOLVED")
        )
        if zone_id:
            query = query.join(ChecklistSubmission)
            query = query.join(Shelter, isouter=True).join(Asset, isouter=True)
            query = query.join(Ward, or_(Shelter.ward_id == Ward.id, Asset.ward_id == Ward.id))
            query = query.where(Ward.zone_id == zone_id)

        result = await self.db.execute(query.order_by(SystemAlert.triggered_at.desc()))
        return list(result.scalars().all())


class ReadinessSnapshotRepository(BaseRepository[ReadinessSnapshot]):
    def __init__(self, db):
        super().__init__(ReadinessSnapshot, db)

    async def get_latest_snapshots(self, operational_cycle_id: UUID) -> List[ReadinessSnapshot]:
        """Get the latest pre-computed snapshots for all entities in a cycle."""
        # Query utilizing partitioning or latest calculated_at group by
        subq = (
            select(
                ReadinessSnapshot.entity_type,
                ReadinessSnapshot.entity_id,
                func.max(ReadinessSnapshot.calculated_at).label("max_calc")
            )
            .where(ReadinessSnapshot.operational_cycle_id == operational_cycle_id)
            .group_by(ReadinessSnapshot.entity_type, ReadinessSnapshot.entity_id)
            .subquery()
        )
        
        query = (
            select(ReadinessSnapshot)
            .join(
                subq,
                and_(
                    ReadinessSnapshot.entity_type == subq.c.entity_type,
                    ReadinessSnapshot.entity_id == subq.c.entity_id,
                    ReadinessSnapshot.calculated_at == subq.c.max_calc
                )
            )
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
