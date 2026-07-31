from typing import Generic, TypeVar, Type, Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy import select, update, delete, desc, asc, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.db.models import SqlBase

ModelType = TypeVar("ModelType", bound=SqlBase)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: UUID) -> Optional[ModelType]:
        """Fetch a single record by UUID, checking soft-delete status if present."""
        query = select(self.model).where(self.model.id == id)
        if hasattr(self.model, "deleted_at"):
            query = query.where(self.model.deleted_at == None)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_all(
        self,
        page: int = 1,
        limit: int = 20,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: Optional[str] = None,
        order: str = "asc",
        search_field: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[ModelType]:
        """Query database with pagination, filtering, searching, and dynamic sorting."""
        query = select(self.model)

        # Enforce soft-deletion filtering
        if hasattr(self.model, "deleted_at"):
            query = query.where(self.model.deleted_at == None)

        # Apply basic column filters
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    query = query.where(getattr(self.model, field) == value)

        # Apply text search
        if search_field and search_query and hasattr(self.model, search_field):
            query = query.where(getattr(self.model, search_field).ilike(f"%{search_query}%"))

        # Apply sorting
        if sort_by and hasattr(self.model, sort_by):
            sort_col = getattr(self.model, sort_by)
            query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))
        else:
            query = query.order_by(desc(self.model.created_at))

        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count matching records."""
        query = select(func.count()).select_from(self.model)
        
        if hasattr(self.model, "deleted_at"):
            query = query.where(self.model.deleted_at == None)
            
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    query = query.where(getattr(self.model, field) == value)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def create(self, obj_in: Dict[str, Any]) -> ModelType:
        """Insert a new record."""
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        await self.db.flush()
        return db_obj

    async def update(self, db_obj: ModelType, obj_in: Dict[str, Any]) -> ModelType:
        """Update an existing record."""
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        self.db.add(db_obj)
        await self.db.flush()
        return db_obj

    async def delete(self, id: UUID, soft: bool = True) -> bool:
        """Delete a record, supporting soft delete."""
        db_obj = await self.get_by_id(id)
        if not db_obj:
            return False
            
        if soft and hasattr(db_obj, "deleted_at"):
            import datetime
            db_obj.deleted_at = datetime.datetime.utcnow()
            self.db.add(db_obj)
        else:
            await self.db.execute(delete(self.model).where(self.model.id == id))
        
        await self.db.flush()
        return True
