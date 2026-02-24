"""
Script pour vérifier la structure de la vue v_timeseries_station
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check_view_structure():
    database_url = "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"
    
    print("Checking view structure...")
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
            # Get column information
            columns_result = await conn.execute(text("""
                SELECT 
                    column_name,
                    data_type,
                    is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'api' 
                AND table_name = 'v_timeseries_station'
                ORDER BY ordinal_position
            """))
            
            print("\nColumns in api.v_timeseries_station:")
            columns = columns_result.fetchall()
            for col in columns:
                print(f"  - {col[0]}: {col[1]} (nullable: {col[2]})")
            
            # Get sample data
            print("\nSample data (first row):")
            sample_result = await conn.execute(text("""
                SELECT * FROM api.v_timeseries_station LIMIT 1
            """))
            
            row = sample_result.fetchone()
            if row:
                for i, col in enumerate(columns):
                    print(f"  {col[0]}: {row[i]}")
            else:
                print("  No data found")
        
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
    asyncio.run(check_view_structure())
