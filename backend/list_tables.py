
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def list_tables():
    async with engine.connect() as conn:
        print("\n--- Tables in relevant schemas ---")
        result = await conn.execute(text("""
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name
        """))
        for row in result:
            print(f"{row.table_schema}.{row.table_name}")

if __name__ == "__main__":
    asyncio.run(list_tables())
