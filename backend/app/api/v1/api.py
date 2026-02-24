
print(">>> DEBUG: API_ROUTER LOADING... <<<")
from fastapi import APIRouter
from app.api.v1.endpoints import auth, sites, measurements, dashboard, variables, admin_new, data_availability, ingest, health, ts_management
print(f">>> DEBUG: IMPORTED ADMIN_NEW: {admin_new} <<<")

api_router = APIRouter()

api_router.include_router(auth.router, tags=["login"])
api_router.include_router(sites.router, tags=["sites"])
api_router.include_router(measurements.router, prefix="/measurements", tags=["measurements"])
api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(variables.router, tags=["variables"])
api_router.include_router(admin_new.router, prefix="/admin", tags=["admin"])
api_router.include_router(data_availability.router, prefix="/admin", tags=["admin"])

api_router.include_router(ingest.router, prefix="/ingest", tags=["ingestion"])

from app.api.v1.endpoints import health
api_router.include_router(health.router, tags=["health"])

from app.api.v1.endpoints import test_geo
api_router.include_router(test_geo.router, prefix="/test", tags=["testing"])

# Time series management
api_router.include_router(ts_management.router, prefix="/admin", tags=["timeseries"])
