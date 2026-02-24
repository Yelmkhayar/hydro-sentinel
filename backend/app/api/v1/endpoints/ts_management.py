
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID
import tempfile
import os
import shutil
import pandas as pd

router = APIRouter()

print("\n*** LOADING TS_MANAGEMENT v_FIX_INJECT_V2 ***\n")


@router.get("/timeseries/sources")
async def list_sources(
    db: AsyncSession = Depends(get_db)
):
    """Get list of available data sources"""
    try:
        query = text("SELECT code, label FROM ref.source ORDER BY source_id")
        result = await db.execute(query)
        rows = result.mappings().all()
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sources: {str(e)}")

def detect_header_row(file_path: str, filename: str) -> pd.DataFrame:
    """
    Smart detection of header row.
    Scans first 10 rows.
    Criteria:
    1. Contains timestamp-like keyword
    2. Length of keyword cell is short (matches exactly or close to it), avoiding description lines like "Format: timestamp..."
    3. Row has multiple non-null columns (avoids metadata rows with single cell)
    """
    if filename.lower().endswith('.csv'):
        return pd.read_csv(file_path)
    
    # Read first 10 rows without header to inspect
    df_preview = pd.read_excel(file_path, header=None, nrows=10)
    
    header_row_idx = 0
    found = False
    
    keywords = ['timestamp', 'time', 'date', 'datetime', 'horodatage', 'date/heure']
    
    for i, row in df_preview.iterrows():
        # Convert row to string check
        # Check density: count non-NaN items
        non_nan_count = row.count()
        if non_nan_count < 2:
            # Likely a title/metadata row
            continue

        row_str = " ".join([str(v).lower() for v in row.values])
        
        # Check for strict keyword match in the cells
        # We look for a cell that IS the keyword, not just contains it
        match_keyword = False
        for val in row.values:
            val_str = str(val).lower().strip()
            if val_str in keywords:
                match_keyword = True
                break
        
        # Fallback: if no strict match, check partial but ensure not long description
        if not match_keyword:
             for val in row.values:
                val_str = str(val).lower().strip()
                if any(k in val_str for k in keywords) and len(val_str) < 20: # arbitrary length limit
                     match_keyword = True
                     break

        if match_keyword:
            header_row_idx = i
            found = True
            break
            
    if found:
        print(f"DEBUG: Found header at row {header_row_idx}")
        return pd.read_excel(file_path, header=header_row_idx)
    else:
        print("DEBUG: No header keyword found, defaulting to row 0")
        return pd.read_excel(file_path, header=0)

@router.post("/timeseries/analyze")
async def analyze_timeseries_file(
    file: UploadFile = File(...),
    entity_type: str = Form("stations"),
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze file content before import.
    Returns details including data preview.
    """
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
            
        try:
            df = detect_header_row(tmp_path, file.filename)
            columns = [str(c).strip() for c in df.columns]
            
            # Detect timestamp
            ts_col = next((c for c in columns if c.lower() in ['timestamp', 'time', 'date', 'datetime', 'horodatage', 'date/heure']), None)
            
            # Get all entities
            if entity_type == "bassins":
                st_res = await db.execute(text("SELECT code, name, 'Bassin' as station_type FROM geo.basin"))
            else:
                st_res = await db.execute(text("SELECT code, name, station_type FROM geo.station"))
                
            entities_db = st_res.fetchall()
            entity_map = {e.code.lower(): e for e in entities_db}
            for e in entities_db:
                if e.name.lower() not in entity_map:
                    entity_map[e.name.lower()] = e

            found_entities = []
            unknown_columns = []
            
            # Statistics
            rows_count = len(df)
            start_date = None
            end_date = None
            preview_data = []
            
            if ts_col:
                # Basic timestamp parsing for stats
                df[ts_col] = pd.to_datetime(df[ts_col], errors='coerce')
                valid_df = df.dropna(subset=[ts_col])
                
                if not valid_df.empty:
                    start_date = str(valid_df[ts_col].min())
                    end_date = str(valid_df[ts_col].max())
                
                # Generate Preview (first 5 rows, convert NaNs to null for JSON)
                preview_df = df.head(5).fillna("").astype(str)
                preview_data = preview_df.to_dict(orient='records')
                
                for col in columns:
                    if col == ts_col or col.lower().startswith("unnamed"):
                        continue
                        
                    clean_col = col
                    if col.replace('.','',1).isdigit() and col.endswith('.0'):
                        clean_col = col.replace('.0', '')
                        
                    if clean_col.lower() in entity_map:
                        ent = entity_map[clean_col.lower()]
                        found_entities.append({
                            "column": col,
                            "matched_station": ent.name,
                            "station_code": ent.code,
                            "type": ent.station_type
                        })
                    else:
                        unknown_columns.append(col)
                        
                return {
                    "status": "success",
                    "filename": file.filename,
                    "rows_count": rows_count,
                    "time_column": ts_col,
                    "start_date": start_date,
                    "end_date": end_date,
                    "stations_found": len(found_entities),
                    "stations_details": found_entities,
                    "unknown_columns": unknown_columns,
                    "preview": preview_data,
                    "columns": columns
                }
            else:
                 return {
                    "status": "error",
                    "message": "Timestamp column not found"
                }

        finally:
            os.remove(tmp_path)
            
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")

@router.post("/timeseries/upload")
async def upload_timeseries(
    file: UploadFile = File(...),
    import_mode: str = Form("simple"),
    replace_existing: str = Form("false"),
    station_id: Optional[str] = Form(None),
    variable_code: Optional[str] = Form(None),
    source_code: str = Form("OBS"),
    entity_type: str = Form("stations"),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload time series data.
    - source_code: OBS, AROME, ECMWF (default: OBS)
    """
    try:
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        
        try:
            # Parse file
            # Parse file
            df = detect_header_row(tmp_path, file.filename)
            
            print(f"DEBUG: Dataframe Columns: {df.columns.tolist()}")
            print(f"DEBUG: Dataframe Head:\n{df.head()}")

            print(f"DEBUG: Dataframe Columns: {df.columns.tolist()}")
            print(f"DEBUG: Dataframe Head:\n{df.head()}")

            # Normalize columns
            df.columns = [str(c).strip() for c in df.columns]
            
            # Detect timestamp column
            ts_col = next((c for c in df.columns if c.lower() in ['timestamp', 'time', 'date', 'datetime', 'horodatage', 'date/heure']), None)
            if not ts_col:
                # Try first column
                ts_col = df.columns[0]
            
            # Parse timestamps
            df[ts_col] = pd.to_datetime(df[ts_col], errors='coerce')
            df = df.dropna(subset=[ts_col])
            
            if df.empty:
                 raise HTTPException(400, "File is empty or no valid timestamps found")

            # GET SOURCE ID
            src_res = await db.execute(text("SELECT source_id FROM ref.source WHERE code = :code"), {"code": source_code})
            src_row = src_res.first()
            if not src_row: raise HTTPException(404, f"Source {source_code} not found")
            source_id = src_row[0]

            # GET OR CREATE RUN
            # For OBS, we use a generic "Observations" run or create one
            # For Models, we might want a specific run, but for now map to a generic "Import" run or find latest.
            # We must set run_id_norm (NOT NULL).
            
            # Check for existing generic run for this source
            run_label = f"Import_{source_code}_{datetime.utcnow().strftime('%Y%m%d')}"
            run_res = await db.execute(text("SELECT run_id FROM ref.run WHERE label = :label"), {"label": run_label})
            run_row = run_res.first()
            if run_row:
                run_id = run_row[0]
            else:
                # Create new run
                run_id_res = await db.execute(text("""
                    INSERT INTO ref.run (label, source_id, run_time) 
                    VALUES (:label, :source_id, :run_time) 
                    RETURNING run_id
                """), {"label": run_label, "source_id": source_id, "run_time": datetime.utcnow()})
                run_id = run_id_res.first()[0]
                await db.commit() # Commit run creation immediately

            records_count = 0
            
            if import_mode == "simple":
                if not station_id or not variable_code:
                    raise HTTPException(status_code=400, detail="Station and Variable required for simple mode")
                
                # Expect value column
                val_col = next((c for c in df.columns if c != ts_col), None)
                if not val_col:
                    raise HTTPException(status_code=400, detail="No value column found")
                
                # Get var ID
                var_res = await db.execute(text("SELECT variable_id FROM ref.variable WHERE code = :code"), {"code": variable_code})
                var_row = var_res.first()
                if not var_row: raise HTTPException(404, f"Variable {variable_code} not found")
                var_id = var_row[0]
                
                values = []
                for _, row in df.iterrows():
                    val = pd.to_numeric(row[val_col], errors='coerce')
                    if pd.notna(val):
                        ts_val = row[ts_col]
                        if pd.isna(ts_val): continue
                        if ts_val.tzinfo is None:
                            ts_val = ts_val.tz_localize('UTC')
                        else:
                            ts_val = ts_val.tz_convert('UTC')

                        values.append({
                            "station_id": station_id,
                            "variable_id": var_id,
                            "time": ts_val,
                            "value": val,
                            "qc_flag": 0,
                            "source_id": source_id,
                            "run_id": run_id
                        })
                if replace_existing.lower() == 'true' and values:
                    min_ts = min(v['time'] for v in values)
                    max_ts = max(v['time'] for v in values)
                    if entity_type == "bassins":
                        await db.execute(text("""
                            DELETE FROM ts.basin_measurement 
                            WHERE basin_id = CAST(:sid AS UUID) AND variable_id = :vid AND source_id = :src AND time BETWEEN :min_ts AND :max_ts
                        """), {"sid": station_id, "vid": var_id, "src": source_id, "min_ts": min_ts, "max_ts": max_ts})
                    else:
                        await db.execute(text("""
                            DELETE FROM ts.measurement 
                            WHERE station_id = CAST(:sid AS UUID) AND variable_id = :vid AND source_id = :src AND time BETWEEN :min_ts AND :max_ts
                        """), {"sid": station_id, "vid": var_id, "src": source_id, "min_ts": min_ts, "max_ts": max_ts})

                for v in values:
                     if entity_type == "bassins":
                         await db.execute(text("""
                            INSERT INTO ts.basin_measurement (basin_id, variable_id, time, value, source_id, run_id)
                            VALUES (CAST(:station_id AS UUID), :variable_id, :time, :value, :source_id, :run_id)
                            ON CONFLICT (time, basin_id, variable_id, source_id, run_id) DO UPDATE SET value = EXCLUDED.value
                         """), {"station_id": v["station_id"], "variable_id": v["variable_id"], "time": v["time"], "value": v["value"], "source_id": v["source_id"], "run_id": v["run_id"]})
                     else:
                         await db.execute(text("""
                            INSERT INTO ts.measurement (station_id, variable_id, time, value, qc_flag, source_id, run_id)
                            VALUES (CAST(:station_id AS UUID), :variable_id, :time, :value, :qc_flag, :source_id, :run_id)
                            ON CONFLICT (time, station_id, variable_id, source_id, run_id_norm) DO UPDATE SET value = EXCLUDED.value
                         """), v)
                records_count = len(values)

            elif import_mode == "multi_station":
                if not variable_code: raise HTTPException(400, "Variable required for multi-station mode")
                
                # Check for Barrage constraint
                is_barrage_var = variable_code in ['lacher_m3s', 'volume_k', 'cote_m', 'lachers', 'volume']
                
                # Get var ID
                var_res = await db.execute(text("SELECT variable_id FROM ref.variable WHERE code = :code"), {"code": variable_code})
                var_row = var_res.first()
                if not var_row: raise HTTPException(404, f"Variable {variable_code} not found")
                var_id = var_row[0]
                
                # Cache entity IDs
                if entity_type == "bassins":
                    st_res = await db.execute(text("SELECT code, basin_id as id, 'Bassin' as type FROM geo.basin"))
                else:
                    st_res = await db.execute(text("SELECT code, station_id as id, station_type as type FROM geo.station"))
                entity_map = {row.code.lower(): {'id': str(row.id), 'type': row.type} for row in st_res}
                
                if entity_type == "bassins":
                    st_res = await db.execute(text("SELECT name, basin_id as id, 'Bassin' as type FROM geo.basin"))
                else:
                    st_res = await db.execute(text("SELECT name, station_id as id, station_type as type FROM geo.station"))
                for row in st_res:
                    if row.name.lower() not in entity_map:
                         entity_map[row.name.lower()] = {'id': str(row.id), 'type': row.type}

                for col in df.columns:
                    if col == ts_col: continue
                    
                    if col.lower().startswith('unnamed'):
                        continue

                    st_info = entity_map.get(col.lower())
                    if not st_info:
                        print(f"Warning: Entity '{col}' not found in DB (Case-insensitive check)")
                        continue
                    
                    st_id = st_info['id']
                    st_type = st_info['type']
                    
                    # Validate Barrage constraint
                    if entity_type == "stations" and is_barrage_var and "barrage" not in str(st_type).lower():
                        print(f"Skipping station {col} for variable {variable_code} (Not a Barrage)")
                        continue

                    values = []
                    for _, row in df.iterrows():
                        val = pd.to_numeric(row[col], errors='coerce')
                        if pd.notna(val):
                            ts_val = row[ts_col]
                            # Ensure timestamp is timezone-aware (UTC)
                            if pd.isna(ts_val): continue
                            if ts_val.tzinfo is None:
                                ts_val = ts_val.tz_localize('UTC')
                            else:
                                ts_val = ts_val.tz_convert('UTC')

                            values.append({
                                "station_id": st_id,
                                "variable_id": var_id,
                                "time": ts_val,
                                "value": val,
                                "qc_flag": 0,
                                "source_id": source_id,
                                "run_id": run_id
                            })
                    print(f"Station {col}: Found {len(values)} valid values to insert.")
                    
                    if replace_existing.lower() == 'true' and values:
                        min_ts = min(v['time'] for v in values)
                        max_ts = max(v['time'] for v in values)
                        
                        # Execute DELETE
                        if entity_type == "bassins":
                            await db.execute(text("""
                                DELETE FROM ts.basin_measurement 
                                WHERE basin_id = CAST(:sid AS UUID) AND variable_id = :vid AND source_id = :src AND time BETWEEN :min_ts AND :max_ts
                            """), {"sid": st_id, "vid": var_id, "src": source_id, "min_ts": min_ts, "max_ts": max_ts})
                        else:
                            await db.execute(text("""
                                DELETE FROM ts.measurement 
                                WHERE station_id = CAST(:sid AS UUID) AND variable_id = :vid AND source_id = :src AND time BETWEEN :min_ts AND :max_ts
                            """), {"sid": st_id, "vid": var_id, "src": source_id, "min_ts": min_ts, "max_ts": max_ts})

                    for v in values:
                         if entity_type == "bassins":
                             await db.execute(text("""
                                INSERT INTO ts.basin_measurement (basin_id, variable_id, time, value, source_id, run_id)
                                VALUES (CAST(:station_id AS UUID), :variable_id, :time, :value, :source_id, :run_id)
                                ON CONFLICT (time, basin_id, variable_id, source_id, run_id) DO UPDATE SET value = EXCLUDED.value
                             """), {"station_id": v["station_id"], "variable_id": v["variable_id"], "time": v["time"], "value": v["value"], "source_id": v["source_id"], "run_id": v["run_id"]})
                         else:
                             await db.execute(text("""
                                INSERT INTO ts.measurement (station_id, variable_id, time, value, qc_flag, source_id, run_id)
                                VALUES (CAST(:station_id AS UUID), :variable_id, :time, :value, :qc_flag, :source_id, :run_id)
                                ON CONFLICT (time, station_id, variable_id, source_id, run_id_norm) DO UPDATE SET value = EXCLUDED.value
                             """), v)
                    records_count += len(values)

            elif import_mode == "multi_variable":
                if not station_id: raise HTTPException(400, "Station required for multi-variable mode")
                
                # Check station type
                st_res = await db.execute(text("SELECT station_type FROM geo.station WHERE station_id = CAST(:sid AS UUID)"), {"sid": station_id})
                st_row = st_res.first()
                st_type = st_row[0] if st_row else ""
                
                # Cache variable IDs
                v_res = await db.execute(text("SELECT code, variable_id, label FROM ref.variable"))
                var_map = {}
                for row in v_res:
                    var_map[row.code.lower()] = row.variable_id
                    var_map[row.label.lower()] = row.variable_id
                
                for col in df.columns:
                    if col == ts_col: continue
                    
                    var_id = var_map.get(col.lower())
                    if not var_id and '(' in col:
                         clean_col = col.split('(')[0].strip().lower()
                         var_id = var_map.get(clean_col)

                    if not var_id:
                        continue
                    
                    # Validate Barrage constraint (using variable code from map if possible, but here we just have ID. 
                    # Ideally we map code too. 
                    # Simplified: if column name implies barrage var, check type.
                    if col.lower() in ['lacher_m3s', 'volume_k', 'cote_m', 'lachers', 'volume'] and "barrage" not in str(st_type).lower():
                        continue

                    values = []
                    for _, row in df.iterrows():
                        val = pd.to_numeric(row[col], errors='coerce')
                        if pd.notna(val):
                            ts_val = row[ts_col]
                            if pd.isna(ts_val): continue
                            if ts_val.tzinfo is None:
                                ts_val = ts_val.tz_localize('UTC')
                            else:
                                ts_val = ts_val.tz_convert('UTC')

                            values.append({
                                "station_id": station_id,
                                "variable_id": var_id,
                                "time": ts_val,
                                "value": val,
                                "qc_flag": 0,
                                "source_id": source_id,
                                "run_id": run_id
                            })
                            
                    if replace_existing.lower() == 'true' and values:
                        min_ts = min(v['time'] for v in values)
                        max_ts = max(v['time'] for v in values)
                        
                        # Execute DELETE
                        await db.execute(text("""
                            DELETE FROM ts.measurement 
                            WHERE station_id = CAST(:sid AS UUID) AND variable_id = :vid AND source_id = :src AND time BETWEEN :min_ts AND :max_ts
                        """), {"sid": station_id, "vid": var_id, "src": source_id, "min_ts": min_ts, "max_ts": max_ts})

                    for v in values:
                         await db.execute(text("""
                            INSERT INTO ts.measurement (station_id, variable_id, time, value, qc_flag, source_id, run_id)
                            VALUES (CAST(:station_id AS UUID), :variable_id, :time, :value, :qc_flag, :source_id, :run_id)
                            ON CONFLICT (time, station_id, variable_id, source_id, run_id_norm) DO UPDATE SET value = EXCLUDED.value
                         """), v)
                    records_count += len(values)
            
            await db.commit()
            return {"status": "success", "message": f"Imported {records_count} data points"}

        except Exception as e:
            await db.rollback()
            import traceback
            traceback.print_exc()
            raise HTTPException(500, f"Import failed: {str(e)}")
        finally:
            os.remove(tmp_path)
            
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")

# Request/Response models
class TimeSeriesPoint(BaseModel):
    timestamp: datetime
    value: float
    quality_flag: Optional[str] = None

class TimeSeriesCreate(BaseModel):
    timestamp: datetime
    value: float
    quality_flag: Optional[str] = "good"

@router.get("/timeseries/{variable_code}")
async def list_timeseries_stations(
    variable_code: str,
    all_stations: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of stations.
    If all_stations=True, returns ALL stations (for import).
    Else, returns only stations with data for this variable.
    """
    try:
        if all_stations:
             query = text("""
                SELECT 
                    s.station_id, 
                    s.code, 
                    s.name,
                    s.station_type,
                    0 as data_count
                FROM geo.station s
                ORDER BY s.name
            """)
             params = {}
        else:
            query = text("""
                SELECT DISTINCT 
                    s.station_id, 
                    s.code, 
                    s.name,
                    s.station_type,
                    COUNT(m.value) as data_count
                FROM geo.station s
                INNER JOIN ts.measurement m ON s.station_id = m.station_id
                INNER JOIN ref.variable v ON m.variable_id = v.variable_id
                WHERE v.code = :variable_code
                GROUP BY s.station_id, s.code, s.name, s.station_type
                ORDER BY s.name
            """)
            params = {"variable_code": variable_code}
        
        result = await db.execute(query, params)
        rows = result.mappings().all()
        
        return {
            "variable_code": variable_code,
            "stations": [dict(row) for row in rows]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stations: {str(e)}")


@router.get("/timeseries/{variable_code}/{station_id}")
async def get_timeseries_data(
    variable_code: str,
    station_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get time series data for a specific variable and station"""
    try:
        # Validate UUID
        safe_uuid = str(UUID(station_id))

        # Build query with optional date filters
        # INJECT UUID AS LITERAL STRING with CAST
        query_parts = [f"""
            SELECT 
                m.time as timestamp,
                m.value,
                m.qc_flag as quality_flag,
                v.code as variable_code,
                v.label as variable_name,
                v.unit
            FROM ts.measurement m
            INNER JOIN ref.variable v ON m.variable_id = v.variable_id
            WHERE m.station_id = CAST('{safe_uuid}' AS UUID) 
            AND v.code = :variable_code
        """]
        
        params = {
            "variable_code": variable_code
        }
        
        if start_date:
            query_parts.append("AND m.time >= :start_date")
            params["start_date"] = start_date
            
        if end_date:
            query_parts.append("AND m.time <= :end_date")
            params["end_date"] = end_date
            
        query_parts.append("ORDER BY m.time DESC LIMIT 1000")
        
        query = text(" ".join(query_parts))
        result = await db.execute(query, params)
        rows = result.mappings().all()
        
        return {
            "variable_code": variable_code,
            "station_id": station_id,
            "data_count": len(rows),
            "data": [dict(row) for row in rows]
        }
    except Exception as e:
        # Log error to stderr for capturing
        import sys
        print(f"ERROR in get_timeseries_data: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Error fetching time series: {str(e)}")

@router.post("/timeseries/{variable_code}/{station_id}")
async def add_timeseries_point(
    variable_code: str,
    station_id: str,
    point: TimeSeriesCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add a new time series data point"""
    try:
        safe_uuid = str(UUID(station_id))

        # Get variable_id
        var_query = text("SELECT variable_id FROM ref.variable WHERE code = :code")
        var_result = await db.execute(var_query, {"code": variable_code})
        var_row = var_result.first()
        
        if not var_row:
            raise HTTPException(status_code=404, detail=f"Variable {variable_code} not found")
        
        variable_id = var_row[0]
        
        # Insert measurement
        insert_query = text(f"""
            INSERT INTO ts.measurement (station_id, variable_id, time, value, qc_flag)
            VALUES (CAST('{safe_uuid}' AS UUID), :variable_id, :timestamp, :value, :quality_flag)
            RETURNING station_id
        """)
        
        result = await db.execute(insert_query, {
            "variable_id": variable_id,
            "timestamp": point.timestamp,
            "value": point.value,
            "quality_flag": point.quality_flag
        })
        
        await db.commit()
        
        return {
            "status": "success",
            "message": "Data point added"
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding data point: {str(e)}")

@router.delete("/timeseries/{variable_code}/{station_id}/{timestamp}")
async def delete_timeseries_point(
    variable_code: str,
    station_id: str,
    timestamp: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a single time series data point"""
    try:
        safe_uuid = str(UUID(station_id))
        
        from datetime import datetime
        try:
            ts_datetime = datetime.fromisoformat(timestamp)
        except ValueError:
            # Fallback if timestamp has unexpected format
            ts_datetime = timestamp

        query = text(f"""
            DELETE FROM ts.measurement m
            USING ref.variable v
            WHERE m.station_id = CAST('{station_id}' AS UUID)
            AND m.variable_id = v.variable_id
            AND v.code = :variable_code
            AND m.time = :timestamp
            RETURNING m.station_id
        """)
        result = await db.execute(query, {"variable_code": variable_code, "timestamp": ts_datetime})
        
        deleted = result.first()
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Measurement not found")
        
        await db.commit()
        
        return {
            "status": "success",
            "message": "Data point deleted"
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting data point: {str(e)}")


@router.delete("/timeseries/{variable_code}/{station_id}")
async def delete_timeseries_series(
    variable_code: str,
    station_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete ALL time series data for a specific variable and station"""
    try:
        safe_uuid = str(UUID(station_id))
        
        # Get variable_id first
        var_query = text("SELECT variable_id FROM ref.variable WHERE code = :code")
        var_result = await db.execute(var_query, {"code": variable_code})
        var_row = var_result.first()
        
        if not var_row:
            raise HTTPException(status_code=404, detail=f"Variable {variable_code} not found")
        
        variable_id = var_row[0]
        
        query = text(f"""
            DELETE FROM ts.measurement
            WHERE station_id = CAST('{safe_uuid}' AS UUID)
            AND variable_id = :variable_id
        """)
        
        result = await db.execute(query, {"variable_id": variable_id})
        deleted_count = result.rowcount
        
        await db.commit()
        
        return {
            "status": "success",
            "message": f"Deleted {deleted_count} measurements for variable {variable_code}"
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting time series: {str(e)}")
