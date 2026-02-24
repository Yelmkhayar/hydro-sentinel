"""
Test de la requête compare
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_compare_query():
    database_url = "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"
    
    engine = create_async_engine(database_url, echo=False)
    
    try:
        async with engine.connect() as conn:
            station_id = "11a0def7-629c-430d-a601-70b13dc04094a"
            variable_code = "precip_mm"
            sources = "OBS"
            
            source_list = [s.strip() for s in sources.split(',')]
            source_placeholders = ','.join([f":source{i}" for i in range(len(source_list))])
            params = {"station_id": station_id, "variable": variable_code}
            for i, src in enumerate(source_list):
                params[f"source{i}"] = src
            
            print(f"Source placeholders: {source_placeholders}")
            print(f"Params: {params}")
            
            query = text(f"""
                SELECT 
                    source_code,
                    time as t,
                    value as y
                FROM api.v_timeseries_station
                WHERE station_id = :station_id 
                  AND variable_code = :variable
                  AND source_code IN ({source_placeholders})
                ORDER BY time ASC
                LIMIT 10
            """)
            
            print(f"\nQuery: {query}")
            
            result = await conn.execute(query, params)
            rows = result.fetchall()
            
            print(f"\nRows found: {len(rows)}")
            
            # Group by source
            grouped = {}
            for row in rows:
                source = row[0]
                time_val = row[1]
                y_val = row[2]
                
                if source not in grouped:
                    grouped[source] = []
                
                time_str = time_val.isoformat() if hasattr(time_val, 'isoformat') else str(time_val)
                grouped[source].append({"t": time_str, "y": float(y_val) if y_val is not None else None})
            
            print(f"\nGrouped data:")
            for source, data in grouped.items():
                print(f"  {source}: {len(data)} points")
                if data:
                    print(f"    First: {data[0]}")
    
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}")
        print(f"Message: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_compare_query())
