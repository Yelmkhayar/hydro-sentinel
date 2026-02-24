
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def verify_variables():
    async with engine.connect() as conn:
        print("\n--- Columns in ref.variable ---")
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'ref' 
            AND table_name = 'variable'
        """))
        rows = result.fetchall()
        for row in rows:
            print(f"- {row.column_name}: {row.data_type}")

if __name__ == "__main__":
    asyncio.run(verify_variables())
