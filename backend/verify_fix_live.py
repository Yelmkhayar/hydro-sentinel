
import urllib.request
import json
import socket

# "Ain Sebou" ID
STATION_ID = "354d78fe-0ca8-46bd-a464-53955bbe1862"
VARIABLE_CODE = "precip_mm"
BASE_URL = "http://localhost:8000/api/v1"

def verify_live():
    url = f"{BASE_URL}/admin/timeseries/{VARIABLE_CODE}/{STATION_ID}"
    print(f"Target: {url}")
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            print(f"Status: {status}")
            
            body = response.read().decode('utf-8')
            try:
                data = json.loads(body)
                print("JSON Decode: OK")
                
                if "data" in data:
                    count = len(data["data"])
                    print(f"Count: {count}")
                    if count > 0:
                        first = data["data"][0]
                        print(f"First Point: {first}")
                        # Check timestamp format
                        print(f"Timestamp Key: {'timestamp' in first}")
                        print(f"Value Key: {'value' in first}")
                else:
                    print("ERROR: No 'data' key in response")
                    print(f"Keys: {data.keys()}")
                    
            except json.JSONDecodeError:
                print(f"Invalid JSON: {body[:200]}")
                
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        print(f"Body: {e.read().decode('utf-8')[:500]}")
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    verify_live()
