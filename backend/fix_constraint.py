
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def fix_constraint():
    print("Connecting to DB to FIX constraint...")
    db_url = str(settings.DATABASE_URL).replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url)

    async with engine.begin() as conn:
        print("Dropping old constraint...")
        await conn.execute(text("ALTER TABLE geo.station DROP CONSTRAINT IF EXISTS station_station_type_check;"))
        
        print("Adding NEW constraint with explicit values...")
        # valid values: 'point resultats', 'Barrage', 'Station hydrologique', 'Poste Pluviométrique'
        # We use a raw SQL string to ensure the encoding is handled by the driver.
        sql = """
            ALTER TABLE geo.station 
            ADD CONSTRAINT station_station_type_check 
            CHECK (station_type IN ('point resultats', 'Barrage', 'Station hydrologique', 'Poste Pluviométrique'));
        """
        await conn.execute(text(sql))
        print("✅ Constraint recreated successfully.")

if __name__ == "__main__":
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(fix_constraint())
