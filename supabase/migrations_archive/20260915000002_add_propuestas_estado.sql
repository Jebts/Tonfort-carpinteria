ALTER TABLE propuestas_diseno
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'borrador';

CREATE INDEX IF NOT EXISTS propuestas_diseno_estado_idx ON propuestas_diseno(estado);
