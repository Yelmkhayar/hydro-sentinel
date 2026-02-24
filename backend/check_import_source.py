
import sys
import os

# Add cwd to path explicitly to mimic uvicorn behavior?
sys.path.insert(0, os.getcwd())

try:
    import app.api.v1.endpoints.ts_management as ts
    with open("path.txt", "w") as f:
        f.write(ts.__file__)
    print(f"Written to path.txt")
except ImportError as e:
    print(f"Import Error: {e}")
