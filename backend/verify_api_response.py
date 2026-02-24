
import urllib.request
import json
import sys

# Station ID for "Bge Al Wahda" or "Ain Sebou" (from user screenshots or previous grep)
# Step 2470 showed Ain Sebou ID: 354d78fe-0ca8-46bd-a464-53955bbe1862
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
            
            raw_data = response.read()
            try:
                data = json.loads(raw_data)
                print("JSON Decode Success.")
                
                if "data" in data:
                    count = len(data["data"])
                    print(f"Data Points Returned: {count}")
                    if count > 0:
                        print(f"First Point: {data['data'][0]}")
                else:
                    print("No 'data' key in response.")
                    print(f"Keys: {data.keys()}")
                    
            except json.JSONDecodeError:
                print(f"Failed to decode JSON. Raw output:\n{raw_data.decode()}")
                
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code}")
        print(f"Reason: {e.reason}")
        print(f"Body: {e.read().decode()}")
    except Exception as e:
        print(f"General Error: {e}")

if __name__ == "__main__":
    check_api()
