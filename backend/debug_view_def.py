
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def get_view_definition():
   try:
    async with engine.connect() as conn:
        print("Checking for VIEW definition in pg_views...")
        result = await conn.execute(text("SELECT definition FROM pg_views WHERE schemaname = 'api' AND viewname = 'v_ref_variable';"))
        row = result.fetchone()
        if row:
            print(f"View Definition: {row[0]}")
        else:
            print("View NOT found in pg_views. Checking if it's a TABLE...")
            # Check if it is a table
            result_table = await conn.execute(text("SELECT * FROM information_schema.tables WHERE table_schema = 'api' AND table_name = 'v_ref_variable';"))
            if result_table.fetchone():
               print("It is a TABLE.")
            else:
               print("Not found as view or table.")
   except Exception as e:
       print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(get_view_definition())
