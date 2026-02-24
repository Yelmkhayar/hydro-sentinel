import asyncio
import logging
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def update_sources():
    async with AsyncSessionLocal() as db:
        try:
            # 1. Update HEC_HMS to SIM
            logger.info("Checking for HEC_HMS source...")
            result = await db.execute(text("SELECT source_id FROM ref.source WHERE code = 'HEC_HMS'"))
            hec_row = result.first()
            
            if hec_row:
                logger.info("Renaming HEC_HMS to SIM...")
                await db.execute(text("UPDATE ref.source SET code = 'SIM', label = 'Simulé' WHERE code = 'HEC_HMS'"))
            else:
                logger.info("HEC_HMS not found. Checking if SIM exists...")
                result = await db.execute(text("SELECT source_id FROM ref.source WHERE code = 'SIM'"))
                sim_row = result.first()
                if not sim_row:
                    logger.info("Creating SIM source...")
                    await db.execute(text("INSERT INTO ref.source (code, label) VALUES ('SIM', 'Simulé')"))

            # 2. Ensure ABHS_RES exists
            logger.info("Checking for ABHS_RES source...")
            result = await db.execute(text("SELECT source_id FROM ref.source WHERE code = 'ABHS_RES'"))
            if not result.first():
                 logger.info("Creating ABHS_RES source...")
                 await db.execute(text("INSERT INTO ref.source (code, label) VALUES ('ABHS_RES', 'Données ABH')"))

            # 3. Ensure AROME and ECMWF exist
            for code, label in [('AROME', 'Prévision Arome'), ('ECMWF', 'Prévision ECMWF')]:
                result = await db.execute(text(f"SELECT source_id FROM ref.source WHERE code = '{code}'"))
                if not result.first():
                     logger.info(f"Creating {code} source...")
                     await db.execute(text(f"INSERT INTO ref.source (code, label) VALUES ('{code}', '{label}')"))
            
            # 4. Update measurements if they used Source Code denormalization (unlikely in normalizd DB but good to check if we rely on IDs)
            # The view api.v_timeseries_station joins on source_id, so updating ref.source is sufficient.
            
            await db.commit()
            logger.info("Sources updated successfully.")
            
        except Exception as e:
            logger.error(f"Error updating sources: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(update_sources())
