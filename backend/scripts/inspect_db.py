import asyncio
import os
import sys

# Add backend to path so imports work
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as session:
        print("--- Tables in ts schema ---")
        result = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'ts'"))
        for row in result.fetchall():
            print(f"- {row[0]}")
            
        print("\n--- Columns in ts.measurement ---")
        try:
            res = await session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='ts' AND table_name='measurement'"))
            for c in res.fetchall():
                print(f"  {c[0]} ({c[1]})")
        except Exception as e:
            print(e)
            
        print("\n--- Columns in ts.basin_measurement ---")
        try:
            res = await session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='ts' AND table_name='basin_measurement'"))
            for c in res.fetchall():
                print(f"  {c[0]} ({c[1]})")
        except Exception as e:
            print(e)

if __name__ == '__main__':
    asyncio.run(main())
