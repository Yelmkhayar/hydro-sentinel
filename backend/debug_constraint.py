
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def check_constraint():
    print("Connecting to DB...")
    # Ensure correct driver
    db_url = str(settings.DATABASE_URL).replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url)

    async with engine.connect() as conn:
        print("Fetching constraint definition...")
        result = await conn.execute(text("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'station_station_type_check';"))
        row = result.first()
        if row:
            const_def = row[0]
            print(f"Constraint Def (Raw): {const_def}")
            print(f"Constraint Def (Repr): {repr(const_def)}")
            
            # Check for 'Poste Pluviométrique'
            expected = "Poste Pluviométrique"
            if expected in const_def:
                print(f"✅ Found '{expected}' exactly in constraint.")
            else:
                print(f"❌ '{expected}' NOT found exactly. Checking variations...")
                # checking by bytes
                print(f"Expected bytes: {expected.encode('utf-8')}")
                
        else:
            print("❌ Constraint 'station_station_type_check' NOT FOUND.")

        # Also check column names logic simulation
        print("\n--- Simulating Column Logic ---")
        cols = ['OBJECTID_1', 'IRE', 'Type', 'type_statt', 'Nom']
        lower_cols = [c.lower() for c in cols]
        print(f"Lower cols: {lower_cols}")
        
        type_col = next((c for c in lower_cols if c in ['type', 'station_type', 'type_station', 'genre', 'type_statt']), None)
        print(f"Detected type_col: {type_col}")

if __name__ == "__main__":
    import sys
    # Add backend to path
    sys.path.append(os.getcwd())
    asyncio.run(check_constraint())
