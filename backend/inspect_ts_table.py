
import asyncio
from sqlalchemy import text
from app.db.session import async_session
from app.core.config import settings

async def inspect():
    async with async_session() as session:
        print("Inspecting ts.measurement columns...")
        try:
            result = await session.execute(text("SELECT * FROM ts.measurement LIMIT 1"))
            print("Columns:", result.keys())
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.getcwd())
    asyncio.run(inspect())
