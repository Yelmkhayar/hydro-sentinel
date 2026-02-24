import asyncio
from sqlalchemy import text
from app.db.session import engine

async def extract_view():
    async with engine.connect() as conn:
        for view in ['v_latest_station_pivot', 'v_top_critical_24h', 'v_map_points_kpi']:
            res = await conn.execute(text(f"SELECT definition FROM pg_views WHERE schemaname = 'api' AND viewname = '{view}'"))
            row = res.fetchone()
            if row:
                print(f"--- {view} ---")
                print(row[0])

asyncio.run(extract_view())
