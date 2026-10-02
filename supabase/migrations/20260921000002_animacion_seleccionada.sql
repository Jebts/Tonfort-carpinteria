-- Añadir campo seleccionada a propuestas_3d_animaciones
-- Migración: 20260921000002_animacion_seleccionada.sql

ALTER TABLE propuestas_3d_animaciones 
ADD COLUMN seleccionada BOOLEAN NOT NULL DEFAULT false;
