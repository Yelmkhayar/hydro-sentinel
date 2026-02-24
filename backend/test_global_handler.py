
import urllib.request
import json
import socket

BASE_URL = "http://localhost:8000"

def test_endpoint(path, expect_error=False):
    url = f"{BASE_URL}{path}"
    print(f"Testing {url}...")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            body = response.read().decode('utf-8')
            print(f"Status: {status}")
            print(f"Body: {body}")
            if expect_error:
                print("FAILURE: Expected error, got success.")
            else:
                print("SUCCESS")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}")
        body = e.read().decode('utf-8')
        print(f"Body: {body}")
        if expect_error and e.code == 500:
            print("SUCCESS: Got expected 500 error.")
        else:
            print("FAILURE: Unexpected error code.")
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    print("--- Test 1: Global Ping ---")
    test_endpoint("/ping_global", expect_error=False)
    
    print("\n--- Test 2: Global Error ---")
    test_endpoint("/ping_error", expect_error=True)
