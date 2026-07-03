"""
Trains Random Forest regressor on synthetic incident data.
Prints real evaluation metrics — these go on your resume. Do not invent numbers.

Run from anywhere — paths resolve relative to this file.
  python ml/train_model.py    (from repo root)
  python train_model.py       (from inside ml/)
"""
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder

ML_DIR   = Path(__file__).parent
DATA_DIR  = ML_DIR / 'data'
MODEL_DIR = ML_DIR / 'models'

df = pd.read_csv(DATA_DIR / 'incidents.csv')
print(f"Loaded {len(df)} records")

FEATURES = [
    'lat', 'lng',
    'hour_sin', 'hour_cos',
    'dow_sin', 'dow_cos',
    'is_night', 'is_weekend', 'is_rush_hour',
    'weather_severity',
    'severity',
]

le = LabelEncoder()
df['type_encoded'] = le.fit_transform(df['type'])
FEATURES.append('type_encoded')

X = df[FEATURES].values
y = df['risk_score'].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42
)
print(f"Train: {len(X_train)}  Test: {len(X_test)}")

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=15,
    min_samples_leaf=3,
    n_jobs=-1,
    random_state=42,
)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
mae  = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2   = r2_score(y_test, y_pred)

print("\n=== MODEL EVALUATION (held-out test set) ===")
print(f"MAE  : {mae:.2f}  pts")
print(f"RMSE : {rmse:.2f}  pts")
print(f"R²   : {r2:.4f}")

cv_scores = cross_val_score(model, X, y, cv=5, scoring='r2', n_jobs=-1)
print(f"CV R² (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

print("\n=== FEATURE IMPORTANCES ===")
for name, imp in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
    bar = '=' * int(imp * 50)
    print(f"  {name:<20} {imp:.4f} {bar}")

MODEL_DIR.mkdir(parents=True, exist_ok=True)
joblib.dump(model,    MODEL_DIR / 'risk_model.joblib')
joblib.dump(le,       MODEL_DIR / 'label_encoder.joblib')
joblib.dump(FEATURES, MODEL_DIR / 'feature_names.joblib')
print(f"\nModel saved -> {MODEL_DIR}/")

print("\n" + "="*50)
print("QUOTABLE RESUME METRIC:")
print(f"  R² = {r2:.2f}, MAE = {mae:.1f} pts on held-out 20% test set")
print("="*50)
