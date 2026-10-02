-- Add publicada column to propuestas_diseno table
ALTER TABLE propuestas_diseno ADD COLUMN IF NOT EXISTS publicada BOOLEAN NOT NULL DEFAULT FALSE;