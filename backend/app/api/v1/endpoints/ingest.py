import os
import shutil
import subprocess
import tempfile
from datetime import datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
import psycopg
from psycopg.rows import dict_row
from app.core.config import settings

router = APIRouter()

# Path calculation
# current file: backend/app/api/v1/endpoints/ingest.py
# target: backend/../Data/scripts (relative to backend root)
# Let's assume we can find it relative to this file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
# BASE_DIR should be .../backend
# Actually, let's just go up to 'hydro_sentinel' root
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
SCRIPTS_DIR = os.path.join(PROJECT_ROOT, "Data", "scripts")

# Check if scripts dir exists, if not try another path or fail gracefully
if not os.path.exists(SCRIPTS_DIR):
    # Fallback/Debug: maybe we are in a different structure?
    # backend is c:\dev\detection_inondation\hydro_sentinel\backend
    # scripts are c:\dev\detection_inondation\hydro_sentinel\Data\scripts
    SCRIPTS_DIR = r"c:\dev\detection_inondation\hydro_sentinel\Data\scripts"

class IngestionResponse(BaseModel):
    status: str
    message: str
    logs: str
    ingestion_id: Optional[str] = None

@router.get("/history", response_model=List[Any])
def get_ingestions(limit: int = 50):
    try:
        dsn = str(settings.DATABASE_URL)
        # SQLAlchemy URI might look like postgresql+psycopg2://...
        # psycopg needs postgresql://...
        if "+psycopg2" in dsn:
            dsn = dsn.replace("+psycopg2", "")
        if "+asyncpg" in dsn:
            dsn = dsn.replace("+asyncpg", "")
            
        with psycopg.connect(dsn, row_factory=dict_row) as conn:
            res = conn.execute("""
                SELECT ingestion_id, status, pipeline_name, started_at, finished_at, summary 
                FROM files.ingestion 
                ORDER BY started_at DESC 
                LIMIT %s
            """, (limit,)).fetchall()
            return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_ingestion(
    file: UploadFile = File(...),
    type: str = Form(...), # "abhs", "precip", "datatable"
    source_code: str = Form("ABHS_RES"),
    run_date: str = Form(None)
):
    from app.services.ingestion_analyzer import IngestionAnalyzer
    
    analyzer = IngestionAnalyzer()
    content = await file.read()
    
    # Map frontend type to analyzer type
    # Frontend sends: "abhs" (Results), "precip" (Rainfall), "datatable" (Stations)
    report = await analyzer.analyze_file(content, file.filename, type)
    
    # Reset file cursor for potential further use or just close
    await file.seek(0)
    
    return report

@router.post("/execute", response_model=IngestionResponse)
async def execute_ingestion(
    file: UploadFile = File(...),
    type: str = Form(...),
    source_code: str = Form("ABHS_RES"),
    run_date: str = Form(None)
):
    return await run_ingestion(file, type, source_code, run_date, dry_run=False)

async def run_ingestion(file: UploadFile, type: str, source_code: str, run_date: str, dry_run: bool):
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        dsn = str(settings.DATABASE_URL)
        if "+psycopg2" in dsn:
            dsn = dsn.replace("+psycopg2", "")
        if "+asyncpg" in dsn:
            dsn = dsn.replace("+asyncpg", "")

        cmd = []
        if type == "abhs":
            script = os.path.join(SCRIPTS_DIR, "ingest_excel_abhs_results.py")
            if not run_date:
                run_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            cmd = [
                "python", script,
                "--dsn", dsn,
                "--excel", tmp_path,
                "--source-code", source_code,
                "--run-time", run_date,
                "--run-label", f"Import via Web {datetime.now().strftime('%H:%M')}"
            ]
        elif type == "precip":
            script = os.path.join(SCRIPTS_DIR, "ingest_excel_precip_obs_v1.2.py")
            cmd = [
                "python", script,
                "--dsn", dsn,
                "--excel", tmp_path
            ]
        else:
            raise HTTPException(status_code=400, detail="Invalid ingestion type")

        if dry_run:
            cmd.append("--dry-run")
            
        # Ensure script exists
        if not os.path.exists(script):
             return {
                "status": "error",
                "message": f"Script not found at {script}",
                "logs": f"Checked path: {script}"
            }

        # Run script
        # Capture environment to pass potentially needed vars
        env = os.environ.copy()
        
        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            env=env
        )

        logs = process.stdout + "\n" + process.stderr
        status = "success" if process.returncode == 0 else "error"
        
        message = "Ingestion analysis complete" if dry_run else "Ingestion complete"
        if process.returncode != 0:
            message = "Ingestion script failed"

        return {
            "status": status,
            "message": message,
            "logs": logs
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Server error: {str(e)}",
            "logs": str(e)
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
