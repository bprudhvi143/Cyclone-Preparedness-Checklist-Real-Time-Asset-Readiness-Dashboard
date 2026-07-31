import uuid
import datetime
import logging
from typing import List, Optional
from sqlalchemy import select, and_, update
from app.infrastructure.db.models import SystemAlert, Notification, User, ChecklistSubmission
from app.infrastructure.db.repositories.custom_repositories import SystemAlertRepository

logger = logging.getLogger("gvmc_api")

class AlertService:
    def __init__(self, alert_repo: SystemAlertRepository):
        self.alert_repo = alert_repo

    async def trigger_alert(self, submission_id: uuid.UUID, question_id: uuid.UUID) -> SystemAlert:
        """Create a system warning/critical alert and write notifications for assigned officers."""
        db = self.alert_repo.db
        
        # Insert alert record
        alert = SystemAlert(
            submission_id=submission_id,
            question_id=question_id,
            severity="CRITICAL",  # MVP critical checklist failures
            status="ACTIVE",
            escalation_level=0,
            triggered_at=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(alert)
        await db.flush()

        # Load submission details to determine zone officers
        submission = await db.get(ChecklistSubmission, submission_id)
        if submission:
            # Find Zone Officers associated with the submission's zone
            zone_id = None
            if submission.shelter:
                zone_id = submission.shelter.ward.zone_id
            elif submission.asset:
                zone_id = submission.asset.ward.zone_id

            if zone_id:
                officers_query = select(User).where(and_(User.zone_id == zone_id, User.role == "ZONE_OFFICER"))
                res = await db.execute(officers_query)
                officers = res.scalars().all()
                
                # Send notifications to all Zone Officers of that zone
                for officer in officers:
                    notification = Notification(
                        user_id=officer.id,
                        alert_id=alert.id,
                        message=f"Critical Alert: Preparation failure flagged in inspection.",
                        is_read=False,
                        sent_at=datetime.datetime.now(datetime.timezone.utc)
                    )
                    db.add(notification)

        await db.flush()
        return alert

    async def resolve_alert(
        self,
        alert_id: uuid.UUID,
        resolver_id: uuid.UUID,
        resolution_remarks: str
    ) -> Optional[SystemAlert]:
        """Acknowledge and close out an active alert with resolution logs."""
        alert = await self.alert_repo.get_by_id(alert_id)
        if not alert:
            return None
        
        alert.status = "RESOLVED"
        alert.resolved_by = resolver_id
        alert.resolution_remarks = resolution_remarks
        alert.resolved_at = datetime.datetime.now(datetime.timezone.utc)
        
        self.alert_repo.db.add(alert)
        await self.alert_repo.db.flush()
        return alert

    async def run_escalation_checks(self) -> int:
        """Background daemon function: escalate active alerts unresolved for over 4 hours."""
        db = self.alert_repo.db
        four_hours_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=4)
        
        # Query active alerts with level < 2 triggered more than 4 hours ago
        query = select(SystemAlert).where(
            and_(
                SystemAlert.status != "RESOLVED",
                SystemAlert.escalation_level < 2,
                SystemAlert.triggered_at <= four_hours_ago
            )
        )
        res = await db.execute(query)
        unresolved_alerts = res.scalars().all()
        
        escalated_count = 0
        for alert in unresolved_alerts:
            alert.escalation_level += 1
            self.alert_repo.db.add(alert)
            escalated_count += 1
            
            # Send notification to Commissioner for high escalations
            if alert.escalation_level == 2:
                commissioners_query = select(User).where(User.role == "COMMISSIONER")
                comm_res = await db.execute(commissioners_query)
                commissioners = comm_res.scalars().all()
                for comm in commissioners:
                    notification = Notification(
                        user_id=comm.id,
                        alert_id=alert.id,
                        message=f"ESCALATED ALERT: Shelter safety gap unresolved for > 4 hours.",
                        is_read=False,
                        sent_at=datetime.datetime.now(datetime.timezone.utc)
                    )
                    db.add(notification)

        await db.flush()
        return escalated_count
