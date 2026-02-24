"""
Test d'accès aux colonnes avec SQLAlchemy text queries
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_row_access():
    database_url = "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"
    
    engine = create_async_engine(database_url, echo=False)
    
    try:
        async with engine.connect() as conn:
            query = text("""
                SELECT 
                    station_id,
                    variable_code,
                    source_code,
                    time,
                    value
                FROM api.v_timeseries_station
                WHERE variable_code = 'precip_mm' AND source_code = 'OBS'
                LIMIT 1
            """)
            
            result = await conn.execute(query)
            rows = result.fetchall()
            
            if rows:
                row = rows[0]
                print(f"Row type: {type(row)}")
                print(f"Row: {row}")
                print(f"\nAccess methods:")
                print(f"  row[0]: {row[0]}")
                print(f"  row[1]: {row[1]}")
                print(f"  row[2]: {row[2]}")
                print(f"  row[3]: {row[3]}")
                print(f"  row[4]: {row[4]}")
                
                # Test attribute access
                try:
                    print(f"\n  row.station_id: {row.station_id}")
                except Exception as e:
                    print(f"\n  row.station_id failed: {e}")
                    
                # Test _mapping access
                try:
                    print(f"\n  row._mapping['station_id']: {row._mapping['station_id']}")
                except Exception as e:
                    print(f"\n  row._mapping failed: {e}")
    
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_row_access())
