from fastapi import APIRouter, Depends, Request, status
from app.presentation.dependencies import get_auth_service, get_current_user, require_roles
from app.services.auth_service import AuthService
from app.presentation.schemas import LoginRequest, Token, UserResponse, UserCreate, RefreshRequest
from app.infrastructure.db.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login(
    payload: LoginRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service)
):
    ip_address = request.client.host if request.client else None
    return await auth_service.authenticate_user(payload, ip_address=ip_address)

@router.post("/refresh", response_model=Token)
async def refresh(
    payload: RefreshRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.refresh_access_token(payload.refresh_token)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
    admin_user: User = Depends(require_roles(["ADMIN"]))
):
    """Enables Administrators to register new accounts."""
    return await auth_service.create_user(payload)
