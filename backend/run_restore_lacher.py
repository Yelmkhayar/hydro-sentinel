
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def run_sql_file():
    with open("restore_lacher.sql", "r", encoding="utf-8") as f:
        sql = f.read()
    
    print("Executing SQL from backend/restore_lacher.sql...")
    async with engine.begin() as conn:
        await conn.execute(text(sql))
    print("Execution complete.")

if __name__ == "__main__":
    asyncio.run(run_sql_file())
