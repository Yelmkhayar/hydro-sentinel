SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'station_station_type_check';
