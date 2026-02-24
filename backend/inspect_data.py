
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def inspect_data():
    async with engine.connect() as conn:
        print("\n--- Rows in ts.measurement by variable ---")
        try:
            result = await conn.execute(text("""
                SELECT variable_code, count(*) 
                FROM ts.measurement 
                GROUP BY variable_code
            """))
            for row in result:
                print(f"{row[0]}: {row[1]}")
        except Exception as e:
            print(f"Error querying ts.measurement: {e}")

if __name__ == "__main__":
    asyncio.run(inspect_data())
