
import urllib.request
import json
import sys

# Station ID for "Bge Al Wahda" or "Ain Sebou"
STATION_ID = "354d78fe-0ca8-46bd-a464-53955bbe1862"
VARIABLE_CODE = "precip_mm"
BASE_URL = "http://localhost:8000/api/v1"

def check_api():
    url = f"{BASE_URL}/admin/timeseries/{VARIABLE_CODE}/{STATION_ID}"
    print(f"Checking URL: {url}")
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            status = response.status
            print(f"Status Code: {status}")
            
            raw_data = response.read().decode('utf-8')
            print(f"Response Body Preview: {raw_data[:200]}")
            
            try:
                data = json.loads(raw_data)
                if "data" in data:
                    print(f"Data Points: {len(data['data'])}")
                    if len(data['data']) > 0:
                        print(f"Sample: {data['data'][0]}")
                else:
                    print("No 'data' key.")
            except json.JSONDecodeError:
                print("Failed to decode JSON")
                
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code}")
        print(f"Reason: {e.reason}")
        print(f"Body: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"General Error: {e}")

if __name__ == "__main__":
    check_api()
