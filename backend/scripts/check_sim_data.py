import asyncio
import os
import sys

# Add backend to path so imports work
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("""
            SELECT s.name, v.variable_code, COUNT(*) 
            FROM api.v_timeseries_station v
            JOIN ref.station s ON v.station_id = s.station_id
            WHERE v.source_code = 'SIM' AND s.station_type = 'Barrage'
            GROUP BY s.name, v.variable_code
            ORDER BY s.name
        """))
        for row in res.fetchall():
            print(row[0], ":", row[1], "-", row[2], "records")

if __name__ == '__main__':
    asyncio.run(main())
