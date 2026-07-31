import sys
import types
from unittest.mock import MagicMock
from sqlalchemy import Text

# Mock geoalchemy2 classes to compile to plain TEXT in SQLite tests
class MockGeometry(Text):
    def __init__(self, *args, **kwargs):
        super().__init__()

# Setup mock module objects in sys.modules before any imports of Base or main
geo_mock = types.ModuleType("geoalchemy2")
geo_mock.Geometry = MockGeometry

from shapely.wkt import loads

shape_mock = types.ModuleType("geoalchemy2.shape")
shape_mock.from_shape = lambda shape, srid=4326: shape.wkt if hasattr(shape, "wkt") else str(shape)
shape_mock.to_shape = lambda element: loads(element) if isinstance(element, str) else element

functions_mock = types.ModuleType("geoalchemy2.functions")
functions_mock.ST_Distance = lambda *args, **kwargs: 0.0
functions_mock.ST_GeomFromText = lambda *args, **kwargs: args[0]

sys.modules["geoalchemy2"] = geo_mock
sys.modules["geoalchemy2.shape"] = shape_mock
sys.modules["geoalchemy2.functions"] = functions_mock
sys.modules["geoalchemy2.admin"] = MagicMock()
sys.modules["geoalchemy2.types"] = MagicMock()

import asyncio
import pytest
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.database import Base, get_db
from app.main import app
from httpx import AsyncClient, ASGITransport

# In-memory SQLite for rapid unit/integration tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

from sqlalchemy.pool import StaticPool

engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

@pytest.fixture(scope="function", autouse=True)
async def init_db():
    async with engine.begin() as conn:
        # Load spatial extension mock if SQLite lacks full GEOS (SQLite tests skip geometry computations)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        try:
            yield session
            await session.rollback() # Rollback transactions to ensure test isolation
        finally:
            await session.close()

@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    # Override FastAPI dependency injection to target test database session
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
