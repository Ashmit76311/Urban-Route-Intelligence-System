# URIS — Data Methodology

## Why This Document Exists
URIS uses a synthetic incident dataset. This document explains exactly what
that means, why real data wasn't used, and what the synthetic data does and
does not represent. It is the canonical answer when anyone asks "where did
the crime data come from?"

## Why Not Real Crime Data
- NCRB (National Crime Records Bureau) publishes district-level annual
  aggregates — too coarse for street-level routing.
- No public API provides real-time, geolocated, granular incident data
  for Indian cities at the resolution a routing application needs.
- Claiming otherwise would be dishonest.

## What the Synthetic Data Is
- 2,500 generated incident records across Delhi NCR.
- Spatial distribution: 70% clustered around 10 fictional hotspot seeds
  placed within the bounding box (28.40–28.88°N, 76.84–77.35°E) using
  Gaussian sampling. 30% uniform background noise. Cluster seeds were
  placed arbitrarily — they do not correspond to known real-world
  crime locations.
- Temporal distribution: hour-of-day weights derived from general urban
  crime-timing literature (crime peaks late night 22:00–02:00; traffic
  accidents peak at rush hours 08:00–10:00, 17:00–20:00). Specific
  weights are documented in generate_data.py.
- Incident types (accident / crime / roadblock / unsafe): sampled with
  assumed proportions 35/35/15/15% — not derived from real incident-type
  statistics.
- Severity (1–5): sampled with type-dependent weights; higher severity
  for accident and crime types.

## How the Risk Labels Were Generated
1. Compute local incident density per record (BallTree, ~1 km radius).
2. Normalise to 0–100 using the 99th-percentile as ceiling (avoids
   outlier dominance).
3. Add a severity boost (+5 points per severity level above 1).
4. Clip final score to [0, 100].

This label reflects synthetic density patterns, not real-world risk.

## What the ML Model Actually Does
- Learns the spatial and temporal patterns embedded in the synthetic data.
- Predicts a risk score (0–100) for any (lat, lng, time) input.
- Evaluated on a genuine 80/20 held-out test split.
- R² and MAE values are real numbers from that evaluation — see the
  terminal output of train_model.py, or the resume bullet generated at
  the end of that script.

## What This Model Does NOT Do
- It does not predict real-world crime or accident risk.
- Its predictions reflect the synthetic distribution, not any ground truth.
- Accuracy claims (R², MAE) apply to the model's fit to synthetic labels,
  not to real incident prediction.

## Honest Interview Answer
"The model is trained on a synthetic dataset — I generated 2,500 incidents
with realistic spatial clustering and temporal weighting because no public
API provides granular real-time incident data for Indian cities. The model
achieves R² ≈ [X] and MAE ≈ [Y] points on a held-out test set, which
measures how well it fits the synthetic patterns, not real-world risk.
The methodology is documented in DATA_METHODOLOGY.md in the repo."
