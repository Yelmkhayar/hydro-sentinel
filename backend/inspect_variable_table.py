
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def inspect_table():
    async with engine.connect() as conn:
        print("\n--- ref.variable columns ---")
        result = await conn.execute(text("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_schema = 'ref' 
            AND table_name = 'variable'
        """))
        for row in result:
            print(f"- {row[0]}: {row[1]} ({row[2]})")

if __name__ == "__main__":
    asyncio.run(inspect_table())
