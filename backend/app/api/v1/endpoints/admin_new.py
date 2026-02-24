from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query, Response
from typing import List, Optional, Any, Dict
from fastapi.responses import StreamingResponse
from . import dashboard, sites, data_availability, ts_management, auth
from pydantic import BaseModel
from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
import os
import shutil
import tempfile
import zipfile
import geopandas as gpd
import json
import csv
import io
from datetime import datetime, timedelta



router = APIRouter()


# --- Models ---
class EntityUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    station_type: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    attributes: Optional[Dict[str, Any]] = None

class EntityCreate(BaseModel):
    name: str
    code: str
    station_type: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

# --- Helper ---
ALLOWED_TABLES = {
    "stations": "geo.station",
    "bassins": "geo.basin",
}

def get_table(entity_type: str) -> str:
    table = ALLOWED_TABLES.get(entity_type)
    if not table:
        raise HTTPException(status_code=400, detail=f"Invalid entity type: {entity_type}. Allowed: stations, bassins")
    return table

# --- LIST ---
@router.get("/entities/{entity_type}")
async def list_entities(entity_type: str, db: AsyncSession = Depends(get_db)):
    """List entities like 'stations', 'bassins' from DB geo tables"""
    table_map = {
        "stations": "geo.station",
        "bassins": "geo.basin",
        "barrages": "geo.barrage"
    }
    
    target_table = table_map.get(entity_type)
    if not target_table:
        target_table = f"geo.{entity_type}"

    try:
        allowed_tables = ["geo.station", "geo.basin", "geo.barrage", "ref.station_alias", "ref.basin_alias"]
        if target_table not in allowed_tables:
            raise HTTPException(status_code=400, detail=f"Invalid entity type: {entity_type}")

        result = await db.execute(text(f"SELECT * FROM {target_table} LIMIT 500"))
        rows = result.mappings().all()
        return [dict(row) for row in rows]
    except Exception as e:
        error_msg = str(e).lower()
        if "n'existe pas" in error_msg or "does not exist" in error_msg or "relation" in error_msg:
            return []
        raise HTTPException(status_code=500, detail=str(e))


# --- CREATE ---
@router.post("/entities/{entity_type}")
async def create_entity(entity_type: str, entity: EntityCreate, db: AsyncSession = Depends(get_db)):
    """Create a new station or bassin"""
    target_table = get_table(entity_type)
    
    try:
        if entity_type == "stations":
            # Enforce coordinates for stations as geom is NOT NULL
            if entity.lat is None or entity.lon is None:
                 raise HTTPException(status_code=400, detail="Latitude and Longitude are required for new stations")

            stmt = text(f"""
                INSERT INTO {target_table} (name, code, station_type, geom)
                VALUES (:name, :code, :station_type, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
                RETURNING station_id, name, code, station_type
            """)
            result = await db.execute(stmt, {
                "name": entity.name,
                "code": entity.code,
                "station_type": entity.station_type or "Station hydrologique",
                "lat": entity.lat,
                "lon": entity.lon
            })
        else:  # bassins
            if entity.lat is not None and entity.lon is not None:
                stmt = text(f"""
                    INSERT INTO {target_table} (name, code, geom)
                    VALUES (:name, :code, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
                    RETURNING basin_id, name, code
                """)
                result = await db.execute(stmt, {
                    "name": entity.name,
                    "code": entity.code,
                    "lat": entity.lat,
                    "lon": entity.lon
                })
            else:
                stmt = text(f"""
                    INSERT INTO {target_table} (name, code)
                    VALUES (:name, :code)
                    RETURNING basin_id, name, code
                """)
                result = await db.execute(stmt, {
                    "name": entity.name,
                    "code": entity.code
                })
        
        row = result.mappings().first()
        await db.commit()
        return {"status": "success", "entity": dict(row) if row else {}}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating entity: {str(e)}")


# --- UPDATE ---
@router.put("/entities/{entity_type}/{entity_id}")
async def update_entity(entity_type: str, entity_id: str, entity: EntityUpdate, db: AsyncSession = Depends(get_db)):
    """Update a station or bassin"""
    target_table = get_table(entity_type)
    
    try:
        # Build SET clause dynamically
        set_parts = []
        params: Dict[str, Any] = {"entity_id": entity_id}
        
        if entity.name is not None:
            set_parts.append("name = :name")
            params["name"] = entity.name
        if entity.code is not None:
            set_parts.append("code = :code")
            params["code"] = entity.code
        if entity_type == "stations" and entity.station_type is not None:
            set_parts.append("station_type = :station_type")
            params["station_type"] = entity.station_type
        if entity.lat is not None and entity.lon is not None:
            set_parts.append("geom = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)")
            params["lat"] = entity.lat
            params["lon"] = entity.lon
        
        if not set_parts:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Determine ID column
        id_col = "station_id" if entity_type == "stations" else "basin_id"
        
        stmt = text(f"""
            UPDATE {target_table}
            SET {', '.join(set_parts)}
            WHERE {id_col} = CAST(:entity_id AS UUID)
            RETURNING {id_col}, name, code
        """)
        
        result = await db.execute(stmt, params)
        row = result.mappings().first()
        
        if not row:
            raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
        
        await db.commit()
        return {"status": "success", "entity": dict(row)}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating entity: {str(e)}")


# --- DELETE ---
@router.delete("/entities/{entity_type}/{entity_id}")
async def delete_entity(entity_type: str, entity_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a station or bassin (with cascade on measurements)"""
    target_table = get_table(entity_type)
    id_col = "station_id" if entity_type == "stations" else "basin_id"
    
    try:
        # For stations: delete measurements first
        if entity_type == "stations":
            await db.execute(
                text(f"DELETE FROM ts.measurement WHERE station_id = CAST(:id AS UUID)"),
                {"id": entity_id}
            )
            
            # Also cleanup dss_mapping which references station_id
            try:
                await db.execute(
                    text(f"DELETE FROM dss_mapping WHERE station_id = CAST(:id AS UUID)"),
                    {"id": entity_id}
                )
            except Exception:
                pass # Table might not exist or error, proceed

            # Delete from dss_mapping if exists
            try:
                await db.execute(
                    text(f"DELETE FROM dss_mapping WHERE station_id = CAST(:id AS UUID)"),
                    {"id": entity_id}
                )
            except Exception:
                pass # Table might not exist or other error, but proceed

        
        result = await db.execute(
            text(f"DELETE FROM {target_table} WHERE {id_col} = CAST(:id AS UUID) RETURNING {id_col}"),
            {"id": entity_id}
        )
        deleted = result.first()
        
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
        
        await db.commit()
        return {"status": "success", "message": f"Entity {entity_id} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting entity: {str(e)}")


# --- TEMPLATE GENERATION ---

@router.get("/templates/simple")
async def get_template_simple(
    station_id: Optional[str] = Query(None),
    variable_code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Generate a pre-filled simple Excel template (one station, one variable)"""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    
    # Get station info
    station_name = "STATION_CODE"
    variable_label = variable_code or "VARIABLE"
    
    if station_id:
        try:
            res = await db.execute(
                text("SELECT name, code FROM geo.station WHERE station_id = CAST(:id AS UUID)"),
                {"id": station_id}
            )
            row = res.mappings().first()
            if row:
                station_name = row["code"] or row["name"]
        except:
            pass
    
    if variable_code:
        try:
            res = await db.execute(
                text("SELECT label, unit FROM ref.variable WHERE code = :code"),
                {"code": variable_code}
            )
            row = res.mappings().first()
            if row:
                variable_label = f"{row['label']} ({row['unit']})"
        except:
            pass

    # Create Excel
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Données"
    
    # Style
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    info_fill = PatternFill(start_color="E8F4FD", end_color="E8F4FD", fill_type="solid")
    
    # Info row
    ws["A1"] = f"Station: {station_name} | Variable: {variable_label}"
    ws["A1"].font = Font(bold=True, size=12)
    ws["A1"].fill = info_fill
    ws.merge_cells("A1:C1")
    
    ws["A2"] = "Format: timestamp ISO8601, valeur numérique, flag qualité (good/suspect/bad)"
    ws["A2"].fill = info_fill
    ws.merge_cells("A2:C2")
    
    # Header row
    headers = ["timestamp", "value", "quality_flag"]
    for i, h in enumerate(headers):
        cell = ws.cell(row=3, column=i+1, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        ws.column_dimensions[cell.column_letter].width = 22 if i == 0 else 15
    
    # Example rows
    base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(3):
        dt = base_date - timedelta(days=i)
        ws.append([dt.strftime("%Y-%m-%dT%H:%M:%S"), "", "good"])
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"template_simple_{station_name}_{variable_code or 'variable'}.xlsx"
    
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/templates/multi-variable")
async def get_template_multi_variable(
    station_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Generate Excel template with columns = variables (for one station)"""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    
    station_name = "STATION"
    station_code = "CODE"
    
    # Get station info
    if station_id:
        try:
            res = await db.execute(
                text("SELECT name, code FROM geo.station WHERE station_id = CAST(:id AS UUID)"),
                {"id": station_id}
            )
            row = res.mappings().first()
            if row:
                station_name = row["name"]
                station_code = row["code"] or row["name"]
        except:
            pass
    
    # Get all variables
    variables = []
    try:
        res = await db.execute(text("SELECT code, label, unit FROM ref.variable ORDER BY label"))
        variables = [dict(r) for r in res.mappings().all()]
    except:
        variables = [{"code": "precip_mm", "label": "Précipitations", "unit": "mm"}]
    
    # Create Excel
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Données"
    
    # Style
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    info_fill = PatternFill(start_color="E8F4FD", end_color="E8F4FD", fill_type="solid")
    
    # Info row
    ws["A1"] = f"Station: {station_name} ({station_code})"
    ws["A1"].font = Font(bold=True, size=12)
    ws["A1"].fill = info_fill
    ws.merge_cells(f"A1:{get_column_letter(len(variables) + 1)}1")
    
    ws["A2"] = "Format: timestamp ISO8601 (YYYY-MM-DDTHH:MM:SS), valeurs numériques par colonne variable"
    ws["A2"].fill = info_fill
    ws.merge_cells(f"A2:{get_column_letter(len(variables) + 1)}2")
    
    # Header row
    ws["A3"] = "timestamp"
    ws["A3"].font = header_font
    ws["A3"].fill = header_fill
    ws["A3"].alignment = Alignment(horizontal="center")
    ws.column_dimensions["A"].width = 22
    
    for i, var in enumerate(variables):
        col = get_column_letter(i + 2)
        cell = ws[f"{col}3"]
        cell.value = f"{var['code']}\n({var['unit']})"
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", wrap_text=True)
        ws.column_dimensions[col].width = 16
    
    ws.row_dimensions[3].height = 35
    
    # Example rows
    base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(3):
        dt = base_date - timedelta(days=i)
        row_num = 4 + i
        ws[f"A{row_num}"] = dt.strftime("%Y-%m-%dT%H:%M:%S")
        for j in range(len(variables)):
            ws[f"{get_column_letter(j + 2)}{row_num}"] = ""
    
    # Info sheet
    ws_info = wb.create_sheet("Variables")
    ws_info["A1"] = "Code"
    ws_info["B1"] = "Label"
    ws_info["C1"] = "Unité"
    for i, var in enumerate(variables):
        ws_info[f"A{i+2}"] = var["code"]
        ws_info[f"B{i+2}"] = var["label"]
        ws_info[f"C{i+2}"] = var["unit"]
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"template_multi_variable_{station_code}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/templates/multi-station")
async def get_template_multi_station(
    variable_code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Generate Excel template with columns = stations (for one variable)"""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    
    variable_label = variable_code or "VARIABLE"
    variable_unit = ""
    
    # Get variable info
    if variable_code:
        try:
            res = await db.execute(
                text("SELECT label, unit FROM ref.variable WHERE code = :code"),
                {"code": variable_code}
            )
            row = res.mappings().first()
            if row:
                variable_label = row["label"]
                variable_unit = row["unit"]
        except:
            pass
    
    # Get all stations
    stations = []
    try:
        res = await db.execute(text("SELECT station_id, name, code FROM geo.station ORDER BY name"))
        stations = [dict(r) for r in res.mappings().all()]
    except:
        stations = [{"station_id": "xxx", "name": "Station 1", "code": "S1"}]
    
    # Create Excel
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Données"
    
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    info_fill = PatternFill(start_color="E8F4FD", end_color="E8F4FD", fill_type="solid")
    
    # Info row
    ws["A1"] = f"Variable: {variable_label} ({variable_unit})"
    ws["A1"].font = Font(bold=True, size=12)
    ws["A1"].fill = info_fill
    ws.merge_cells(f"A1:{get_column_letter(len(stations) + 1)}1")
    
    ws["A2"] = "Format: timestamp ISO8601 (YYYY-MM-DDTHH:MM:SS), valeurs numériques par colonne station (code station en entête)"
    ws["A2"].fill = info_fill
    ws.merge_cells(f"A2:{get_column_letter(len(stations) + 1)}2")
    
    # Header row
    ws["A3"] = "timestamp"
    ws["A3"].font = header_font
    ws["A3"].fill = header_fill
    ws["A3"].alignment = Alignment(horizontal="center")
    ws.column_dimensions["A"].width = 22
    
    for i, station in enumerate(stations):
        col = get_column_letter(i + 2)
        cell = ws[f"{col}3"]
        cell.value = station.get("code") or station.get("name")
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", wrap_text=True)
        ws.column_dimensions[col].width = 16
    
    ws.row_dimensions[3].height = 35
    
    # Example rows
    base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(3):
        dt = base_date - timedelta(days=i)
        row_num = 4 + i
        ws[f"A{row_num}"] = dt.strftime("%Y-%m-%dT%H:%M:%S")
        for j in range(len(stations)):
            ws[f"{get_column_letter(j + 2)}{row_num}"] = ""
    
    # Info sheet
    ws_info = wb.create_sheet("Stations")
    ws_info["A1"] = "Code"
    ws_info["B1"] = "Nom"
    for i, s in enumerate(stations):
        ws_info[f"A{i+2}"] = s.get("code") or ""
        ws_info[f"B{i+2}"] = s.get("name") or ""
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"template_multi_station_{variable_code or 'variable'}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# --- SHP UPLOAD ---
@router.post("/shp/upload")
async def upload_shp(
    file: UploadFile = File(...), 
    dry_run: bool = Form(True),
    entity_type: str = Form("stations"),
    replace_mode: bool = Form(False),
    column_mapping: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a SHP file or ZIP containing SHP, SHX, DBF, etc.
    Parse with GeoPandas.
    If dry_run=True, return GeoJSON preview.
    If dry_run=False, commit to DB (Insert/Update or Replace).
    """
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            if file.filename.lower().endswith('.zip'):
                zip_path = os.path.join(tmpdir, file.filename)
                with open(zip_path, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)
                
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(tmpdir)
                
                shp_file = None
                for root, dirs, files in os.walk(tmpdir):
                    for f in files:
                        if f.endswith(".shp"):
                            shp_file = os.path.join(root, f)
                            break
                
                if not shp_file:
                    raise HTTPException(status_code=400, detail="No .shp file found in ZIP")
            
            elif file.filename.lower().endswith('.shp'):
                shp_path = os.path.join(tmpdir, file.filename)
                with open(shp_path, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)
                shp_file = shp_path
            
            else:
                raise HTTPException(status_code=400, detail="File must be .shp or .zip containing shapefile")

            gdf = gpd.read_file(shp_file)
            
            if gdf.crs and gdf.crs.to_string() != "EPSG:4326":
                gdf = gdf.to_crs("EPSG:4326")

            geojson_str = gdf.to_json()
            geojson_data = json.loads(geojson_str)
            
            if dry_run:
                return {
                    "status": "success",
                    "message": f"Parsed {len(gdf)} features from {os.path.basename(shp_file)}",
                    "message": f"Parsed {len(gdf)} features from {os.path.basename(shp_file)}",
                    "preview": geojson_data,
                    "columns": list(gdf.columns.astype(str)),
                    "debug_version": "v3"
                }
            
            target_table = "geo.station" if entity_type == "stations" else "geo.basin"
            if entity_type not in ["stations", "bassins", "basins"]:
                 raise HTTPException(status_code=400, detail=f"Invalid entity type: {entity_type}")
            if entity_type in ["bassins", "basins"]:
                target_table = "geo.basin"

            gdf.columns = [c.lower() for c in gdf.columns]
            
            # Parse column mapping if provided
            mapping = {}
            if column_mapping:
                try:
                    mapping = json.loads(column_mapping)
                except:
                    pass

            code_col = (mapping.get("code") or next((c for c in gdf.columns if c in ['code', 'id', 'identifiant']), None))
            if code_col: code_col = code_col.lower()

            name_col = (mapping.get("name") or next((c for c in gdf.columns if c in ['name', 'nom', 'label']), None))
            if name_col: name_col = name_col.lower()

            # Use mapped type col, or auto-detect
            # Prioritize specific names over generic 'type'
            type_col = (mapping.get("type") or next((c for c in gdf.columns if c in ['station_type', 'type_station', 'type_statt', 'genre', 'type']), None))
            if type_col: type_col = type_col.lower()
            
            # Check for forced type
            forced_type = mapping.get("force_type")



# ... (imports remain)

# --- Helper for type mapping ---
            def get_station_type(row):
                # Legacy mapping for safety
                LEGACY_MAP = {
                    "pluviometrique": "Poste Pluviométrique",
                    "poste_mesure": "Station hydrologique", 
                    "barrage": "Barrage",
                    "result_point": "point resultats",
                    "limnimetrique": "Station hydrologique",
                    "hydrologique": "Station hydrologique",
                    "poste pluviométrique": "Poste Pluviométrique",
                    "station hydrologique": "Station hydrologique",
                    "point resultats": "point resultats"
                }

                import unicodedata
                
                if forced_type:
                    # Normalize input to NFC to ensure 'é' is consistent
                    ft_norm = unicodedata.normalize('NFC', forced_type)
                    lower_forced_type = ft_norm.lower().strip()
                    
                    if "pluvio" in lower_forced_type: return "Poste Pluviométrique"
                    if "barrage" in lower_forced_type: return "Barrage"
                    if "result" in lower_forced_type: return "point resultats"
                    if "hydrologique" in lower_forced_type or "station" in lower_forced_type: return "Station hydrologique"
                    
                    # Direct mapping fallback
                    return LEGACY_MAP.get(lower_forced_type, ft_norm)

                if not type_col: return "Station hydrologique"
                
                raw_val = str(row[type_col]).strip()
                val = raw_val.lower()
                
                print(f"DEBUG TYPE MAPPING: Col={type_col} | Raw='{raw_val}' | Lower='{val}'")

                if "pluvio" in val: return "Poste Pluviométrique"
                if "barrage" in val: return "Barrage"
                if "hydrologique" in val or "limni" in val or "hydro" in val or "poste" in val: return "Station hydrologique"
                if "result" in val: return "point resultats"
                
                # print(f"DEBUG: Defaulting to Station hydrologique for val='{val}'")
                return "Station hydrologique"

            
            if not code_col:
                 failed_cols = list(gdf.columns)
                 raise HTTPException(status_code=400, detail=f"SHP must have a 'code', 'id' or 'identifiant' column. Found: {failed_cols}")
            
            # Basin column detection
            basin_col = (mapping.get("basin") or next((c for c in gdf.columns if c in ['basin', 'bassin', 'bassin_versant', 'bv']), None))
            if basin_col: basin_col = basin_col.lower()

            try:
                if replace_mode:
                    if target_table == "geo.station":
                        try:
                            await db.execute(text("DELETE FROM ts.measurement WHERE station_id IN (SELECT station_id FROM geo.station)"))
                        except Exception as e:
                            print(f"Warning cleaning measurements: {e}")
                    
                    await db.execute(text(f"TRUNCATE TABLE {target_table} CASCADE"))
                    
                    for idx, row in gdf.iterrows():
                        geom_wkt = row.geometry.wkt
                        code = str(row[code_col])
                        name = str(row[name_col]) if name_col else code
                        st_type = get_station_type(row)
                        
                        # Resolve Basin ID if column exists
                        basin_id = None
                        if basin_col and row.get(basin_col):
                            b_val = str(row[basin_col]).strip()
                            # Try to find basin by code or name
                            res_b = await db.execute(text("SELECT basin_id FROM geo.basin WHERE code = :v OR name = :v"), {"v": b_val})
                            b_row = res_b.first()
                            if b_row: basin_id = b_row.basin_id

                        stmt = text(f"""
                            INSERT INTO {target_table} (name, code, station_type, basin_id, geom)
                            VALUES (:name, :code, :st_type, :basin_id, ST_SetSRID(ST_GeomFromText(:geom), 4326))
                        """)
                        # print(f"DEBUG SQL REPLACE: st_type={st_type} basin_id={basin_id} code={code}")
                        await db.execute(stmt, {"name": name, "code": code, "st_type": st_type, "basin_id": basin_id, "geom": geom_wkt})

                        
                else:
                    for idx, row in gdf.iterrows():
                        geom_wkt = row.geometry.wkt
                        code = str(row[code_col])
                        name = str(row[name_col]) if name_col else code
                        st_type = get_station_type(row)
                        
                        # Resolve Basin ID if column exists
                        basin_id = None
                        if basin_col and row.get(basin_col):
                            b_val = str(row[basin_col]).strip()
                            res_b = await db.execute(text("SELECT basin_id FROM geo.basin WHERE code = :v OR name = :v"), {"v": b_val})
                            b_row = res_b.first()
                            if b_row: basin_id = b_row.basin_id
                        
                        check = await db.execute(text(f"SELECT 1 FROM {target_table} WHERE code = :code"), {"code": code})
                        exists = check.first()
                        
                        if exists:
                            # Update basin_id only if resolved
                            params = {"name": name, "code": code, "st_type": st_type, "geom": geom_wkt}
                            set_actions = "name = :name, station_type = :st_type, geom = ST_SetSRID(ST_GeomFromText(:geom), 4326)"
                            
                            if basin_id:
                                set_actions += ", basin_id = :basin_id"
                                params["basin_id"] = basin_id

                            stmt = text(f"""
                                UPDATE {target_table} 
                                SET {set_actions}
                                WHERE code = :code
                            """)
                            await db.execute(stmt, params)
                        else:
                            stmt = text(f"""
                                INSERT INTO {target_table} (name, code, station_type, basin_id, geom)
                                VALUES (:name, :code, :st_type, :basin_id, ST_SetSRID(ST_GeomFromText(:geom), 4326))
                            """)
                            # print(f"DEBUG SQL APPEND: st_type={st_type} basin_id={basin_id} code={code}")
                            await db.execute(stmt, {"name": name, "code": code, "st_type": st_type, "basin_id": basin_id, "geom": geom_wkt})

                
                await db.commit()
                return {"status": "success", "message": f"Successfully committed {len(gdf)} features to {target_table}"}

            except Exception as e:
                await db.rollback()
                raise e

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SHP Processing Error: {str(e)}")
