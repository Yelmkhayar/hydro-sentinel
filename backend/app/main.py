from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Force reload: geo schema fix applied
from app.core.config import settings

print("\n" + "="*50)
print("*** LOADING LOCAL MAIN.PY ***")
print(f"File: {__file__}")
print("="*50 + "\n")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# GLOBAL EXCEPTION HANDLER
from fastapi import Request
from fastapi.responses import JSONResponse
import traceback
import sys

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"GLOBAL HANDLER CAUGHT: {str(exc)}\n{traceback.format_exc()}"
    print(error_msg, file=sys.stderr)
    try:
        with open("c:/dev/detection_inondation/hydro_sentinel/backend/global_error.log", "a") as f:
            f.write(f"--- {datetime.now()} ---\n")
            f.write(error_msg + "\n")
    except:
        pass
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "debug_error": str(exc)},
    )

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS or ["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping_global")
def ping_global():
    return {"message": "Global Ping OK"}

@app.get("/ping_error")
def ping_error():
    raise Exception("Test Global Exception Handler")

# We will import and include the API router here later
from app.api.v1.api import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)

