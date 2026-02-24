import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath("c:\\dev\\detection_inondation\\hydro_sentinel\\backend"))

try:
    print("Attempting to import app.api.v1.endpoints.ts_management...")
    from app.api.v1.endpoints import ts_management
    print("✅ Import successful!")
    print(f"Router definition: {ts_management.router}")
except ImportError as e:
    print(f"❌ ImportError: {e}")
except Exception as e:
    print(f"❌ Exception: {e}")
