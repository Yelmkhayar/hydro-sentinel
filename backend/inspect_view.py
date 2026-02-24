import asyncio
from sqlalchemy import text
from app.db.session import engine

async def inspect_view():
    async with engine.connect() as conn:
        print("\n--- v_map_points_kpi ---")
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'api' 
            AND table_name = 'v_map_points_kpi'
        """))
        for row in result:
            print(f"- {row[0]}: {row[1]}")

        print("\n--- v_station ---")
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'api' 
            AND table_name = 'v_station'
        """))
        for row in result:
            print(f"- {row[0]}: {row[1]}")

        print("\n--- v_basin ---")
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'api' 
            AND table_name = 'v_basin'
        """))
        for row in result:
            print(f"- {row[0]}: {row[1]}")

        print("\n--- v_ref_variable ---")
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'api' 
            AND table_name = 'v_ref_variable'
        """))
        for row in result:
            print(f"- {row[0]}: {row[1]}")

if __name__ == "__main__":
    asyncio.run(inspect_view())
