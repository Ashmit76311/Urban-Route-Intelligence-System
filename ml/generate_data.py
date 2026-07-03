"""
Generates synthetic urban incident dataset for Delhi NCR.
See DATA_METHODOLOGY.md for full methodology.
All data is synthetic. No real crime/incident records are used.

Run from anywhere — paths resolve relative to this file.
  python ml/generate_data.py    (from repo root)
  python generate_data.py       (from inside ml/)
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from sklearn.neighbors import BallTree

np.random.seed(42)

# Output relative to this file regardless of cwd
DATA_DIR = Path(__file__).parent / 'data'

LAT_MIN, LAT_MAX = 28.30, 28.95
LNG_MIN, LNG_MAX = 76.70, 77.50
N_INCIDENTS = 2500

# Fictional cluster centers — NOT based on real crime data.
# Represent the idea that urban incidents cluster geographically.
HOTSPOT_SEEDS = [
    # (lat, lng, intensity_weight, radius_deg)
    (28.63, 77.22, 0.15, 0.04),
    (28.65, 77.08, 0.12, 0.03),
    (28.71, 77.10, 0.10, 0.03),
    (28.55, 77.27, 0.10, 0.035),
    (28.61, 77.35, 0.08, 0.025),
    (28.67, 77.45, 0.07, 0.025),
    (28.46, 77.03, 0.06, 0.02),
    (28.73, 77.18, 0.06, 0.03),
    (28.52, 77.18, 0.07, 0.025),
    (28.59, 77.25, 0.05, 0.02),
]


def generate_locations():
    lats, lngs = [], []
    cluster_count = int(N_INCIDENTS * 0.70)
    noise_count = N_INCIDENTS - cluster_count

    weights = np.array([h[2] for h in HOTSPOT_SEEDS])
    weights /= weights.sum()
    chosen = np.random.choice(len(HOTSPOT_SEEDS), size=cluster_count, p=weights)

    for idx in chosen:
        lat_c, lng_c, _, radius = HOTSPOT_SEEDS[idx]
        lat = np.clip(np.random.normal(lat_c, radius), LAT_MIN, LAT_MAX)
        lng = np.clip(np.random.normal(lng_c, radius), LNG_MIN, LNG_MAX)
        lats.append(lat)
        lngs.append(lng)

    lats += list(np.random.uniform(LAT_MIN, LAT_MAX, noise_count))
    lngs += list(np.random.uniform(LNG_MIN, LNG_MAX, noise_count))
    return np.array(lats), np.array(lngs)


def generate_timestamps(n):
    base = datetime(2024, 1, 1)
    # Hour weights: crime peaks 22-02, accidents 08-10 & 17-20
    hour_weights = np.array([
        3, 3, 4, 3, 2, 1, 1, 1, 4, 5, 3, 2,  # 00-11
        2, 2, 2, 2, 2, 5, 5, 4, 3, 4, 4, 4    # 12-23
    ], dtype=float)
    hour_weights /= hour_weights.sum()
    timestamps = []
    for _ in range(n):
        day_offset = np.random.randint(0, 365)
        hour = np.random.choice(24, p=hour_weights)
        minute = np.random.randint(0, 60)
        timestamps.append(base + timedelta(days=day_offset, hours=hour, minutes=minute))
    return timestamps


TYPES = ['accident', 'crime', 'roadblock', 'unsafe']
TYPE_WEIGHTS = [0.35, 0.35, 0.15, 0.15]


def generate_types_severity(n):
    types = np.random.choice(TYPES, size=n, p=TYPE_WEIGHTS)
    severities = []
    for t in types:
        if t in ['accident', 'crime']:
            s = np.random.choice([1, 2, 3, 4, 5], p=[0.10, 0.15, 0.30, 0.30, 0.15])
        else:
            s = np.random.choice([1, 2, 3, 4, 5], p=[0.30, 0.35, 0.25, 0.08, 0.02])
        severities.append(s)
    return types, np.array(severities)


def add_features(df):
    dt = pd.to_datetime(df['timestamp'])
    df['hour'] = dt.dt.hour
    df['day_of_week'] = dt.dt.dayofweek
    df['is_night'] = ((df['hour'] >= 22) | (df['hour'] <= 4)).astype(int)
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    df['is_rush_hour'] = (
        ((df['hour'] >= 8) & (df['hour'] <= 10)) |
        ((df['hour'] >= 17) & (df['hour'] <= 20))
    ).astype(int)
    # Cyclical encoding avoids 23→0 discontinuity
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['dow_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['dow_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
    # Simulated weather: right-skewed (mostly clear)
    df['weather_severity'] = np.random.beta(1.5, 5, len(df))
    return df


def compute_local_density(lats, lngs, radius_deg=0.01):
    """Count incidents within ~1 km of each point (haversine BallTree)."""
    coords = np.radians(np.column_stack([lats, lngs]))
    bt = BallTree(coords, metric='haversine')
    radius_rad = radius_deg * np.pi / 180
    return bt.query_radius(coords, r=radius_rad, count_only=True)


if __name__ == '__main__':
    print(f"Generating {N_INCIDENTS} synthetic incidents...")
    lats, lngs = generate_locations()
    timestamps = generate_timestamps(N_INCIDENTS)
    types, severities = generate_types_severity(N_INCIDENTS)

    df = pd.DataFrame({
        'lat': lats,
        'lng': lngs,
        'timestamp': timestamps,
        'type': types,
        'severity': severities,
        'is_synthetic': True,
    })
    df = add_features(df)

    print("Computing local density labels...")
    density = compute_local_density(df['lat'].values, df['lng'].values)
    max_d = np.percentile(density, 99)   # cap at 99th pct to avoid outlier dominance
    base_score = np.clip(density / max_d, 0, 1) * 100
    severity_boost = (df['severity'] - 1) * 5
    df['risk_score'] = np.clip(base_score + severity_boost, 0, 100).round(2)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out = DATA_DIR / 'incidents.csv'
    df.to_csv(out, index=False)
    print(f"Saved {len(df)} incidents -> {out}")
    print(df['risk_score'].describe())
