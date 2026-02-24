"""
Script simple pour vérifier quelles données sont disponibles dans la base
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_data():
    database_url = "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"
    
    engine = create_async_engine(database_url, echo=False)
    
    try:
        async with engine.connect() as conn:
            # Compter les lignes dans v_timeseries_station
            result = await conn.execute(text("SELECT COUNT(*) FROM api.v_timeseries_station"))
            count = result.scalar()
            print(f"Total rows in v_timeseries_station: {count}")
            
            # Obtenir les codes de variables distincts
            result = await conn.execute(text("SELECT DISTINCT variable_code FROM api.v_timeseries_station ORDER BY variable_code"))
            vars = [row[0] for row in result.fetchall()]
            print(f"\nVariable codes: {vars}")
            
            # Obtenir les codes sources distincts
            result = await conn.execute(text("SELECT DISTINCT source_code FROM api.v_timeseries_station ORDER BY source_code"))
            sources = [row[0] for row in result.fetchall()]
            print(f"\nSource codes: {sources}")
            
            # Obtenir quelques stations avec des données
            result = await conn.execute(text("""
                SELECT DISTINCT station_id 
                FROM api.v_timeseries_station 
                LIMIT 5
            """))
            stations = [row[0] for row in result.fetchall()]
            print(f"\nStations with data: {stations}")
            
            # Pour chaque station, afficher un exemple de données
            for station_id in stations[:2]:
                result = await conn.execute(text("""
                    SELECT variable_code, source_code, time, value
                    FROM api.v_timeseries_station
                    WHERE station_id = :station_id
                    LIMIT 3
                """), {"station_id": station_id})
                print(f"\nSample data for station {station_id}:")
                for row in result.fetchall():
                    print(f"  {row[0]} ({row[1]}): {row[3]} at {row[2]}")
    
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_data())
