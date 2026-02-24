"""
Trouver une station avec des données pour les tests
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def find_station_with_data():
    database_url = "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"
    
    engine = create_async_engine(database_url, echo=False)
    
    try:
        async with engine.connect() as conn:
            # Trouver une station avec des données precip_mm et source OBS
            result = await conn.execute(text("""
                SELECT 
                    station_id,
                    COUNT(*) as count
                FROM api.v_timeseries_station
                WHERE variable_code = 'precip_mm' AND source_code = 'OBS'
                GROUP BY station_id
                ORDER BY count DESC
                LIMIT 5
            """))
            
            print("Stations with precip_mm data (OBS):")
            for row in result.fetchall():
                print(f"  Station ID: {row[0]}, Count: {row[1]}")
                
                # Obtenir des exemples de données pour cette station
                sample_result = await conn.execute(text("""
                    SELECT time, value
                    FROM api.v_timeseries_station
                    WHERE station_id = :station_id 
                      AND variable_code = 'precip_mm' 
                      AND source_code = 'OBS'
                    ORDER BY time DESC
                    LIMIT 3
                """), {"station_id": row[0]})
                
                print(f"    Sample data:")
                for sample in sample_result.fetchall():
                    print(f"      {sample[0]}: {sample[1]}")
                print()
    
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(find_station_with_data())
