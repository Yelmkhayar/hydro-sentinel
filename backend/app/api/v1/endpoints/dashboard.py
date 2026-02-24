from typing import List, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.api import deps
from app.db.session import get_db
from app.models.view_models import MapKPIView, TopCriticalView
from app.schemas.measurement import MapKPIItem, TopCriticalItem

router = APIRouter()

@router.get("/map/points-kpi", response_model=List[MapKPIItem])
async def read_map_points_kpi(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get all stations with KPI for map display (api.v_map_points_kpi).
    """
    # Using raw SQL to ensure correct column mapping and geometry extraction
    from sqlalchemy import text
    import json
    
    query = text("""
        SELECT 
            v.station_id,
            v.station_name,
            s.station_type,
            ST_AsGeoJSON(s.geom) as geometry,
            v.severity,
            v.score,
            v.precip_obs_mm,
            v.debit_obs_m3s,
            v.debit_sim_m3s,
            v.lacher_m3s_latest,
            v.volume_hm3_latest,
            v.volume_sim_hm3,
            v.precip_cum_24h_mm
        FROM api.v_map_points_kpi v
        JOIN geo.station s ON s.station_id = v.station_id
    """)
    
    result = await db.execute(query)
    rows = result.fetchall()
    
    items = []
    for row in rows:
        lat = None
        lon = None
        geo = None
        
        if row.geometry:
            try:
                # If it's already a dict (AsyncPG native JSON decoding)
                if isinstance(row.geometry, dict):
                    geo = row.geometry
                # If it's a string (Text column or JSON string)
                elif isinstance(row.geometry, str):
                    # Check if it looks like GeoJSON
                    if row.geometry.strip().startswith('{'):
                        geo = json.loads(row.geometry)
                    else:
                        # Might be a WKB/WKT string? (not handled here, but logging it)
                        print(f"DEBUG: Found non-JSON geometry string for station {row.station_id}: {row.geometry[:50]}...")
                    
                if isinstance(geo, dict):
                    # Check for Point geometry
                    if geo.get("type") == "Point":
                        coords = geo.get("coordinates")
                        if coords and isinstance(coords, list) and len(coords) >= 2:
                            lon = float(coords[0])
                            lat = float(coords[1])
                    # Also check for direct coords if not standard GeoJSON
                    elif "coordinates" in geo:
                        coords = geo["coordinates"]
                        if coords and isinstance(coords, list) and len(coords) >= 2:
                            lon = float(coords[0])
                            lat = float(coords[1])
                            
            except Exception as e:
                print(f"DEBUG: Error parsing geometry for station {row.station_id}: {e}")
                pass
                
        items.append(MapKPIItem(
            station_id=row.station_id,
            station_name=row.station_name,
            station_type=row.station_type,
            severity=row.severity,
            score=row.score,
            lat=lat,
            lon=lon,
            precip_obs_mm=row.precip_obs_mm,
            debit_obs_m3s=row.debit_obs_m3s,
            debit_sim_m3s=row.debit_sim_m3s,
            lacher_m3s_latest=row.lacher_m3s_latest,
            volume_hm3_latest=row.volume_hm3_latest,
            volume_sim_hm3=row.volume_sim_hm3,
            precip_cum_24h_mm=row.precip_cum_24h_mm
        ))
        
    return items

@router.get("/dashboard/top-critical", response_model=List[TopCriticalItem])
async def read_top_critical(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get top critical stations sorted by score (api.v_top_critical_24h).
    """
    from sqlalchemy import text
    
    query = text("""
        SELECT 
            station_id,
            station_name,
            basin_name,
            precip_cum_24h_mm,
            debit_max_24h_m3s,
            lacher_max_24h_m3s,
            severity,
            score
        FROM api.v_top_critical_24h
        ORDER BY score DESC
    """)
    
    result = await db.execute(query)
    rows = result.fetchall()
    
    return [
        TopCriticalItem(
            station_id=row.station_id,
            station_name=row.station_name,
            basin_name=row.basin_name,
            precip_cum_24h_mm=row.precip_cum_24h_mm,
            debit_max_24h_m3s=row.debit_max_24h_m3s,
            lacher_max_24h_m3s=row.lacher_max_24h_m3s,
            severity=row.severity,
            score=row.score
        )
        for row in rows
    ]
