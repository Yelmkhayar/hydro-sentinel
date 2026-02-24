
import urllib.request
import json

BASE_URL = "http://localhost:8000/api/v1"
STATION_ID = "354d78fe-0ca8-46bd-a464-53955bbe1862"
VARIABLE_CODE = "precip_mm"

def hit_endpoints():
    # 1. Hit List
    print("Hitting List Endpoint...")
    try:
        url = f"{BASE_URL}/admin/timeseries/{VARIABLE_CODE}"
        with urllib.request.urlopen(url) as response:
            print(f"List Endpoint Response: {response.read().decode('utf-8')}")
        print("List Endpoint: OK")
    except Exception as e:
        print(f"List Endpoint Failed: {e}")

    # 2. Hit Data
    print("Hitting Data Endpoint...")
    try:
        url = f"{BASE_URL}/admin/timeseries/{VARIABLE_CODE}/{STATION_ID}"
        urllib.request.urlopen(url)
        print("Data Endpoint: OK")
    except Exception as e:
        print(f"Data Endpoint Failed: {e}")

if __name__ == "__main__":
    hit_endpoints()
