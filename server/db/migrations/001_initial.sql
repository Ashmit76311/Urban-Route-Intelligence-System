-- Incidents table (both synthetic seeds + user reports)
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('accident','crime','roadblock','unsafe')) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  note TEXT,
  is_synthetic BOOLEAN DEFAULT false,
  reporter_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX incidents_geo_idx ON incidents USING GIST (location);
CREATE INDEX incidents_created_idx ON incidents (created_at DESC);

-- Risk grid (precomputed hex cells, populated in Phase 2)
CREATE TABLE risk_grid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cell GEOGRAPHY(POLYGON, 4326) NOT NULL,
  risk_score NUMERIC(5,2) CHECK (risk_score BETWEEN 0 AND 100),
  computed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX risk_grid_geo_idx ON risk_grid USING GIST (cell);

-- Weather cache
CREATE TABLE weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  condition TEXT,
  severity NUMERIC(4,2),
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- Routes log (for analysis later)
CREATE TABLE routes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source GEOGRAPHY(POINT, 4326),
  destination GEOGRAPHY(POINT, 4326),
  chosen_type TEXT CHECK (chosen_type IN ('fast','safe')),
  route_risk_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
