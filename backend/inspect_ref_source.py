
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def inspect_source():
    print("Connecting to DB...")
    db_url = str(settings.DATABASE_URL).replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url)

    async with engine.connect() as conn:
        print("\n--- Content of ref.source ---")
        res = await conn.execute(text("SELECT source_id, code, label FROM ref.source"))
        rows = res.fetchall()
        for row in rows:
            print(f" - {row}")

        print("\n--- Column Defaults in ts.measurement ---")
        res = await conn.execute(text("""
            SELECT column_name, column_default, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'ts' AND table_name = 'measurement';
        """))
        cols = res.fetchall()
        for col in cols:
            print(f" - {col[0]}: default={col[1]}, nullable={col[2]}")

if __name__ == "__main__":
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(inspect_source())
