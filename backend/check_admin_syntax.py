
try:
    print("Checking admin.py syntax...")
    import app.api.v1.endpoints.admin
    print("Syntax OK")
except Exception as e:
    print(f"Error: {e}")
except SystemExit:
    print("SystemExit")
