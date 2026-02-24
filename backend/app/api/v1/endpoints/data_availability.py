from typing import List, Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.api import deps
from app.db.session import get_db

router = APIRouter()

@router.get("/data-availability")
async def scan_data_availability(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Scan all entities and variables to determine data availability.
    Returns a comprehensive report of what data exists in the database.
    """
    
    report = {
        "stations": {},
        "basins": {},
        "summary": {
            "total_stations": 0,
            "total_basins": 0,
            "total_variables": 0,
            "total_sources": 0,
            "total_records": 0
        }
    }
    
    # 1. Scanner les stations par type
    station_types_query = text("""
        SELECT 
            station_type,
            COUNT(DISTINCT station_id) as count
        FROM api.v_station
        GROUP BY station_type
        ORDER BY station_type
    """)
    
    result = await db.execute(station_types_query)
    station_types = result.fetchall()
    
    for row in station_types:
        station_type = row[0]
        count = row[1]
        report["stations"][station_type] = {
            "count": count,
            "variables": {}
        }
        report["summary"]["total_stations"] += count
    
    # 2. Scanner les variables disponibles par type de station
    variables_by_type_query = text("""
        SELECT 
            s.station_type,
            ts.variable_code,
            ts.source_code,
            COUNT(*) as record_count,
            MIN(ts.time) as first_record,
            MAX(ts.time) as last_record
        FROM api.v_timeseries_station ts
        JOIN api.v_station s ON s.station_id = ts.station_id
        GROUP BY s.station_type, ts.variable_code, ts.source_code
        ORDER BY s.station_type, ts.variable_code, ts.source_code
    """)
    
    result = await db.execute(variables_by_type_query)
    variables_data = result.fetchall()
    
    for row in variables_data:
        station_type = row[0]
        variable_code = row[1]
        source_code = row[2]
        record_count = row[3]
        first_record = row[4]
        last_record = row[5]
        
        if station_type not in report["stations"]:
            report["stations"][station_type] = {
                "count": 0,
                "variables": {}
            }
        
        if variable_code not in report["stations"][station_type]["variables"]:
            report["stations"][station_type]["variables"][variable_code] = {
                "sources": {}
            }
        
        report["stations"][station_type]["variables"][variable_code]["sources"][source_code] = {
            "record_count": record_count,
            "first_record": first_record.isoformat() if first_record else None,
            "last_record": last_record.isoformat() if last_record else None
        }
        
        report["summary"]["total_records"] += record_count
    
    # 3. Scanner les bassins
    basins_query = text("""
        SELECT 
            level,
            COUNT(DISTINCT basin_id) as count
        FROM api.v_basin
        GROUP BY level
        ORDER BY level
    """)
    
    result = await db.execute(basins_query)
    basin_levels = result.fetchall()
    
    for row in basin_levels:
        level = row[0]
        count = row[1]
        report["basins"][f"level_{level}"] = {
            "count": count,
            "variables": {}
        }
        report["summary"]["total_basins"] += count
    
    # 4. Compter les variables et sources uniques
    unique_vars_query = text("""
        SELECT 
            COUNT(DISTINCT variable_code) as var_count,
            COUNT(DISTINCT source_code) as source_count
        FROM api.v_timeseries_station
    """)
    
    result = await db.execute(unique_vars_query)
    counts = result.fetchone()
    report["summary"]["total_variables"] = counts[0]
    report["summary"]["total_sources"] = counts[1]
    
    # 5. Obtenir la liste des variables et sources disponibles
    vars_sources_query = text("""
        SELECT DISTINCT variable_code
        FROM api.v_timeseries_station
        ORDER BY variable_code
    """)
    result = await db.execute(vars_sources_query)
    report["summary"]["available_variables"] = [row[0] for row in result.fetchall()]
    
    sources_query = text("""
        SELECT DISTINCT source_code
        FROM api.v_timeseries_station
        ORDER BY source_code
    """)
    result = await db.execute(sources_query)
    report["summary"]["available_sources"] = [row[0] for row in result.fetchall()]
    
    return report

@router.get("/stations-with-data")
async def get_stations_with_data(
    variable_code: str = None,
    source_code: str = None,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get list of stations that have data for specific variable/source combination.
    """
    
    conditions = []
    params = {}
    
    if variable_code:
        conditions.append("variable_code = :variable_code")
        params["variable_code"] = variable_code
    
    if source_code:
        conditions.append("source_code = :source_code")
        params["source_code"] = source_code
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    query = text(f"""
        SELECT DISTINCT 
            s.station_id,
            s.station_code,
            s.station_name,
            s.station_type
        FROM api.v_timeseries_station ts
        JOIN api.v_station s ON s.station_id = ts.station_id
        WHERE {where_clause}
        ORDER BY s.station_name
    """)
    
    result = await db.execute(query, params)
    rows = result.fetchall()
    
    return [
        {
            "id": row[0],
            "code": row[1],
            "name": row[2],
            "type": row[3]
        }
        for row in rows
    ]
