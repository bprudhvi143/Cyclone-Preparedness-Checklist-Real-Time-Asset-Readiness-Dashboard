from datetime import timedelta
import logging
from typing import Optional
from uuid import UUID
from fastapi import HTTPException
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.infrastructure.db.repositories.custom_repositories import UserRepository
from app.presentation.schemas import LoginRequest, Token, UserResponse, UserCreate
from app.infrastructure.db.models import ActivityLog
from app.exceptions.exceptions import AuthenticationError

logger = logging.getLogger("gvmc_api")

class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def authenticate_user(self, payload: LoginRequest, ip_address: Optional[str] = None) -> Token:
        """Validate user credentials and return signed access & refresh tokens."""
        user = await self.user_repo.get_by_email(payload.email)
        if not user or not verify_password(payload.password, user.password_hash):
            raise AuthenticationError("Invalid email or password")
        
        if user.status != "ACTIVE":
            raise AuthenticationError(f"User account is {user.status.lower()}")

        # Generate tokens
        access_token = create_access_token(subject=user.id, role=user.role)
        refresh_token = create_refresh_token(subject=user.id)

        # Log authentication event
        log = ActivityLog(
            user_id=user.id,
            action_description="Successful login session initiated",
            ip_address=ip_address
        )
        self.user_repo.db.add(log)
        await self.user_repo.db.flush()

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            role=user.role
        )

    async def refresh_access_token(self, refresh_token: str) -> Token:
        """Decode and validate refresh token, issuing a new set of tokens."""
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise AuthenticationError("Invalid token type")
            
            user_id_str = payload.get("sub")
            if not user_id_str:
                raise AuthenticationError("Subject claim missing")
                
            user = await self.user_repo.get_by_id(UUID(user_id_str))
            if not user or user.status != "ACTIVE":
                raise AuthenticationError("User is no longer active")
                
            # Create fresh tokens
            new_access_token = create_access_token(subject=user.id, role=user.role)
            new_refresh_token = create_refresh_token(subject=user.id)
            
            return Token(
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                role=user.role
            )
        except Exception as e:
            raise AuthenticationError("Token validation failed or expired")

    async def create_user(self, payload: UserCreate) -> UserResponse:
        """Create a new user with password hashing."""
        existing = await self.user_repo.get_by_email(payload.email)
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        hashed = hash_password(payload.password)
        user_data = payload.model_dump(exclude={"password"})
        user_data["password_hash"] = hashed
        
        user = await self.user_repo.create(user_data)
        return UserResponse.model_validate(user)
