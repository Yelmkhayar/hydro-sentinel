
-- Rename existing codes to standard expected codes if they exist
UPDATE ref.variable SET code = 'flow_m3s' WHERE code = 'debit_m3s';
UPDATE ref.variable SET code = 'inflow_m3s' WHERE code = 'apport_m3s';
-- Maybe rename volume if needed, but volume_hm3 seems standard.

-- Delete everything that is NOT in our target list
DELETE FROM ref.variable 
WHERE code NOT IN ('precip_mm', 'flow_m3s', 'inflow_m3s', 'volume_hm3');

-- Upsert/Update the definitions with CLEAN short labels/descriptions
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
