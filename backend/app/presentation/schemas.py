from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional, Any, Dict
from datetime import datetime
import uuid

# --- Generic & Common Schemas ---
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str

class TokenPayload(BaseModel):
    sub: str
    role: str
    type: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class GeoPoint(BaseModel):
    latitude: float
    longitude: float

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: Optional[str] = None
    order: Optional[str] = Field(default="asc", pattern="^(asc|desc)$")
    search: Optional[str] = None


# --- User Schemas ---
class UserBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=15)
    role: str = Field(pattern="^(ADMIN|COMMISSIONER|ZONE_OFFICER|FIELD_OFFICER)$")
    status: str = Field(default="ACTIVE", pattern="^(ACTIVE|INACTIVE|SUSPENDED)$")
    zone_id: Optional[uuid.UUID] = None
    ward_id: Optional[uuid.UUID] = None

    @field_validator("phone")
    def validate_phone(cls, v: str) -> str:
        # Simplistic Indian mobile number check or generic digits check
        digits = "".join(filter(str.isdigit, v))
        if len(digits) < 10 or len(digits) > 12:
            raise ValueError("Phone number must contain between 10 and 12 digits")
        return v

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    zone_id: Optional[uuid.UUID] = None
    ward_id: Optional[uuid.UUID] = None

class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Hierarchical Location Schemas ---
class ZoneResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    created_at: datetime

    class Config:
        from_attributes = True

class WardResponse(BaseModel):
    id: uuid.UUID
    zone_id: uuid.UUID
    number: int
    name: str
    boundary: Optional[List[List[float]]] = None  # Decoded polygon vertices
    created_at: datetime

    class Config:
        from_attributes = True


# --- Shelter Schemas ---
class ShelterBase(BaseModel):
    name: str
    address: str
    capacity: int = Field(gt=0)
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None

class ShelterCreate(ShelterBase):
    ward_id: uuid.UUID
    latitude: float
    longitude: float

class ShelterResponse(ShelterBase):
    id: uuid.UUID
    ward_id: uuid.UUID
    latitude: float
    longitude: float
    created_at: datetime

    class Config:
        from_attributes = True


# --- Asset Schemas ---
class AssetCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class AssetCreate(BaseModel):
    category_id: uuid.UUID
    ward_id: uuid.UUID
    shelter_id: Optional[uuid.UUID] = None
    name: str
    serial_number: str
    status: str = Field(default="FUNCTIONAL", pattern="^(FUNCTIONAL|NON_FUNCTIONAL|STAGED|DISPATCHED)$")
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class AssetResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    ward_id: uuid.UUID
    shelter_id: Optional[uuid.UUID] = None
    name: str
    serial_number: str
    status: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Checklist Template & Questions ---
class ChecklistQuestionResponse(BaseModel):
    id: uuid.UUID
    question_text: str
    weight: int
    requires_photo: bool
    is_critical: bool
    sort_order: int

    class Config:
        from_attributes = True

class ChecklistSectionResponse(BaseModel):
    id: uuid.UUID
    title: str
    sort_order: int
    questions: List[ChecklistQuestionResponse]

    class Config:
        from_attributes = True

class ChecklistTemplateResponse(BaseModel):
    id: uuid.UUID
    disaster_type_id: uuid.UUID
    title: str
    version: int
    sections: List[ChecklistSectionResponse]

    class Config:
        from_attributes = True


# --- Submissions & Answers ---
class ChecklistResponseCreate(BaseModel):
    question_id: uuid.UUID
    response_value: str = Field(pattern="^(YES|NO|NOT_APPLICABLE)$")
    remarks: Optional[str] = None

class ChecklistSubmissionCreate(BaseModel):
    operational_cycle_id: uuid.UUID
    shelter_id: Optional[uuid.UUID] = None
    asset_id: Optional[uuid.UUID] = None
    responses: List[ChecklistResponseCreate]
    latitude: float
    longitude: float

class ChecklistResponseDetail(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    response_value: str
    remarks: Optional[str] = None
    photo_url: Optional[str] = None

    class Config:
        from_attributes = True

class ChecklistSubmissionResponse(BaseModel):
    id: uuid.UUID
    operational_cycle_id: uuid.UUID
    user_id: uuid.UUID
    shelter_id: Optional[uuid.UUID] = None
    asset_id: Optional[uuid.UUID] = None
    status: str
    submitted_at: datetime
    reviewed_by: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None
    rejection_remarks: Optional[str] = None
    responses: List[ChecklistResponseDetail] = []

    class Config:
        from_attributes = True


# --- Alerts & Notifications ---
class SystemAlertResponse(BaseModel):
    id: uuid.UUID
    submission_id: uuid.UUID
    question_id: uuid.UUID
    severity: str
    status: str
    assigned_to: Optional[uuid.UUID] = None
    resolved_by: Optional[uuid.UUID] = None
    escalation_level: int
    resolution_remarks: Optional[str] = None
    triggered_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SystemAlertUpdate(BaseModel):
    status: str = Field(pattern="^(ACTIVE|ACKNOWLEDGED|RESOLVED)$")
    assigned_to: Optional[uuid.UUID] = None
    resolution_remarks: Optional[str] = None


# --- Dashboard Schemas ---
class ReadinessScoreResponse(BaseModel):
    entity_type: str
    entity_id: uuid.UUID
    score: float
    breakdown: Dict[str, Any]
    calculated_at: datetime

    class Config:
        from_attributes = True

class DashboardStatsResponse(BaseModel):
    overall_readiness: float
    total_shelters: int
    ready_shelters: int
    active_critical_alerts: int
    total_assets: int
    functional_asset_pct: float
    pending_submissions: int
    recent_activity: List[Dict[str, Any]]
