
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings
from uuid import UUID

async def check_obs():
    print("Connecting to DB...")
    db_url = str(settings.DATABASE_URL).replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url)

    async with engine.connect() as conn:
        print("\n--- Checking OBS rows (source_id=1) ---")
        res = await conn.execute(text("SELECT source_id, run_id, run_id_norm, qc_flag FROM ts.measurement WHERE source_id = 1 LIMIT 5"))
        rows = res.fetchall()
        if not rows:
            print("No OBS rows found! Checking ANY row...")
            res = await conn.execute(text("SELECT source_id, run_id, run_id_norm FROM ts.measurement LIMIT 5"))
            rows = res.fetchall()
            
        for row in rows:
            print(f" - Src={row[0]}, Run={row[1]}, Norm={row[2]}")

if __name__ == "__main__":
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(check_obs())
