from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, MetaData
from app.db.base_class import Base

# IMPORTANT: These models map to EXISTING views in the api schema
# They are READ-ONLY - we never create/drop these tables
# The views are managed by your database migration scripts

# 2.2 Entités géographiques
class BasinView(Base):
    __tablename__ = "v_basin"
    __table_args__ = {"schema": "api", "extend_existing": True, "info": {"is_view": True}}
    
    id = Column("basin_id", String, primary_key=True)
    code = Column("basin_code", String)
    name = Column("basin_name", String)
    level = Column(Integer)
    parent_basin_id = Column(String)
    geometry = Column("geom", String) 
    color = Column(String, nullable=True) # Check if exists? schema didn't show color. assuming no color for now

class StationView(Base):
    __tablename__ = "v_station"
    __table_args__ = {"schema": "api", "extend_existing": True, "info": {"is_view": True}}

    id = Column("station_id", String, primary_key=True)
    code = Column("station_code", String)
    name = Column("station_name", String)
    basin_id = Column(String)
    # lat/lon are not in view, geom is.
    # We will exclude them from mapping or map geom
    geom = Column(String)
    type = Column("station_type", String) # station, barrage, result_point
    active = Column("is_active", Boolean)

# 2.3 Séries temporelles
class TimeseriesView(Base):
    __tablename__ = "v_timeseries_station"
    __table_args__ = {"schema": "api", "extend_existing": True, "info": {"is_view": True}}

    time = Column(DateTime, primary_key=True)
    station_id = Column(String, primary_key=True)
    variable_code = Column(String, primary_key=True)
    source_code = Column(String, primary_key=True)
    run_time = Column(DateTime)
    value = Column(Float)

# 2.4 Latest pivot
class LatestStationPivotView(Base):
    __tablename__ = "v_latest_station_pivot"
    __table_args__ = {"schema": "api", "extend_existing": True, "info": {"is_view": True}}

    station_id = Column(String, primary_key=True)
    precip_obs_mm = Column(Float)
    precip_arome_mm = Column(Float)
    debit_obs_m3s = Column(Float)
    lacher_m3s_latest = Column(Float)
    volume_hm3_latest = Column(Float)

# 2.6 Vue critique
class TopCriticalView(Base):
    __tablename__ = "v_top_critical_24h"
    __table_args__ = {"schema": "api", "extend_existing": True, "info": {"is_view": True}}

    station_id = Column(String, primary_key=True)
    station_name = Column(String)
    basin_name = Column(String)
    precip_cum_24h_mm = Column(Float)
    debit_max_24h_m3s = Column(Float)
    lacher_max_24h_m3s = Column(Float)
    severity = Column(String) # OK / VIGILANCE / ALERTE
    score = Column(Float)

# 2.7 Vue carte complète
class MapKPIView(Base):
    __tablename__ = "v_map_points_kpi"
    __table_args__ = {"schema": "api", "extend_existing": True, "info": {"is_view": True}}

    station_id = Column(String, primary_key=True)
    station_name = Column(String)
    geometry = Column(JSON)
    severity = Column(String)
    score = Column(Float)
    # Embedded JSON or flat columns for popup data
    precip_obs_mm = Column(Float)
    debit_obs_m3s = Column(Float)
    lacher_m3s_latest = Column(Float)
    volume_hm3_latest = Column(Float)
    precip_cum_24h_mm = Column(Float)
