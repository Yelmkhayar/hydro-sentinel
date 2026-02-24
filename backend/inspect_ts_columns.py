
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def inspect_columns():
    async with engine.connect() as conn:
        print("\n--- Columns in ts.measurement ---")
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'ts' 
            AND table_name = 'measurement'
        """))
        for row in result:
            print(f"- {row[0]}: {row[1]}")

if __name__ == "__main__":
    asyncio.run(inspect_columns())
