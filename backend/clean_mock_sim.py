import asyncio
from sqlalchemy import text
from app.db.session import engine

async def query():
    async with engine.begin() as conn:
        print("Checking SIM data before deletion...")
        res = await conn.execute(text("SELECT COUNT(*) FROM ts.measurement m JOIN ref.source s ON s.source_id=m.source_id WHERE s.code='SIM'"))
        count = res.scalar()
        print(f"Found {count} rows with source SIM")
        
        if count > 0:
            print("Deleting mock SIM data...")
            await conn.execute(text("DELETE FROM ts.measurement WHERE source_id IN (SELECT source_id FROM ref.source WHERE code='SIM')"))
            print("Deleted successfully. The map and graph will now correctly display empty for SIM data until populated.")
        else:
            print("No mock SIM data found.")

asyncio.run(query())
