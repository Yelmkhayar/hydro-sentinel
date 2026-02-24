"""
Vérifier le format exact des station_id dans la base
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_uuid_format():
    database_url = "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"
    
    engine = create_async_engine(database_url, echo=False)
    
    try:
        async with engine.connect() as conn:
            # Obtenir quelques station_id pour vérifier le format
            result = await conn.execute(text("""
                SELECT DISTINCT station_id::text as sid
                FROM api.v_timeseries_station
                WHERE variable_code = 'precip_mm' AND source_code = 'OBS'
                LIMIT 5
            """))
            
            print("Station IDs with precip_mm data:")
            for row in result.fetchall():
                sid = row[0]
                print(f"  {sid} (length: {len(sid)})")
    
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_uuid_format())
