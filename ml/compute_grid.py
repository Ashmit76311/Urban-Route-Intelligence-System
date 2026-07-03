import numpy as np
import pandas as pd
import h3
import joblib
from pathlib import Path

ML_DIR   = Path(__file__).parent
DATA_DIR  = ML_DIR / 'data'
MODEL_DIR = ML_DIR / 'models'

model    = joblib.load(MODEL_DIR / 'risk_model.joblib')
le       = joblib.load(MODEL_DIR / 'label_encoder.joblib')
features = joblib.load(MODEL_DIR / 'feature_names.joblib')

LAT_MIN, LAT_MAX = 28.30, 28.95
LNG_MIN, LNG_MAX = 76.70, 77.50
H3_RESOLUTION = 8

step = 0.01
lats = np.arange(LAT_MIN, LAT_MAX, step)
lngs = np.arange(LNG_MIN, LNG_MAX, step)

cell_set = set()
for lat in lats:
    for lng in lngs:
        cell_set.add(h3.geo_to_h3(lat, lng, H3_RESOLUTION))

print(f"Total H3 cells: {len(cell_set)}")

PEAK_HOUR = 22
hour_sin = np.sin(2 * np.pi * PEAK_HOUR / 24)
hour_cos = np.cos(2 * np.pi * PEAK_HOUR / 24)
dow_sin  = np.sin(2 * np.pi * 0 / 7)
dow_cos  = np.cos(2 * np.pi * 0 / 7)
type_enc = le.transform(['crime'])[0]

records = []
X_batch = []
for cell in cell_set:
    lat, lng = h3.h3_to_geo(cell)
    boundary = h3.h3_to_geo_boundary(cell)   # list of (lat, lng)

    row = {
        'lat': lat, 'lng': lng,
        'hour_sin': hour_sin, 'hour_cos': hour_cos,
        'dow_sin': dow_sin, 'dow_cos': dow_cos,
        'is_night': 1, 'is_weekend': 0, 'is_rush_hour': 0,
        'weather_severity': 0.2,
        'severity': 3,
        'type_encoded': type_enc,
    }
    X_batch.append([row[f] for f in features])

    # H3 boundary: [(lat, lng), ...] → PostGIS wants (lng lat)
    coords = [(b[1], b[0]) for b in boundary]
    coords.append(coords[0])   # close ring
    wkt = 'POLYGON((' + ', '.join(f'{c[0]} {c[1]}' for c in coords) + '))'

    records.append({
        'h3_index': cell,
        'centroid_lat': lat,
        'centroid_lng': lng,
        'polygon_wkt': wkt,
    })

X_arr = np.array(X_batch)
risks = np.clip(model.predict(X_arr), 0, 100)

for i, rec in enumerate(records):
    rec['risk_score'] = round(float(risks[i]), 2)

df_grid = pd.DataFrame(records)
DATA_DIR.mkdir(parents=True, exist_ok=True)
df_grid.to_csv(DATA_DIR / 'risk_grid.csv', index=False)
print(f"Grid saved: {len(df_grid)} cells")
print(df_grid['risk_score'].describe())
