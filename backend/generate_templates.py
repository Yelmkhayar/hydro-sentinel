
import pandas as pd
import numpy as np

# Template 1: Matrice Station (Une Station, Plusieurs Variables)
df_station = pd.DataFrame({
    'Date': pd.date_range(start='2024-01-01 00:00', periods=24, freq='h'),
    'precip_mm': np.random.uniform(0, 5, 24).round(1),
    'nivel_m': np.random.uniform(10, 12, 24).round(2),
    'debit_m3s': np.random.uniform(50, 100, 24).round(1)
})
df_station.to_excel("c:/dev/detection_inondation/hydro_sentinel/hydro-sentinel/public/templates/template_station_variables.xlsx", index=False)

# Template 2: Matrice Variable (Une Variable, Plusieurs Stations)
df_variable = pd.DataFrame({
    'Date': pd.date_range(start='2024-01-01 00:00', periods=24, freq='h'),
    'station_A': np.random.uniform(0, 10, 24).round(1),
    'station_B': np.random.uniform(0, 5, 24).round(1),
    'station_C': np.random.uniform(0, 0, 24)
})
df_variable.to_excel("c:/dev/detection_inondation/hydro_sentinel/hydro-sentinel/public/templates/template_multi_stations.xlsx", index=False)

print("Templates generated.")
