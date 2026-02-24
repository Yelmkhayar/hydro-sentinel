
import os
import shutil

ROOT_DIR = "."

def clear_pycache(start_dir):
    count = 0
    for root, dirs, files in os.walk(start_dir):
        if "__pycache__" in dirs:
            path = os.path.join(root, "__pycache__")
            print(f"Removing {path}")
            try:
                shutil.rmtree(path)
                count += 1
            except Exception as e:
                print(f"Failed to remove {path}: {e}")
        # Also remove .pyc files if loose? Not typical but possible.
    print(f"Removed {count} __pycache__ directories.")

if __name__ == "__main__":
    clear_pycache(ROOT_DIR)
