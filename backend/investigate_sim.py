import asyncio
from sqlalchemy import text
from app.db.session import engine

async def query():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT variable_code, source_code, COUNT(*) FROM api.v_latest GROUP BY variable_code, source_code"))
        print('--- v_latest sources ---')
        for row in res.fetchall():
            print(row)
            
        res2 = await conn.execute(text("SELECT * FROM api.v_map_points_kpi WHERE volume_sim_hm3 IS NOT NULL OR debit_sim_m3s IS NOT NULL LIMIT 5"))
        print('\n--- v_map_points_kpi sim data ---')
        for row in res2.fetchall():
            print(row)

asyncio.run(query())
