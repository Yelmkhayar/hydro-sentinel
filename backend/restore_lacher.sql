
INSERT INTO ref.variable (code, label, unit)
VALUES ('lacher_m3s', 'Lâchers', 'm3/s')
ON CONFLICT (code) DO NOTHING;
