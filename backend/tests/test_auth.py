import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import hash_password, verify_password
from app.infrastructure.db.models import User

@pytest.mark.asyncio
async def test_password_hashing():
    raw_pass = "secure_test_password_123"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("wrong_password", hashed) is False

@pytest.mark.asyncio
async def test_user_authentication_flow(client: AsyncClient, db_session: AsyncSession):
    # 1. Insert test user directly into test DB
    test_user = User(
        full_name="Test Field Officer",
        email="test_field@gvmc.gov.in",
        phone="9876543210",
        password_hash=hash_password("field_pass_123"),
        role="FIELD_OFFICER",
        status="ACTIVE"
    )
    db_session.add(test_user)
    await db_session.commit()

    # 2. Attempt login
    login_payload = {
        "email": "test_field@gvmc.gov.in",
        "password": "field_pass_123"
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["role"] == "FIELD_OFFICER"

    # 3. Access authenticated endpoint
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    me_response = await client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "test_field@gvmc.gov.in"

    # 4. Attempt login with bad credentials
    bad_payload = {
        "email": "test_field@gvmc.gov.in",
        "password": "wrong_password"
    }
    bad_res = await client.post("/api/v1/auth/login", json=bad_payload)
    assert bad_res.status_code == 401
