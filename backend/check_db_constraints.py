
import asyncio
from sqlalchemy import text
from app.db.session import async_session

async def check_fk():
    async with async_session() as session:
        print("Checking constraints on ts.measurement...")
        try:
            # Query to find FK constraints on ts.measurement
            query = text("""
                SELECT 
                    conname AS constraint_name, 
                    conrelid::regclass AS table_name, 
                    confrelid::regclass AS foreign_table_name,
                    pg_get_constraintdef(c.oid) as constraint_def
                FROM pg_constraint c
                JOIN pg_namespace n ON n.oid = c.connamespace
                WHERE n.nspname = 'ts' AND conrelid::regclass::text = 'ts.measurement'
                AND contype = 'f';
            """)
            
            result = await session.execute(query)
            rows = result.mappings().all()
            for row in rows:
                print(f"Constraint: {row['constraint_name']}")
                print(f"Definition: {row['constraint_def']}")
                
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.getcwd())
    asyncio.run(check_fk())
