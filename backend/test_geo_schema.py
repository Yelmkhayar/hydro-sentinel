"""
Quick test script to verify geo schema endpoint is working
"""
import requests

try:
    response = requests.get("http://localhost:8000/api/v1/admin/entities/stations")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ SUCCESS! Found {len(data)} stations")
        if data:
            print(f"First station: {data[0]}")
    else:
        print(f"❌ ERROR: {response.json()}")
        error_detail = response.json().get('detail', '')
        if 'ref.station' in error_detail:
            print("\n⚠️ PROBLEM: Backend is still using 'ref.station' instead of 'geo.station'")
            print("   Python module cache issue - backend needs hard restart")
        elif 'geo.station' in error_detail and "n'existe pas" in error_detail:
            print("\n⚠️ PROBLEM: Backend is using 'geo.station' but table doesn't exist")
            print("   Schema name might be wrong - check your database")
        
except Exception as e:
    print(f"Connection error: {e}")
