
import asyncio
from sqlalchemy import text
from app.db.session import engine
import sys
import traceback

STATION_ID = "354d78fe-0ca8-46bd-a464-53955bbe1862"
VARIABLE_CODE = "precip_mm"

async def debug_query():
    print(f"Connecting to DB...")
    try:
        async with engine.connect() as conn:
            print("Connected.")
            
            # The query from ts_management.py (full version)
            query_str = """
            SELECT 
                m.time as timestamp,
                m.value,
                m.qc_flag as quality_flag,
                v.code as variable_code,
                v.label as variable_name,
                v.unit
            FROM ts.measurement m
            INNER JOIN ref.variable v ON m.variable_id = v.variable_id
            WHERE m.station_id = CAST(:station_id AS uuid) 
            AND v.code = :variable_code
            ORDER BY m.time DESC LIMIT 1000
            """
            
            print("Executing query...")
            params = {
                "station_id": STATION_ID,
                "variable_code": VARIABLE_CODE
            }
            
            result = await conn.execute(text(query_str), params)
            rows = result.mappings().all()
            print(f"Success! Got {len(rows)} rows.")
            if rows:
                print(f"Sample: {rows[0]}")
                
    except Exception as e:
        print("\n--- EXCEPTION TRACEBACK ---")
        traceback.print_exc()
        print(f"\nError: {e}")

if __name__ == "__main__":
    asyncio.run(debug_query())
