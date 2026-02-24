"""
Obtenir un station_id complet valide pour les tests
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def get_valid_station():
    database_url = "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"
    
    engine = create_async_engine(database_url, echo=False)
    
    try:
        async with engine.connect() as conn:
            # Obtenir une station avec des données precip_mm et source OBS
            result = await conn.execute(text("""
                SELECT DISTINCT station_id
                FROM api.v_timeseries_station
                WHERE variable_code = 'precip_mm' AND source_code = 'OBS'
                LIMIT 1
            """))
            
            row = result.fetchone()
            if row:
                station_id = str(row[0])
                print(f"Valid station ID: {station_id}")
                print(f"Length: {len(station_id)}")
                
                # Tester la requête compare avec ce station_id
                result2 = await conn.execute(text("""
                    SELECT COUNT(*)
                    FROM api.v_timeseries_station
                    WHERE station_id = :station_id 
                      AND variable_code = 'precip_mm'
                      AND source_code = 'OBS'
                """), {"station_id": station_id})
                
                count = result2.scalar()
                print(f"Data points for this station: {count}")
    
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(get_valid_station())
