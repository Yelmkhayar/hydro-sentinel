
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def inspect_schema():
    print("Connecting to DB...")
    db_url = str(settings.DATABASE_URL).replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url)

    async with engine.connect() as conn:
        print("\n--- Columns in ts.measurement ---")
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'ts' AND table_name = 'measurement';"))
        columns = res.fetchall()
        for col in columns:
            print(f" - {col[0]} ({col[1]})")

        print("\n--- Constraints on ts.measurement ---")
        res = await conn.execute(text("""
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'ts.measurement'::regclass;
        """))
        constraints = res.fetchall()
        for con in constraints:
            print(f" - {con[0]}: {con[1]}")

if __name__ == "__main__":
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(inspect_schema())
