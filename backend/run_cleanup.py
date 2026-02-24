
import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

from pathlib import Path

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_cleanup():
    logger.info("Starting variable cleanup...")
    # Use direct DB connection from settings
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    # helper to find sql file
    here = Path(__file__).parent
    sql_file = here / "cleanup_force.sql"
    
    try:
        # 1. Renaming
        async with engine.begin() as conn:
            logger.info("1. Renaming codes...")
            await conn.execute(text("UPDATE ref.variable SET code = 'flow_m3s' WHERE code = 'debit_m3s'"))
            await conn.execute(text("UPDATE ref.variable SET code = 'inflow_m3s' WHERE code = 'apport_m3s'"))
            
        # 2. Cleaning up data (separate tx)
        try:
            async with engine.begin() as conn:
                 logger.info("2. Cleaning up unused data in ts.measurement...")
                 # Delete using subquery matching variable_id to code
                 await conn.execute(text("""
                    DELETE FROM ts.measurement 
                    WHERE variable_id IN (
                        SELECT variable_id FROM ref.variable 
                        WHERE code NOT IN ('precip_mm', 'flow_m3s', 'inflow_m3s', 'volume_hm3')
                    )
                 """))
        except Exception as e:
             logger.warning(f"Could not delete from ts.measurement: {e}")

        # 3. Main cleanup
        async with engine.begin() as conn:
            logger.info("3. Deleting unused variables...")
            await conn.execute(text("DELETE FROM ref.variable WHERE code NOT IN ('precip_mm', 'flow_m3s', 'inflow_m3s', 'volume_hm3')"))

            logger.info("4. Upserting definitions...")
            await conn.execute(text("""
                INSERT INTO ref.variable (code, label, unit, description)
                VALUES 
                    ('precip_mm', 'Pluie', 'mm', 'Pluie (H/J)'),
                    ('flow_m3s', 'Débit', 'm3/s', 'Débit (H/J)'),
                    ('inflow_m3s', 'Apports', 'm3/s', 'Apport (H/J)'),
                    ('volume_hm3', 'Volume', 'hm3', 'Vol. (H/J)')
                ON CONFLICT (code) DO UPDATE SET
                    label = EXCLUDED.label,
                    unit = EXCLUDED.unit,
                    description = EXCLUDED.description
            """))

        logger.info("✅ Cleanup executed successfully.")

    except Exception as e:
        logger.error(f"❌ Error executing cleanup: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_cleanup())
