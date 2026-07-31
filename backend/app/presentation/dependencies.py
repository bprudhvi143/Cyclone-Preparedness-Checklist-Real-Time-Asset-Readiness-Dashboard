from typing import List, Callable
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import decode_token
from app.infrastructure.db.models import User
from app.infrastructure.db.repositories.custom_repositories import UserRepository, ChecklistSubmissionRepository, SystemAlertRepository, ReadinessSnapshotRepository
from app.services.auth_service import AuthService
from app.services.checklist_service import ChecklistService
from app.services.alert_service import AlertService
from app.services.scoring_service import ScoringService
from app.exceptions.exceptions import AuthenticationError, PermissionDenied

security_bearer = HTTPBearer()

async def get_current_user(
    token: HTTPAuthorizationCredentials = Security(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> User:
    """FastAPI dependency to extract, decode and validate current authenticated user context."""
    try:
        payload = decode_token(token.credentials)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "access":
            raise AuthenticationError("Invalid access token structure")
    except Exception:
        raise AuthenticationError("Invalid or expired authentication credentials")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise AuthenticationError("Authenticated user record not found")
    if user.status != "ACTIVE":
        raise AuthenticationError("User account is inactive")
        
    return user


def require_roles(allowed_roles: List[str]) -> Callable:
    """Dependency factory enforcing role boundaries on routes."""
    def role_dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise PermissionDenied("You do not have access permissions for this action.")
        return current_user
    return role_dependency


# --- Service Injectors ---
def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(db))

def get_alert_service(db: AsyncSession = Depends(get_db)) -> AlertService:
    return AlertService(SystemAlertRepository(db))

def get_checklist_service(
    db: AsyncSession = Depends(get_db),
    alert_service: AlertService = Depends(get_alert_service)
) -> ChecklistService:
    return ChecklistService(ChecklistSubmissionRepository(db), alert_service)

def get_scoring_service(db: AsyncSession = Depends(get_db)) -> ScoringService:
    return ScoringService(ReadinessSnapshotRepository(db))
