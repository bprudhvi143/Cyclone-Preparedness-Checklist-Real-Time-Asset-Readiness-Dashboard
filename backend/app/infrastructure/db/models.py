import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, Numeric, Table, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase
from geoalchemy2 import Geometry
from app.core.database import Base

class SqlBase(Base):
    __abstract__ = True
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class DisasterType(SqlBase):
    __tablename__ = "disaster_types"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    templates: Mapped[List["ChecklistTemplate"]] = relationship(back_populates="disaster_type")
    cycles: Mapped[List["OperationalCycle"]] = relationship(back_populates="disaster_type")


class Zone(SqlBase):
    __tablename__ = "zones"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)

    wards: Mapped[List["Ward"]] = relationship(back_populates="zone")
    users: Mapped[List["User"]] = relationship(back_populates="zone")


class Ward(SqlBase):
    __tablename__ = "wards"

    zone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("zones.id"), nullable=False)
    number: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    boundary = mapped_column(Geometry("POLYGON", srid=4326), nullable=True)

    zone: Mapped["Zone"] = relationship(back_populates="wards")
    shelters: Mapped[List["Shelter"]] = relationship(back_populates="ward")
    assets: Mapped[List["Asset"]] = relationship(back_populates="ward")
    users: Mapped[List["User"]] = relationship(back_populates="ward")


class User(SqlBase):
    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False)  # ADMIN, COMMISSIONER, ZONE_OFFICER, FIELD_OFFICER
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")  # ACTIVE, INACTIVE, SUSPENDED
    
    zone_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("zones.id"), nullable=True)
    ward_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("wards.id"), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    zone: Mapped[Optional["Zone"]] = relationship(back_populates="users")
    ward: Mapped[Optional["Ward"]] = relationship(back_populates="users")
    submissions: Mapped[List["ChecklistSubmission"]] = relationship(
        back_populates="submitter", foreign_keys="[ChecklistSubmission.user_id]"
    )


class Shelter(SqlBase):
    __tablename__ = "shelters"

    ward_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("wards.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    location = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    contact_person: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    ward: Mapped["Ward"] = relationship(back_populates="shelters")
    assets: Mapped[List["Asset"]] = relationship(back_populates="shelter")
    submissions: Mapped[List["ChecklistSubmission"]] = relationship(back_populates="shelter")


class AssetCategory(SqlBase):
    __tablename__ = "asset_categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)  # PUMP, GENSET, etc.
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    assets: Mapped[List["Asset"]] = relationship(back_populates="category")


class Asset(SqlBase):
    __tablename__ = "assets"

    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("asset_categories.id"), nullable=False)
    ward_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("wards.id"), nullable=False)
    shelter_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("shelters.id"), nullable=True)
    
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    serial_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="FUNCTIONAL")  # FUNCTIONAL, NON_FUNCTIONAL, STAGED, DISPATCHED
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    category: Mapped["AssetCategory"] = relationship(back_populates="assets")
    ward: Mapped["Ward"] = relationship(back_populates="assets")
    shelter: Mapped[Optional["Shelter"]] = relationship(back_populates="assets")
    submissions: Mapped[List["ChecklistSubmission"]] = relationship(back_populates="asset")


class OperationalCycle(SqlBase):
    __tablename__ = "operational_cycles"

    disaster_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("disaster_types.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")  # DRAFT, ACTIVE, COMPLETED
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    disaster_type: Mapped["DisasterType"] = relationship(back_populates="cycles")
    submissions: Mapped[List["ChecklistSubmission"]] = relationship(back_populates="cycle")


class ChecklistTemplate(SqlBase):
    __tablename__ = "checklist_templates"

    disaster_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("disaster_types.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    disaster_type: Mapped["DisasterType"] = relationship(back_populates="templates")
    sections: Mapped[List["ChecklistSection"]] = relationship(back_populates="template", cascade="all, delete-orphan")


class ChecklistSection(SqlBase):
    __tablename__ = "checklist_sections"

    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklist_templates.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    template: Mapped["ChecklistTemplate"] = relationship(back_populates="sections")
    questions: Mapped[List["ChecklistQuestion"]] = relationship(back_populates="section", cascade="all, delete-orphan")


class ChecklistQuestion(SqlBase):
    __tablename__ = "checklist_questions"

    section_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklist_sections.id"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    weight: Mapped[int] = mapped_column(Integer, default=1)  # 1 to 5
    requires_photo: Mapped[bool] = mapped_column(Boolean, default=False)
    is_critical: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    section: Mapped["ChecklistSection"] = relationship(back_populates="questions")
    responses: Mapped[List["ChecklistResponse"]] = relationship(back_populates="question")
    alerts: Mapped[List["SystemAlert"]] = relationship(back_populates="question")


class ChecklistSubmission(SqlBase):
    __tablename__ = "checklist_submissions"

    operational_cycle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("operational_cycles.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    shelter_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("shelters.id"), nullable=True)
    asset_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("assets.id"), nullable=True)
    
    status: Mapped[str] = mapped_column(String(30), default="PENDING")  # PENDING, APPROVED, REJECTED
    submitted_gps = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    cycle: Mapped["OperationalCycle"] = relationship(back_populates="submissions")
    submitter: Mapped["User"] = relationship(foreign_keys=[user_id], back_populates="submissions")
    reviewer: Mapped[Optional["User"]] = relationship(foreign_keys=[reviewed_by])
    shelter: Mapped[Optional["Shelter"]] = relationship(back_populates="submissions")
    asset: Mapped[Optional["Asset"]] = relationship(back_populates="submissions")
    responses: Mapped[List["ChecklistResponse"]] = relationship(back_populates="submission", cascade="all, delete-orphan")
    alerts: Mapped[List["SystemAlert"]] = relationship(back_populates="submission")


class ChecklistResponse(SqlBase):
    __tablename__ = "checklist_responses"

    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklist_submissions.id"), nullable=False)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklist_questions.id"), nullable=False)
    response_value: Mapped[str] = mapped_column(String(20))  # YES, NO, NOT_APPLICABLE
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    submission: Mapped["ChecklistSubmission"] = relationship(back_populates="responses")
    question: Mapped["ChecklistQuestion"] = relationship(back_populates="responses")
    photo: Mapped[Optional["PhotoMetadata"]] = relationship(back_populates="response", cascade="all, delete-orphan")


class PhotoMetadata(SqlBase):
    __tablename__ = "photo_metadata"

    response_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklist_responses.id"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(50), nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    gps_location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    device_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    response: Mapped["ChecklistResponse"] = relationship(back_populates="photo")


class SystemAlert(SqlBase):
    __tablename__ = "system_alerts"

    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklist_submissions.id"), nullable=False)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklist_questions.id"), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="WARNING")  # CRITICAL, WARNING
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")  # ACTIVE, ACKNOWLEDGED, RESOLVED
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    escalation_level: Mapped[int] = mapped_column(Integer, default=0)
    resolution_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    submission: Mapped["ChecklistSubmission"] = relationship(back_populates="alerts")
    question: Mapped["ChecklistQuestion"] = relationship(back_populates="alerts")
    assignee: Mapped[Optional["User"]] = relationship(foreign_keys=[assigned_to])
    resolver: Mapped[Optional["User"]] = relationship(foreign_keys=[resolved_by])


class Notification(SqlBase):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    alert_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("system_alerts.id"), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class AuditLog(SqlBase):
    __tablename__ = "audit_logs"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    record_id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    action: Mapped[str] = mapped_column(String(10), nullable=False)  # INSERT, UPDATE, DELETE
    old_values = mapped_column(JSON, nullable=True)
    new_values = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)


class ActivityLog(SqlBase):
    __tablename__ = "activity_logs"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action_description: Mapped[str] = mapped_column(Text, nullable=False)
    context_json = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)


class ScoringConfiguration(SqlBase):
    __tablename__ = "scoring_configurations"

    disaster_type_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("disaster_types.id"), nullable=False)
    section_weights = mapped_column(JSON, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class ReadinessSnapshot(SqlBase):
    __tablename__ = "readiness_snapshots"

    operational_cycle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("operational_cycles.id"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(20), nullable=False)  # CITY, ZONE, WARD, SHELTER
    entity_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    breakdown = mapped_column(JSON, nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
