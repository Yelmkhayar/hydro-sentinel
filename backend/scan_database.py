"""
Database Schema Scanner
Scans the entire PostgreSQL database to map all schemas, tables, columns, and relationships.
This helps avoid mapping issues by providing a complete view of the database structure.
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
import json
from datetime import datetime

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost/app_inondation_db"

async def scan_database():
    """Scan the entire database structure"""
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    results = {
        "scan_date": datetime.now().isoformat(),
        "schemas": {}
    }
    
    async with engine.begin() as conn:
        # 1. Get all schemas (excluding system schemas)
        schemas_query = text("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
            ORDER BY schema_name
        """)
        schemas_result = await conn.execute(schemas_query)
        schemas = [row[0] for row in schemas_result]
        
        print(f"\n{'='*80}")
        print(f"DATABASE STRUCTURE SCAN")
        print(f"{'='*80}")
        print(f"\nFound {len(schemas)} schemas: {', '.join(schemas)}\n")
        
        # 2. For each schema, get tables and their details
        for schema in schemas:
            print(f"\n📂 Schema: {schema}")
            print(f"{'-'*80}")
            
            results["schemas"][schema] = {"tables": {}}
            
            # Get tables in this schema
            tables_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = :schema AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            tables_result = await conn.execute(tables_query, {"schema": schema})
            tables = [row[0] for row in tables_result]
            
            print(f"  Tables ({len(tables)}): {', '.join(tables) if tables else 'None'}")
            
            # 3. For each table, get columns
            for table in tables:
                print(f"\n  📋 Table: {schema}.{table}")
                
                columns_query = text("""
                    SELECT 
                        column_name, 
                        data_type, 
                        is_nullable,
                        column_default
                    FROM information_schema.columns 
                    WHERE table_schema = :schema AND table_name = :table
                    ORDER BY ordinal_position
                """)
                columns_result = await conn.execute(columns_query, {"schema": schema, "table": table})
                columns = []
                
                for col in columns_result:
                    col_info = {
                        "name": col[0],
                        "type": col[1],
                        "nullable": col[2] == 'YES',
                        "default": col[3]
                    }
                    columns.append(col_info)
                    nullable = "NULL" if col_info["nullable"] else "NOT NULL"
                    print(f"    - {col_info['name']:<30} {col_info['type']:<20} {nullable}")
                
                # Get primary keys
                pk_query = text("""
                    SELECT a.attname
                    FROM pg_index i
                    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                    WHERE i.indrelid = :table_oid::regclass AND i.indisprimary
                """)
                pk_result = await conn.execute(pk_query, {"table_oid": f"{schema}.{table}"})
                primary_keys = [row[0] for row in pk_result]
                
                # Get foreign keys
                fk_query = text("""
                    SELECT
                        kcu.column_name,
                        ccu.table_schema AS foreign_table_schema,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY' 
                      AND tc.table_schema = :schema 
                      AND tc.table_name = :table
                """)
                fk_result = await conn.execute(fk_query, {"schema": schema, "table": table})
                foreign_keys = []
                
                for fk in fk_result:
                    fk_info = {
                        "column": fk[0],
                        "references": f"{fk[1]}.{fk[2]}.{fk[3]}"
                    }
                    foreign_keys.append(fk_info)
                    print(f"    🔗 FK: {fk_info['column']} -> {fk_info['references']}")
                
                # Get row count
                try:
                    count_query = text(f'SELECT COUNT(*) FROM "{schema}"."{table}"')
                    count_result = await conn.execute(count_query)
                    row_count = count_result.scalar()
                    print(f"    📊 Rows: {row_count:,}")
                except Exception as e:
                    row_count = "Error"
                    print(f"    📊 Rows: Could not count ({str(e)[:50]})")
                
                # Store in results
                results["schemas"][schema]["tables"][table] = {
                    "columns": columns,
                    "primary_keys": primary_keys,
                    "foreign_keys": foreign_keys,
                    "row_count": row_count
                }
    
    # 4. Save to JSON file
    output_file = "database_schema_map.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*80}")
    print(f"✅ Database scan complete!")
    print(f"📄 Full schema saved to: {output_file}")
    print(f"{'='*80}\n")
    
    await engine.dispose()
    return results

if __name__ == "__main__":
    asyncio.run(scan_database())
