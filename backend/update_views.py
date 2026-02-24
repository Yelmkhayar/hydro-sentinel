import asyncio
from sqlalchemy import text
from app.db.session import engine

async def update_views():
    async with engine.begin() as conn:
        print("Dropping views CASCADE...")
        await conn.execute(text("DROP VIEW IF EXISTS api.v_map_points_kpi CASCADE;"))
        await conn.execute(text("DROP VIEW IF EXISTS api.v_top_critical_24h CASCADE;"))
        await conn.execute(text("DROP VIEW IF EXISTS api.v_latest_station_pivot CASCADE;"))
        
        print("Recreating v_latest_station_pivot...")
        await conn.execute(text("""
        CREATE VIEW api.v_latest_station_pivot AS
        WITH l AS (
            SELECT v_latest.entity_type,
                v_latest.entity_id,
                v_latest.entity_code,
                v_latest.entity_name,
                v_latest.entity_subtype,
                v_latest.basin_id,
                v_latest.basin_code,
                v_latest.basin_name,
                v_latest.variable_code,
                v_latest.variable_label,
                v_latest.variable_unit,
                v_latest.source_code,
                v_latest.source_label,
                v_latest.run_id,
                v_latest.run_time,
                v_latest.model_name,
                v_latest.horizon_hours,
                v_latest.value_time,
                v_latest.value,
                v_latest.qc_flag
            FROM api.v_latest
            WHERE (v_latest.entity_type = 'station'::text)
        )
        SELECT st.station_id,
            st.station_code,
            st.station_name,
            st.station_type,
            st.basin_id,
            st.basin_code,
            st.basin_name,
            max(l.value) FILTER (WHERE ((l.variable_code = 'precip_mm'::text) AND (l.source_code = 'OBS'::text))) AS precip_obs_mm,
            max(l.value_time) FILTER (WHERE ((l.variable_code = 'precip_mm'::text) AND (l.source_code = 'OBS'::text))) AS precip_obs_time,
            max(l.value) FILTER (WHERE ((l.variable_code = 'precip_mm'::text) AND (l.source_code = 'AROME'::text))) AS precip_arome_mm,
            max(l.value_time) FILTER (WHERE ((l.variable_code = 'precip_mm'::text) AND (l.source_code = 'AROME'::text))) AS precip_arome_time,
            max(l.run_time) FILTER (WHERE ((l.variable_code = 'precip_mm'::text) AND (l.source_code = 'AROME'::text))) AS precip_arome_run_time,
            max(l.value) FILTER (WHERE ((l.variable_code = 'precip_mm'::text) AND (l.source_code = 'ECMWF'::text))) AS precip_ecmwf_mm,
            max(l.value_time) FILTER (WHERE ((l.variable_code = 'precip_mm'::text) AND (l.source_code = 'ECMWF'::text))) AS precip_ecmwf_time,
            max(l.run_time) FILTER (WHERE ((l.variable_code = 'precip_mm'::text) AND (l.source_code = 'ECMWF'::text))) AS precip_ecmwf_run_time,
            max(l.value) FILTER (WHERE ((l.variable_code = 'debit_m3s'::text) AND (l.source_code = 'OBS'::text))) AS debit_obs_m3s,
            max(l.value_time) FILTER (WHERE ((l.variable_code = 'debit_m3s'::text) AND (l.source_code = 'OBS'::text))) AS debit_obs_time,
            max(l.value) FILTER (WHERE ((l.variable_code = 'debit_m3s'::text) AND (l.source_code = 'SIM'::text))) AS debit_sim_m3s,
            max(l.value_time) FILTER (WHERE ((l.variable_code = 'debit_m3s'::text) AND (l.source_code = 'SIM'::text))) AS debit_sim_time,
            max(l.value) FILTER (WHERE ((l.variable_code = 'debit_m3s'::text) AND (l.source_code = 'ABHS_RES'::text))) AS debit_res_m3s,
            max(l.value_time) FILTER (WHERE ((l.variable_code = 'debit_m3s'::text) AND (l.source_code = 'ABHS_RES'::text))) AS debit_res_time,
            max(l.run_time) FILTER (WHERE ((l.variable_code = 'debit_m3s'::text) AND (l.source_code = 'ABHS_RES'::text))) AS debit_res_run_time,
            max(l.value) FILTER (WHERE (l.variable_code = 'apport_m3s'::text)) AS apport_m3s_latest,
            max(l.value_time) FILTER (WHERE (l.variable_code = 'apport_m3s'::text)) AS apport_m3s_time,
            max(l.value) FILTER (WHERE (l.variable_code = 'lacher_m3s'::text)) AS lacher_m3s_latest,
            max(l.value_time) FILTER (WHERE (l.variable_code = 'lacher_m3s'::text)) AS lacher_m3s_time,
            max(l.value) FILTER (WHERE (l.variable_code = 'volume_hm3'::text AND (l.source_code = 'OBS'::text OR l.source_code IS NULL))) AS volume_obs_hm3,
            max(l.value) FILTER (WHERE (l.variable_code = 'volume_hm3'::text AND l.source_code = 'SIM'::text)) AS volume_sim_hm3,
            max(l.value) FILTER (WHERE (l.variable_code = 'volume_hm3'::text)) AS volume_hm3_latest,
            max(l.value_time) FILTER (WHERE (l.variable_code = 'volume_hm3'::text)) AS volume_hm3_time,
            max(l.value) FILTER (WHERE (l.variable_code = 'volume_mm3'::text)) AS volume_mm3_latest,
            max(l.value_time) FILTER (WHERE (l.variable_code = 'volume_mm3'::text)) AS volume_mm3_time,
            max(l.value) FILTER (WHERE (l.variable_code = 'volume_abhs_hm3'::text)) AS volume_abhs_hm3_latest,
            max(l.value_time) FILTER (WHERE (l.variable_code = 'volume_abhs_hm3'::text)) AS volume_abhs_hm3_time,
            max(l.value) FILTER (WHERE (l.variable_code = 'volume_alt_hm3'::text)) AS volume_alt_hm3_latest,
            max(l.value_time) FILTER (WHERE (l.variable_code = 'volume_alt_hm3'::text)) AS volume_alt_hm3_time
        FROM (api.v_station st
            LEFT JOIN l l ON ((l.entity_id = st.station_id)))
        GROUP BY st.station_id, st.station_code, st.station_name, st.station_type, st.basin_id, st.basin_code, st.basin_name;
        """))

        print("Recreating v_top_critical_24h...")
        await conn.execute(text("""
        CREATE VIEW api.v_top_critical_24h AS
        SELECT station_id,
            station_code,
            station_name,
            station_type,
            basin_code,
            basin_name,
            source_code,
            run_time,
            precip_cum_24h_mm,
            debit_max_24h_m3s,
            lacher_max_24h_m3s,
            apport_max_24h_m3s,
                CASE
                    WHEN (COALESCE(lacher_max_24h_m3s, (0)::double precision) >= (500)::double precision) THEN 'ALERTE_LACHER'::text
                    WHEN (COALESCE(debit_max_24h_m3s, (0)::double precision) >= (500)::double precision) THEN 'ALERTE_DEBIT'::text
                    WHEN (COALESCE(precip_cum_24h_mm, (0)::double precision) >= (50)::double precision) THEN 'ALERTE_PLUIE'::text
                    WHEN (COALESCE(precip_cum_24h_mm, (0)::double precision) >= (20)::double precision) THEN 'VIGILANCE_PLUIE'::text
                    ELSE 'OK'::text
                END AS severity,
            ((((COALESCE(precip_cum_24h_mm, (0)::double precision) * (1.0)::double precision) + (COALESCE(debit_max_24h_m3s, (0)::double precision) * (0.1)::double precision)) + (COALESCE(lacher_max_24h_m3s, (0)::double precision) * (0.1)::double precision)) + (COALESCE(apport_max_24h_m3s, (0)::double precision) * (0.1)::double precision)) AS score
        FROM api.v_window_station_24h_fast w
        WHERE (source_code = ANY (ARRAY['OBS'::text, 'ABHS_RES'::text, 'AROME'::text, 'ECMWF'::text, 'SIM'::text]));
        """))

        print("Recreating v_map_points_kpi...")
        await conn.execute(text("""
        CREATE VIEW api.v_map_points_kpi AS
        SELECT st.station_id,
            st.station_code,
            st.station_name,
            st.station_type,
            st.basin_id,
            st.basin_code,
            st.basin_name,
            st.is_active,
            (st_asgeojson(st.geom))::json AS geometry,
            p.precip_obs_mm,
            p.precip_obs_time,
            p.precip_arome_mm,
            p.debit_obs_m3s,
            p.debit_sim_m3s,
            p.debit_obs_time,
            p.lacher_m3s_latest,
            p.lacher_m3s_time,
            p.volume_hm3_latest,
            p.volume_obs_hm3,
            p.volume_sim_hm3,
            p.volume_hm3_time,
            tc.source_code AS kpi_source,
            tc.run_time AS kpi_run_time,
            tc.precip_cum_24h_mm,
            tc.debit_max_24h_m3s,
            tc.lacher_max_24h_m3s,
            tc.apport_max_24h_m3s,
            tc.severity,
            tc.score
        FROM ((api.v_station st
            LEFT JOIN api.v_latest_station_pivot p ON ((p.station_id = st.station_id)))
            LEFT JOIN api.v_top_critical_24h tc ON ((tc.station_id = st.station_id)));
        """))
        print("Done!")

asyncio.run(update_views())
