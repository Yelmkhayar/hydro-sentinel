from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("/test/geo-stations")
async def test_geo_stations(db: AsyncSession = Depends(get_db)):
    """Test endpoint to verify geo.station table access"""
    try:
        result = await db.execute(text("SELECT * FROM geo.station LIMIT 5"))
        rows = result.mappings().all()
        return {
            "status": "success",
            "message": f"Found {len(rows)} stations in geo.station",
            "data": [dict(row) for row in rows]
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@router.get("/test/geo-basins")
async def test_geo_basins(db: AsyncSession = Depends(get_db)):
    """Test endpoint to verify geo.basin table access"""
    try:
        result = await db.execute(text("SELECT * FROM geo.basin LIMIT 5"))
        rows = result.mappings().all()
        return {
            "status": "success",
            "message": f"Found {len(rows)} basins in geo.basin",
            "data": [dict(row) for row in rows]
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
