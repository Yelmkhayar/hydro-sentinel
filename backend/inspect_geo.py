
import asyncio
from sqlalchemy import text
from app.db.session import async_session

async def inspect_geo():
    async with async_session() as session:
        print("Inspecting geo.station...")
        result = await session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'geo' AND table_name = 'station'"))
        for row in result:
            print(f"STATION: {row[0]} ({row[1]})")

        print("\nInspecting geo.basin...")
        result = await session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'geo' AND table_name = 'basin'"))
        for row in result:
            print(f"BASIN: {row[0]} ({row[1]})")

if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.getcwd())
    asyncio.run(inspect_geo())
