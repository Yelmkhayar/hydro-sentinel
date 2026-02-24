
BEGIN;

-- 1. Rename French codes to English to preserve data for these variables
UPDATE ref.variable SET code = 'flow_m3s' WHERE code = 'debit_m3s';
UPDATE ref.variable SET code = 'inflow_m3s' WHERE code = 'apport_m3s';

-- 2. Delete everything else with CASCADE (Dangerous but requested "clean up")
DELETE FROM ref.variable 
WHERE code NOT IN ('precip_mm', 'flow_m3s', 'inflow_m3s', 'volume_hm3');

-- 3. Upsert definitions
INSERT INTO ref.variable (code, label, unit, description)
VALUES 
    ('precip_mm', 'Pluie', 'mm', 'Pluie (H/J)'),
    ('flow_m3s', 'Débit', 'm3/s', 'Débit (H/J)'),
    ('inflow_m3s', 'Apports', 'm3/s', 'Apport (H/J)'),
    ('volume_hm3', 'Volume', 'hm3', 'Vol. (H/J)')
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    unit = EXCLUDED.unit,
    description = EXCLUDED.description;

COMMIT;
