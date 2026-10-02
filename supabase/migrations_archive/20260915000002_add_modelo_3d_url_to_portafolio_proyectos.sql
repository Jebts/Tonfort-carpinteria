-- Add modelo_3d_url to portafolio_proyectos
ALTER TABLE portafolio_proyectos ADD COLUMN IF NOT EXISTS modelo_3d_url TEXT;
