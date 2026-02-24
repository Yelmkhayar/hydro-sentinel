
import urllib.request
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"

def get_json(url):
    try:
        with urllib.request.urlopen(url) as response:
            if response.status != 200:
                print(f"Error: Status {response.status}", flush=True)
                return None
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode()}", flush=True)
        return None
    except Exception as e:
        print(f"Exception: {e}", flush=True)
        return None

def test_api():
    print(f"Testing API at {BASE_URL}")
    
    # 1. Get Stations for precip_mm
    print("\n[1] Fetching stations for 'precip_mm'...")
    url = f"{BASE_URL}/admin/timeseries/precip_mm"
    data = get_json(url)
    
    if not data:
        return

    stations = data.get("stations", [])
    print(f"Found {len(stations)} stations.")
    
    if not stations:
        print("No stations found. Cannot proceed.")
        return

    # Find "Ain Sebou" or pick the one with most measurments
    target_station = None
    for s in stations:
        if "Sebou" in s["name"]:
            target_station = s
            break
    
    if not target_station:
        target_station = max(stations, key=lambda x: x["data_count"])
        
    print(f"Targeting Station: {target_station['name']} (ID: {target_station['station_id']}, Count: {target_station['data_count']})", flush=True)
    
    # 2. Get Data for this station
    print(f"\n[2] Fetching data for station {target_station['station_id']}...", flush=True)
    url = f"{BASE_URL}/admin/timeseries/precip_mm/{target_station['station_id']}"
    try:
        ts_data = get_json(url)
        print(f"DEBUG: ts_data type: {type(ts_data)}", flush=True)
        if ts_data:
            data_points = ts_data.get("data", [])
            print(f"Received {len(data_points)} data points.", flush=True)
            if len(data_points) > 0:
                print(f"Sample: {data_points[0]}", flush=True)
                print(f"Last: {data_points[-1]}", flush=True)
            else:
                print("Data array is empty given the station has counts.", flush=True)
        else:
            print("ts_data is None or empty", flush=True)
            
    except Exception as e:
        print(f"CRITICAL EXCEPTION: {e}", flush=True)

    print("DONE", flush=True)

if __name__ == "__main__":
    test_api()
