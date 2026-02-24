
import asyncio
from sqlalchemy import text
from app.db.session import SessionLocal

async def inspect():
    async with SessionLocal() as db:
        print("\n--- Columns in ref.run ---")
        res = await db.execute(text("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'ref' AND table_name = 'run';"))
        rows = res.fetchall()
        for row in rows:
            print(f"{row[0]} ({row[1]}) - Nullable: {row[2]}")

if __name__ == "__main__":
    asyncio.run(inspect())
