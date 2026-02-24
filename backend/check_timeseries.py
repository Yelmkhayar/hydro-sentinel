"""
Script pour vérifier les données disponibles dans la vue v_timeseries_station
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_timeseries_data():
    database_url = "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"
    
    print("Checking timeseries data...")
    print("-" * 80)
    
    test_engine = None
    try:
        test_engine = create_async_engine(
            database_url,
            echo=False,
            pool_pre_ping=True,
            pool_size=1,
            max_overflow=0
        )
        
        async with test_engine.connect() as conn:
            # Check if view exists
            view_check = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT 1 
                    FROM information_schema.tables 
                    WHERE table_schema = 'api' 
                    AND table_name = 'v_timeseries_station'
                )
            """))
            exists = view_check.scalar()
            print(f"View api.v_timeseries_station exists: {exists}")
            
            if not exists:
                print("\n❌ ERROR: View does not exist!")
                return
            
            # Count total rows
            count_result = await conn.execute(text("""
                SELECT COUNT(*) FROM api.v_timeseries_station
            """))
            total_count = count_result.scalar()
            print(f"\nTotal rows in v_timeseries_station: {total_count}")
            
            # Get distinct variable codes
            var_result = await conn.execute(text("""
                SELECT DISTINCT variable_code 
                FROM api.v_timeseries_station 
                ORDER BY variable_code
            """))
            variables = [row[0] for row in var_result.fetchall()]
            print(f"\nDistinct variable codes: {variables}")
            
            # Get distinct source codes
            source_result = await conn.execute(text("""
                SELECT DISTINCT source_code 
                FROM api.v_timeseries_station 
                ORDER BY source_code
            """))
            sources = [row[0] for row in source_result.fetchall()]
            print(f"\nDistinct source codes: {sources}")
            
            # Get sample data for a specific station
            station_id = "e02ce93a-cbe9-4441-a6bf-51de7fa01af0"
            sample_result = await conn.execute(text("""
                SELECT 
                    station_id,
                    variable_code,
                    source_code,
                    time,
                    value,
                    unit
                FROM api.v_timeseries_station
                WHERE station_id = :station_id
                LIMIT 5
            """), {"station_id": station_id})
            
            print(f"\nSample data for station {station_id}:")
            rows = sample_result.fetchall()
            if rows:
                for row in rows:
                    print(f"  {row[1]} ({row[2]}): {row[4]} {row[5]} at {row[3]}")
            else:
                print("  No data found for this station")
                
                # Try to find any station with data
                any_station_result = await conn.execute(text("""
                    SELECT DISTINCT station_id 
                    FROM api.v_timeseries_station 
                    LIMIT 5
                """))
                any_stations = [row[0] for row in any_station_result.fetchall()]
                print(f"\nStations with data: {any_stations}")
        
        print("\n" + "=" * 80)
        print("Check completed!")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}")
        print(f"Message: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        if test_engine is not None:
            await test_engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_timeseries_data())
