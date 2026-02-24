from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.api import deps
from app.db.session import get_db

router = APIRouter()

@router.get("/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Health check endpoint to verify backend and database connection.
    """
    try:
        # Simple DB check
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
        
    return {
        "status": "ok",
        "data_mode": "db",
        "db_status": db_status,
        "backend_url": "http://localhost:8000", # Dynamic in real app
        "version": "1.0.0"
    }
