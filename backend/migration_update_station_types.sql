-- 1. Drop old constraint
ALTER TABLE geo.station DROP CONSTRAINT IF EXISTS station_station_type_check;

-- 2. Migrate existing data to new format
UPDATE geo.station SET station_type = 'Station hydrologique' WHERE station_type = 'poste_mesure' OR station_type = 'limnimetrique';
UPDATE geo.station SET station_type = 'Poste Pluviométrique' WHERE station_type = 'pluviometrique';
UPDATE geo.station SET station_type = 'Barrage' WHERE station_type = 'barrage';
UPDATE geo.station SET station_type = 'point resultats' WHERE station_type = 'result_point' OR station_type = 'autre';

-- 3. Add new constraint with allowed values
ALTER TABLE geo.station 
ADD CONSTRAINT station_station_type_check 
CHECK (station_type IN ('point resultats', 'Barrage', 'Station hydrologique', 'Poste Pluviométrique'));
