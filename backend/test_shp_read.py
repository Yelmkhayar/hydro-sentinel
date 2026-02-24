"""
Test if a shapefile needs companion files
"""
import geopandas as gpd
import sys

if len(sys.argv) < 2:
    print("Usage: python test_shp_read.py <path_to_shp>")
    sys.exit(1)

shp_path = sys.argv[1]

try:
    gdf = gpd.read_file(shp_path)
    print(f"✅ SUCCESS: Read {len(gdf)} features from {shp_path}")
    print(f"Columns: {list(gdf.columns)}")
except Exception as e:
    print(f"❌ ERROR: {e}")
    print("\nShapefiles typically require companion files:")
    print("  - .shp (the main file)")
    print("  - .shx (shape index)")
    print("  - .dbf (attribute database)")
    print("  - .prj (projection info - optional)")
