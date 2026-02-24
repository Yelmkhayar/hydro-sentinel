
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def inspect_more():
    print("Connecting to DB...")
    db_url = str(settings.DATABASE_URL).replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url)

    async with engine.connect() as conn:
        print("\n--- Content of ref.run ---")
        res = await conn.execute(text("SELECT run_id, label FROM ref.run LIMIT 5"))
        rows = res.fetchall()
        for row in rows:
            print(f" - {row}")

        print("\n--- Triggers on ts.measurement ---")
        res = await conn.execute(text("""
            SELECT tgname, pg_get_triggerdef(oid)
            FROM pg_trigger
            WHERE tgrelid = 'ts.measurement'::regclass;
        """))
        triggers = res.fetchall()
        for t in triggers:
            print(f" - {t[0]}: {t[1]}")

if __name__ == "__main__":
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(inspect_more())
