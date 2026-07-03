ALTER TABLE risk_grid ADD COLUMN IF NOT EXISTS baseline_score NUMERIC(5,2);
UPDATE risk_grid SET baseline_score = risk_score;
