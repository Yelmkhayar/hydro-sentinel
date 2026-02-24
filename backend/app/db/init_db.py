import asyncio
import logging
from datetime import datetime, timedelta
import math
import random

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import engine, AsyncSessionLocal
from app.db.base import Base
from app.models.user import User
from app.models.view_models import (
    BasinView, StationView, TimeseriesView, 
    LatestStationPivotView, TopCriticalView, MapKPIView
)
from app.core import security
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data from mockData.ts
BASINS = [
  {"id": "basin-sebou", "code": 1, "name": "Sebou", "level": 1, "parent_basin_id": None, "color": "#06b6d4"},
  {"id": "basin-oergha", "code": 2, "name": "Ouergha", "level": 2, "parent_basin_id": "basin-sebou", "color": "#3b82f6"},
  {"id": "basin-haut-sebou", "code": 3, "name": "Haut Sebou", "level": 2, "parent_basin_id": "basin-sebou", "color": "#8b5cf6"},
  {"id": "basin-beht", "code": 4, "name": "Beht", "level": 2, "parent_basin_id": "basin-sebou", "color": "#10b981"},
]

STATIONS = [
  {"id": "st-1", "code": "S001", "name": "Azrou", "basin_id": "basin-haut-sebou", "lat": 33.44, "lon": -5.22, "type": "station", "active": True},
  {"id": "st-2", "code": "S002", "name": "Fès Saiss", "basin_id": "basin-sebou", "lat": 34.03, "lon": -5.00, "type": "station", "active": True},
  {"id": "st-3", "code": "S003", "name": "Ain Louali", "basin_id": "basin-oergha", "lat": 34.35, "lon": -4.50, "type": "station", "active": True},
  {"id": "st-4", "code": "S004", "name": "M'Jara", "basin_id": "basin-oergha", "lat": 34.55, "lon": -5.10, "type": "station", "active": True},
  {"id": "st-5", "code": "S005", "name": "Pont du Sebou", "basin_id": "basin-sebou", "lat": 34.25, "lon": -4.90, "type": "station", "active": True},
  {"id": "st-6", "code": "S006", "name": "Dar El Arsa", "basin_id": "basin-oergha", "lat": 34.40, "lon": -4.80, "type": "station", "active": True},
  {"id": "st-7", "code": "S007", "name": "Bab Ouender", "basin_id": "basin-haut-sebou", "lat": 33.90, "lon": -4.30, "type": "station", "active": True},
  {"id": "st-8", "code": "S008", "name": "Sidi Kacem", "basin_id": "basin-beht", "lat": 34.22, "lon": -5.71, "type": "station", "active": True},
  # Dams
  {"id": "st-dam-1", "code": "D001", "name": "Al Wahda", "basin_id": "basin-oergha", "lat": 34.65, "lon": -5.45, "type": "barrage", "active": True},
  {"id": "st-dam-2", "code": "D002", "name": "Idriss 1er", "basin_id": "basin-sebou", "lat": 34.08, "lon": -4.62, "type": "barrage", "active": True},
  {"id": "st-dam-3", "code": "D003", "name": "Allal El Fassi", "basin_id": "basin-haut-sebou", "lat": 33.70, "lon": -4.95, "type": "barrage", "active": True},
]

def generate_timeseries(days=30, base_value=50, variance=20, seed=0):
    data = []
    now = datetime.utcnow()
    for i in range(days * 24, -1, -6):
        date = now - timedelta(hours=i)
        val = base_value + math.sin((i + seed) / 24) * variance + math.sin((i + seed) * 0.7) * variance * 0.3
        data.append({"date": date, "value": max(0, round(val, 1))})
    return data

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Create User
        user = await db.get(User, 1)
        if not user:
            user = User(
                email="admin@hydro.com",
                hashed_password=security.get_password_hash("admin"),
                full_name="Admin User",
                is_superuser=True,
                role="admin"
            )
            db.add(user)
            logger.info("Admin user created")

        # 2. Create Basins
        for b in BASINS:
            basin = BasinView(
                id=b["id"], code=b["code"], name=b["name"], 
                level=b["level"], parent_basin_id=b["parent_basin_id"],
                color=b["color"]
            )
            db.add(basin)
        
        # 3. Create Stations
        for s in STATIONS:
            station = StationView(
                id=s["id"], code=s["code"], name=s["name"],
                basin_id=s["basin_id"], lat=s["lat"], lon=s["lon"],
                type=s["type"], active=s["active"]
            )
            db.add(station)

            # 4. Generate Timeseries for each station
            # Precip
            ts_data = generate_timeseries(days=14, base_value=10, variance=10, seed=ord(s["id"][-1]))
            for pt in ts_data:
                db.add(TimeseriesView(
                    time=pt["date"], station_id=s["id"], variable_code="precip_mm", source_code="OBS",
                    run_time=pt["date"], value=pt["value"]
                ))
            
            # 5. Populate Pivot & Map KPI (Mocked values based on last TS point)
            last_precip = ts_data[-1]["value"]
            severity = "safe"
            if last_precip > 50: severity = "critical"
            elif last_precip > 20: severity = "warning"
            
            # MapKPI
            db.add(MapKPIView(
                station_id=s["id"], station_name=s["name"], 
                lat=s["lat"], lon=s["lon"],
                severity=severity, score=last_precip,
                precip_obs_mm=last_precip, debit_obs_m3s=0, lacher_m3s_latest=0, volume_hm3_latest=0,
                precip_cum_24h_mm=last_precip * 3 # Mock
            ))

            # TopCritical
            if severity != "safe":
                db.add(TopCriticalView(
                    station_id=s["id"], station_name=s["name"], 
                    basin_name=s["basin_id"], # Simplified
                    precip_cum_24h_mm=last_precip * 3,
                    debit_max_24h_m3s=0, lacher_max_24h_m3s=0,
                    severity=severity, score=last_precip
                ))

        await db.commit()
        logger.info("Database initialized and seeded.")

if __name__ == "__main__":
    asyncio.run(init_db())
