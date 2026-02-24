from typing import List, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.db.session import get_db
from app.models.view_models import StationView, BasinView
from app.schemas.site import Station, Basin

router = APIRouter()

@router.get("/stations", response_model=List[Station])
async def read_stations(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve stations (mapped to api.v_station).
    """
    # Using SQL for safer geometry handling and to map columns that don't match StationView exactly (like id vs station_id)
    # The view api.v_station does NOT have an 'id' column, it has 'station_id'.
    pass

    # Re-implementing with explicit SQL selection for coordinates to avoid WKB parsing issues in Python without GeoAlchemy2
    query = select(StationView).offset(skip).limit(limit)
    # Actually, we can't easily mix ORM and SQL functions in select(Model) if we want the Model objects.
    # But wait, we can just iterate and construct schemas.
    
    # Let's try to fetch as dicts with ST_AsGeoJSON using textual selection for simplicity and robustness
    from sqlalchemy import text
    query = text("""
        SELECT 
            station_id as id, 
            station_code as code, 
            station_name as name, 
            basin_id, 
            station_type as type, 
            is_active as active,
            -- Default EPSG:4326
            ST_X(geom) as lon, 
            ST_Y(geom) as lat
        FROM api.v_station
        LIMIT :limit OFFSET :skip
    """)
    result = await db.execute(query, {"limit": limit, "skip": skip})
    rows = result.fetchall()
    
    return [
        Station(
            id=row.id,
            code=row.code,
            name=row.name,
            basin_id=row.basin_id,
            type=row.type,
            active=row.active,
            lat=row.lat,
            lon=row.lon,
            last_update=None # Not invalidating schema
        )
        for row in rows
    ]

@router.get("/basins", response_model=List[Basin])
async def read_basins(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve basins (mapped to api.v_basin).
    """
    # Using SQL for safer geometry handling
    from sqlalchemy import text
    import json
    
    query = text("""
        SELECT 
            basin_id as id, 
            basin_code as code, 
            basin_name as name, 
            level, 
            parent_basin_id, 
            -- Default EPSG:4326
            ST_AsGeoJSON(geom) as geometry
        FROM api.v_basin
        LIMIT :limit OFFSET :skip
    """)
    result = await db.execute(query, {"limit": limit, "skip": skip})
    rows = result.fetchall()
    
    return [
        Basin(
            id=row.id,
            code=row.code,
            name=row.name,
            level=row.level,
            parent_basin_id=row.parent_basin_id,
            geometry=json.loads(row.geometry) if row.geometry else None
        )
        for row in rows
    ]
