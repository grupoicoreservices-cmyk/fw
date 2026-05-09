from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

_db: Optional[AsyncIOMotorDatabase] = None


def set_db(db: AsyncIOMotorDatabase) -> None:
    global _db
    _db = db


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError('Database is not initialized')
    return _db
