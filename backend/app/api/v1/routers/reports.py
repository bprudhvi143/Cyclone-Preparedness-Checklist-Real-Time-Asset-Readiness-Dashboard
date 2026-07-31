import csv
import io
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.presentation.dependencies import get_current_user, require_roles
from app.infrastructure.db.models import (
    Zone, Ward, User, Asset, ChecklistSubmission, SystemAlert
)

router = APIRouter(prefix="/reports", tags=["Analytical Reporting"])

@router.get("/export")
async def export_report(
    report_type: str = Query(..., pattern="^(ZONE|WARD|OFFICER|ASSET|CHECKLIST|ALERT)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "COMMISSIONER"]))
):
    """
    Generate CSV reports for emergency audit reviews.
    Supports exports for Zones, Wards, Officers, Assets, Checklist submissions, and Alerts.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "ZONE":
        writer.writerow(["Zone ID", "Zone Name", "Zone Code", "Created Date"])
        query = select(Zone).order_by(Zone.name)
        res = await db.execute(query)
        for z in res.scalars().all():
            writer.writerow([z.id, z.name, z.code, z.created_at.isoformat()])

    elif report_type == "WARD":
        writer.writerow(["Ward ID", "Ward Number", "Ward Name", "Zone ID", "Created Date"])
        query = select(Ward).order_by(Ward.number)
        res = await db.execute(query)
        for w in res.scalars().all():
            writer.writerow([w.id, w.number, w.name, w.zone_id, w.created_at.isoformat()])

    elif report_type == "OFFICER":
        writer.writerow(["User ID", "Full Name", "Email", "Phone", "Role", "Status", "Zone ID", "Ward ID"])
        query = select(User).where(User.deleted_at == None).order_by(User.role)
        res = await db.execute(query)
        for u in res.scalars().all():
            writer.writerow([u.id, u.full_name, u.email, u.phone, u.role, u.status, u.zone_id, u.ward_id])

    elif report_type == "ASSET":
        writer.writerow(["Asset ID", "Asset Name", "Serial Number", "Category ID", "Status", "Ward ID", "Shelter ID"])
        query = select(Asset).where(Asset.deleted_at == None).order_by(Asset.name)
        res = await db.execute(query)
        for a in res.scalars().all():
            writer.writerow([a.id, a.name, a.serial_number, a.category_id, a.status, a.ward_id, a.shelter_id])

    elif report_type == "CHECKLIST":
        writer.writerow(["Submission ID", "Cycle ID", "User ID", "Shelter ID", "Asset ID", "Status", "Submitted At"])
        query = select(ChecklistSubmission).where(ChecklistSubmission.deleted_at == None).order_by(ChecklistSubmission.submitted_at.desc())
        res = await db.execute(query)
        for s in res.scalars().all():
            writer.writerow([s.id, s.operational_cycle_id, s.user_id, s.shelter_id, s.asset_id, s.status, s.submitted_at.isoformat()])

    elif report_type == "ALERT":
        writer.writerow(["Alert ID", "Submission ID", "Question ID", "Severity", "Status", "Escalation Level", "Triggered At", "Resolved At"])
        query = select(SystemAlert).order_by(SystemAlert.triggered_at.desc())
        res = await db.execute(query)
        for al in res.scalars().all():
            writer.writerow([al.id, al.submission_id, al.question_id, al.severity, al.status, al.escalation_level, al.triggered_at.isoformat(), al.resolved_at.isoformat() if al.resolved_at else ""])

    # Stream file download response
    output.seek(0)
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={report_type.lower()}_report.csv"
    return response
