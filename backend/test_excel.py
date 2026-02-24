
import urllib.request
import sys
import zipfile
import io

try:
    url = "http://localhost:8001/api/v1/admin/templates/simple"
    print(f"Downloading from {url}...")
    
    with urllib.request.urlopen(url) as response:
        content = response.read()
        print(f"Status Code: {response.status}")
        print(f"Headers: {response.headers}")
        
        filename = "downloaded_template.xlsx"
        with open(filename, "wb") as f:
            f.write(content)
            
        print(f"Downloaded {filename} ({len(content)} bytes)")
        
        # Check first bytes
        print("First 20 bytes (hex):", content[:20].hex())
        
        # Try opening as ZIP
        try:
            with zipfile.ZipFile(io.BytesIO(content), 'r') as z:
                print("SUCCESS: File is a valid ZIP/XLSX structure")
                print(f"Contains {len(z.namelist())} files inside")
        except zipfile.BadZipFile:
            print("ERROR: File is NOT a valid ZIP/XLSX.")
            print("Content starts with:", content[:100])
            
except Exception as e:
    print(f"Error: {e}")
