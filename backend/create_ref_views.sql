-- Workaround SQL script to create views mapping ref schema to geo schema
-- This allows the backend to work even if it's stuck loading "ref.station" and "ref.bassin"

-- Drop views if they exist
DROP VIEW IF EXISTS ref.station CASCADE;
DROP VIEW IF EXISTS ref.bassin CASCADE;

-- Create view ref.station that points to geo.station
CREATE OR REPLACE VIEW ref.station AS
SELECT * FROM geo.station;

-- Create view ref.bassin that points to geo.basin  
CREATE OR REPLACE VIEW ref.bassin AS
SELECT * FROM geo.basin;

-- Grant permissions (adjust as needed)
GRANT SELECT ON ref.station TO PUBLIC;
GRANT SELECT ON ref.bassin TO PUBLIC;

-- Verify
SELECT 'Created views successfully' AS status;
SELECT COUNT(*) as station_count FROM ref.station;
SELECT COUNT(*) as bassin_count FROM ref.bassin;
