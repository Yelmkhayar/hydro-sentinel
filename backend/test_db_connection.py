"""
Test direct de connexion à la base de données PostgreSQL
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_connection():
    database_url = "postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db"
    
    print(f"Testing connection to: {database_url}")
    print("-" * 60)
    
    test_engine = None
    try:
        # Create engine
        test_engine = create_async_engine(
            database_url,
            echo=False,
            pool_pre_ping=True,
            pool_size=1,
            max_overflow=0
        )
        
        print("✓ Engine created successfully")
        
        # Test connection
        async with test_engine.connect() as conn:
            print("✓ Connection established")
            
            # Get version
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✓ Database version: {version[:50]}...")
            
            # Check schemas
            schema_check = await conn.execute(text("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name IN ('api', 'auth', 'geo', 'ref', 'ts')
                ORDER BY schema_name
            """))
            schemas = [row[0] for row in schema_check.fetchall()]
            print(f"✓ Found schemas: {schemas}")
            
            # Check views
            view_check = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'api' 
                AND table_type = 'VIEW'
                ORDER BY table_name
                LIMIT 10
            """))
            views = [row[0] for row in view_check.fetchall()]
            print(f"✓ Found views in 'api' schema: {views}")
        
        print("\n" + "=" * 60)
        print("SUCCESS: Connection test passed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}")
        print(f"Message: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        if test_engine is not None:
            await test_engine.dispose()
            print("\n✓ Engine disposed")

if __name__ == "__main__":
    asyncio.run(test_connection())
