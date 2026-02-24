import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# URL from .env (hardcoded for test based on user file)
DATABASE_URL = "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"

async def test_connection():
    print(f"Testing connection to: {DATABASE_URL}")
    try:
        engine = create_async_engine(DATABASE_URL, echo=True)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version()"))
            print(f"Connection Successful! Version: {result.scalar()}")
    except Exception as e:
        print(f"Connection FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_connection())
