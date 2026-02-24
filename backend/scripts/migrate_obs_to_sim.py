import asyncio
import os
import sys

# Add backend to path so imports work
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def main():
    print("Starting migration OBS -> SIM...")
    async with AsyncSessionLocal() as db:
        var_codes = ['flow_m3s', 'inflow_m3s', 'volume_hm3', 'lacher_m3s']
        v_codes_str = "', '".join(var_codes)
        
        try:
            update_sql = text(f"""
                UPDATE ts.measurement
                SET source_id = (SELECT source_id FROM ref.source WHERE code = 'SIM')
                WHERE source_id = (SELECT source_id FROM ref.source WHERE code = 'OBS')
                AND variable_id IN (SELECT variable_id FROM ref.variable WHERE code IN ('{v_codes_str}'))
            """)
            result = await db.execute(update_sql)
            await db.commit()
            print(f"Successfully updated {result.rowcount} rows from OBS to SIM.")
        except Exception as e:
            print(f"Migration failed: {e}")
            
if __name__ == '__main__':
    asyncio.run(main())
