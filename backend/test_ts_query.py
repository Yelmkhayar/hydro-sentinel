
import asyncio
from sqlalchemy import text
from app.db.session import async_session

async def test_query():
    async with async_session() as session:
        print("Testing TS query...")
        try:
            variable_code = "precip_mm"
            station_id = "5be54f01-7b28-44ff-a7e2-14067d3e37e2"
            
            query = text("""
            SELECT 
                m.timestamp,
                m.value,
                m.quality_flag,
                v.code as variable_code,
                v.name as variable_name,
                v.unit
            FROM ts.measurement m
            INNER JOIN ref.variable v ON m.variable_id = v.variable_id
            WHERE m.station_id = :station_id 
            AND v.code = :variable_code
            ORDER BY m.timestamp DESC LIMIT 10
            """)
            
            result = await session.execute(query, {
                "station_id": station_id, 
                "variable_code": variable_code
            })
            rows = result.mappings().all()
            print(f"Rows found: {len(rows)}")
            for row in rows:
                print(row)
                
        except Exception as e:
            print("ERROR DETAILS:")
            print(e)

if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.getcwd())
    asyncio.run(test_query())
