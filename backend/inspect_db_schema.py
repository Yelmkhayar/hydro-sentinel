
import asyncio
from sqlalchemy import create_engine, text, inspect
import os

# Use sync driver for inspection script simplicity
DATABASE_URL = "postgresql://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"

def inspect_schema():
    try:
        engine = create_engine(DATABASE_URL)
        inspector = inspect(engine)
        
        print("\n--- Columns in ts.measurement ---")
        if inspector.has_table("measurement", schema="ts"):
            columns = inspector.get_columns("measurement", schema="ts")
            for col in columns:
                print(f"- {col['name']}: {col['type']}")
        else:
            print("Table ts.measurement does not exist!")

        # Also check data in the table to see content
        print("\n--- Data in ts.measurement ---")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM ts.measurement LIMIT 1"))
            keys = result.keys()
            print(f"Columns: {keys}")
            for row in result:
                print(row)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_schema()
