-- Update HEC_HMS to SIM
UPDATE ref.source SET code = 'SIM', label = 'Simulé' WHERE code = 'HEC_HMS';

-- Insert SIM if not exists
INSERT INTO ref.source (code, label, source_type, provider)
SELECT 'SIM', 'Simulé', 'simulated', 'INTERNAL'
WHERE NOT EXISTS (SELECT 1 FROM ref.source WHERE code = 'SIM');

-- Ensure ABHS_RES exists
INSERT INTO ref.source (code, label, source_type, provider)
SELECT 'ABHS_RES', 'Données ABH', 'simulated', 'ABHS'
WHERE NOT EXISTS (SELECT 1 FROM ref.source WHERE code = 'ABHS_RES');

-- Ensure AROME exists
INSERT INTO ref.source (code, label, source_type, provider)
SELECT 'AROME', 'Prévision Arome', 'forecast', 'METEO'
WHERE NOT EXISTS (SELECT 1 FROM ref.source WHERE code = 'AROME');

-- Ensure ECMWF exists
INSERT INTO ref.source (code, label, source_type, provider)
SELECT 'ECMWF', 'Prévision ECMWF', 'forecast', 'ECMWF'
WHERE NOT EXISTS (SELECT 1 FROM ref.source WHERE code = 'ECMWF');
