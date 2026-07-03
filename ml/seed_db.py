"""
Seeds risk_grid and incidents tables in PostgreSQL.
Run from anywhere — path resolves relative to this file, not cwd.
  python ml/seed_db.py       ← from repo root
  python seed_db.py          ← from inside ml/
Both work.
"""
import os
import sys
from pathlib import Path

# Resolve .env relative to this file — not the working directory
env_path = Path(__file__).parent.parent / 'server' / '.env'
if not env_path.exists():
    print(f"ERROR: .env not found at {env_path}")
    sys.exit(1)

from dotenv import load_dotenv
load_dotenv(env_path)

import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in server/.env")
    sys.exit(1)

# Data files relative to this script
DATA_DIR = Path(__file__).parent / 'data'

conn = psycopg2.connect(DATABASE_URL)
cur  = conn.cursor()

# 1. Risk grid
print("Clearing old risk_grid...")
cur.execute("TRUNCATE TABLE risk_grid;")

df_grid = pd.read_csv(DATA_DIR / 'risk_grid.csv')
print("\nInserting risk grid...")
execute_batch(cur, """
    INSERT INTO risk_grid (risk_score, baseline_score, cell)
    VALUES (%s, %s, ST_GeographyFromText(%s))
""", [(row['risk_score'], row['risk_score'], row['polygon_wkt']) for _, row in df_grid.iterrows()], page_size=100)
print(f"Inserted {len(df_grid)} risk grid cells")

# 2. Synthetic incidents
print("Replacing synthetic incidents...")
cur.execute("DELETE FROM incidents WHERE is_synthetic = true;")

df_inc = pd.read_csv(DATA_DIR / 'incidents.csv')
inc_records = [
    (row['type'], f"POINT({row['lng']} {row['lat']})", None, True)
    for _, row in df_inc.iterrows()
]
execute_batch(cur, """
    INSERT INTO incidents (type, location, note, is_synthetic)
    VALUES (%s, ST_GeographyFromText(%s), %s, %s)
""", inc_records, page_size=200)
print(f"Inserted {len(inc_records)} synthetic incidents")

conn.commit()
cur.close()
conn.close()
print("Done. Run this SQL to verify:")
print("  SELECT COUNT(*) FROM risk_grid;")
print("  SELECT COUNT(*) FROM incidents WHERE is_synthetic = true;")
