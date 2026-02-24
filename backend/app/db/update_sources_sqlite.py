import sqlite3
import os

DB_PATH = r"c:\dev\detection_inondation\hydro_sentinel\sql_app.db"

def update_sources():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("Connected to database.")
        
        # Check Tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print("Tables found:", tables)
        
        # Determine Source Table Name
        source_table = next((t for t in tables if 'source' in t and 'ref' in t), None)
        if not source_table:
             source_table = next((t for t in tables if 'source' in t), None)
        
        print(f"Using table: {source_table}")
        
        if not source_table:
            print("Could not find source table.")
            return

        # Update HEC_HMS -> SIM
        print(f"Checking for HEC_HMS in {source_table}...")
        try:
             cursor.execute(f"SELECT * FROM {source_table} WHERE code = 'HEC_HMS'")
             if cursor.fetchone():
                print("Renaming HEC_HMS to SIM...")
                cursor.execute(f"UPDATE {source_table} SET code = 'SIM', label = 'Simulé' WHERE code = 'HEC_HMS'")
             else:
                print("HEC_HMS not found. Checking SIM...")
                cursor.execute(f"SELECT * FROM {source_table} WHERE code = 'SIM'")
                if not cursor.fetchone():
                     print("Inserting SIM...")
                     try:
                        cursor.execute(f"INSERT INTO {source_table} (code, label) VALUES ('SIM', 'Simulé')")
                     except Exception as e:
                        print(f"Simple insert failed: {e}. Trying with UUID...")
                        import uuid
                        uid = str(uuid.uuid4())
                        # Check columns
                        cursor.execute(f"PRAGMA table_info({source_table})")
                        cols = [c[1] for c in cursor.fetchall()]
                        col_id = next((c for c in cols if 'id' in c), 'source_id')
                        cursor.execute(f"INSERT INTO {source_table} ({col_id}, code, label) VALUES (?, ?, ?)", (uid, 'SIM', 'Simulé'))

             # Ensure ABHS_RES
             cursor.execute(f"SELECT * FROM {source_table} WHERE code = 'ABHS_RES'")
             if not cursor.fetchone():
                 print("Inserting ABHS_RES...")
                 try:
                    cursor.execute(f"INSERT INTO {source_table} (code, label) VALUES ('ABHS_RES', 'Données ABH')")
                 except Exception as e:
                    import uuid
                    uid = str(uuid.uuid4())
                    cursor.execute(f"PRAGMA table_info({source_table})")
                    cols = [c[1] for c in cursor.fetchall()]
                    col_id = next((c for c in cols if 'id' in c), 'source_id')
                    cursor.execute(f"INSERT INTO {source_table} ({col_id}, code, label) VALUES (?, ?, ?)", (uid, 'ABHS_RES', 'Données ABH'))

             # Ensure AROME
             cursor.execute(f"SELECT * FROM {source_table} WHERE code = 'AROME'")
             if not cursor.fetchone():
                 print("Inserting AROME...")
                 try:
                    cursor.execute(f"INSERT INTO {source_table} (code, label) VALUES ('AROME', 'Prévision Arome')")
                 except Exception as e:
                    import uuid
                    uid = str(uuid.uuid4())
                    cursor.execute(f"PRAGMA table_info({source_table})")
                    cols = [c[1] for c in cursor.fetchall()]
                    col_id = next((c for c in cols if 'id' in c), 'source_id')
                    cursor.execute(f"INSERT INTO {source_table} ({col_id}, code, label) VALUES (?, ?, ?)", (uid, 'AROME', 'Prévision Arome'))
            
             # Ensure ECMWF
             cursor.execute(f"SELECT * FROM {source_table} WHERE code = 'ECMWF'")
             if not cursor.fetchone():
                 print("Inserting ECMWF...")
                 try:
                    cursor.execute(f"INSERT INTO {source_table} (code, label) VALUES ('ECMWF', 'Prévision ECMWF')")
                 except Exception as e:
                    import uuid
                    uid = str(uuid.uuid4())
                    cursor.execute(f"PRAGMA table_info({source_table})")
                    cols = [c[1] for c in cursor.fetchall()]
                    col_id = next((c for c in cols if 'id' in c), 'source_id')
                    cursor.execute(f"INSERT INTO {source_table} ({col_id}, code, label) VALUES (?, ?, ?)", (uid, 'ECMWF', 'Prévision ECMWF'))
        
        except Exception as e:
            print(f"Error executing SQL: {e}")

        conn.commit()
        print("Updates committed.")

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    update_sources()
