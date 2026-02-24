from typing import List, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api import deps
from app.db.session import get_db
from app.models.view_models import TimeseriesView
from app.schemas.measurement import TimeseriesPoint

router = APIRouter()

@router.get("/timeseries", response_model=List[TimeseriesPoint])
async def read_timeseries(
    station_id: Optional[str] = None,
    variables: Optional[str] = None,  # Comma-separated variable codes
    variable_code: Optional[str] = None,  # Single variable (backward compat)
    source_code: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    entity_type: Optional[str] = "stations",
    db: AsyncSession = Depends(get_db),
    # current_user = Depends(deps.get_current_user)
) -> Any:
    """
    Retrieve timeseries data.
    Supports stations (api.v_timeseries_station) and basins (ts.basin_measurement).
    Supports multiple variables via 'variables' parameter (comma-separated).
    """
    from sqlalchemy import text
    
    # Build WHERE conditions
    conditions = []
    params = {}
    
    if station_id:
        if entity_type == "bassins":
            conditions.append("basin_id = :station_id")
        else:
            conditions.append("station_id = :station_id")
        params["station_id"] = station_id
    
    # Handle multiple variables
    if variables:
        var_list = [v.strip() for v in variables.split(',')]
        placeholders = ','.join([f":var{i}" for i in range(len(var_list))])
        conditions.append(f"variable_code IN ({placeholders})")
        for i, var in enumerate(var_list):
            params[f"var{i}"] = var
    elif variable_code:
        conditions.append("variable_code = :variable_code")
        params["variable_code"] = variable_code
    
    if source_code:
        conditions.append("source_code = :source_code")
        params["source_code"] = source_code
    
    if start:
        conditions.append("time >= :start")
        params["start"] = start
    
    if end:
        conditions.append("time <= :end")
        params["end"] = end
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    if entity_type == "bassins":
        query = text(f"""
            SELECT 
                b.basin_id as station_id,
                v.code as variable_code,
                s.code as source_code,
                m.time,
                m.value
            FROM ts.basin_measurement m
            JOIN geo.basin b ON m.basin_id = b.basin_id
            JOIN ref.variable v ON m.variable_id = v.variable_id
            JOIN ref.source s ON m.source_id = s.source_id
            WHERE {where_clause}
            ORDER BY m.time DESC
            LIMIT 1000
        """)
    else:
        query = text(f"""
            SELECT 
                station_id,
                variable_code,
                source_code,
                time,
                value
            FROM api.v_timeseries_station
            WHERE {where_clause}
            ORDER BY time DESC
            LIMIT 1000
        """)
    
    result = await db.execute(query, params)
    rows = result.fetchall()
    
    return [
        TimeseriesPoint(
            station_id=row[0],
            variable_code=row[1],
            source_code=row[2],
            time=row[3],
            value=row[4],
            unit=None  # unit not available in view
        )
        for row in rows
    ]

@router.get("/window/24h", response_model=List[TimeseriesPoint])
async def read_window_24h(
    station_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Retrieve optimized 24h window (mocking api.v_window_station_24h_fast).
    For prototype, we just query TimeseriesView with a 24h filter or similar logic.
    """
    # In real Prod, this would query a dedicated materialized view
    # Here we simulate by querying the standard view for last 24h
    now = datetime.now()
    start_24h = now - timedelta(hours=24)
    
    query = select(TimeseriesView).where(TimeseriesView.time >= start_24h)
    
    if station_id:
        query = query.where(TimeseriesView.station_id == station_id)
        
    result = await db.execute(query.limit(1000))
    return result.scalars().all()
@router.get("/compare")
async def get_compare(
    station_id: str,
    variable_code: Optional[str] = None,
    sources: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get timeseries data grouped by source for the comparison chart.
    """
    from sqlalchemy import text
    
    source_list = [s.strip() for s in sources.split(',')] if sources else ["OBS", "AROME"]
    
    # Build query
    source_placeholders = ','.join([f":source{i}" for i in range(len(source_list))])
    params = {"station_id": station_id, "variable": variable_code or "precip_mm"}
    for i, src in enumerate(source_list):
        params[f"source{i}"] = src
        
    query = text(f"""
        SELECT 
            source_code,
            time as t,
            value as y
        FROM api.v_timeseries_station
        WHERE station_id = :station_id 
          AND variable_code = :variable
          AND source_code IN ({source_placeholders})
        ORDER BY time ASC
    """)
    
    result = await db.execute(query, params)
    rows = result.fetchall()
    
    # Group by source
    grouped = {}
    for row in rows:
        source = row[0]  # source_code
        time_val = row[1]  # time as t
        y_val = row[2]  # value as y
        
        if source not in grouped:
            grouped[source] = []
        
        # Convert datetime to ISO format string
        time_str = time_val.isoformat() if hasattr(time_val, 'isoformat') else str(time_val)
        grouped[source].append({"t": time_str, "y": float(y_val) if y_val is not None else None})
        
    return {
        "station_id": station_id,
        "variable": variable_code,
        "sources": grouped
    }

@router.get("/runs")
async def get_runs(
    source_code: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get available runs for a source.
    """
    from sqlalchemy import text
    
    query_str = "SELECT DISTINCT run_time as id, run_time as label FROM api.v_timeseries_station"
    params = {}
    if source_code:
        query_str += " WHERE source_code = :source"
        params["source"] = source_code
    query_str += " ORDER BY run_time DESC LIMIT 50"
    
    result = await db.execute(text(query_str), params)
    rows = result.fetchall()
    
    return [
        {"id": str(row.id), "label": row.label.isoformat() if row.label else "N/A"}
        for row in rows if row.id
    ]
