import asyncio
import json
from app.db.session import engine
from sqlalchemy import text

async def debug_db():
    async with engine.connect() as conn:
        print("--- BASIN BOUNDING BOX ---")
        try:
            res = await conn.execute(text("SELECT ST_Extent(geom) FROM geo.basin"))
            print(f"BBOX: {res.scalar()}")
        except Exception as e:
            print(f"Error: {e}")
            
        print("\n--- TEST: IF THESE WERE 26191 BUT DIVIDED BY 100,000 (with offset?) ---")
        # Lambert North Center is X=500000, Y=300000
        # If we have X=-2.3, maybe it's X_meters = (X_val * 100000) + ?
        pass

if __name__ == "__main__":
    asyncio.run(debug_db())
