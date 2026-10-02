DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clientes' AND policyname = 'anon_full_access_clientes') THEN
    EXECUTE 'DROP POLICY "anon_full_access_clientes" ON clientes';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'citas' AND policyname = 'anon_full_access_citas') THEN
    EXECUTE 'DROP POLICY "anon_full_access_citas" ON citas';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'portafolio_proyectos' AND policyname = 'anon_full_access_portafolio_proyectos') THEN
    EXECUTE 'DROP POLICY "anon_full_access_portafolio_proyectos" ON portafolio_proyectos';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'materiales' AND policyname = 'anon_full_access_materiales') THEN
    EXECUTE 'DROP POLICY "anon_full_access_materiales" ON materiales';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proyectos' AND policyname = 'anon_full_access_proyectos') THEN
    EXECUTE 'DROP POLICY "anon_full_access_proyectos" ON proyectos';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'modelos' AND policyname = 'anon_full_access_modelos') THEN
    EXECUTE 'DROP POLICY "anon_full_access_modelos" ON modelos';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'modelo_materiales' AND policyname = 'anon_full_access_modelo_materiales') THEN
    EXECUTE 'DROP POLICY "anon_full_access_modelo_materiales" ON modelo_materiales';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuestas_diseno' AND policyname = 'anon_full_access_propuestas_diseno') THEN
    EXECUTE 'DROP POLICY "anon_full_access_propuestas_diseno" ON propuestas_diseno';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuesta_modelos' AND policyname = 'anon_full_access_propuesta_modelos') THEN
    EXECUTE 'DROP POLICY "anon_full_access_propuesta_modelos" ON propuesta_modelos';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotizacionversiones' AND policyname = 'anon_full_access_cotizacionversiones') THEN
    EXECUTE 'DROP POLICY "anon_full_access_cotizacionversiones" ON cotizacionversiones';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotizaciones_generadas' AND policyname = 'anon_full_access_cotizaciones_generadas') THEN
    EXECUTE 'DROP POLICY "anon_full_access_cotizaciones_generadas" ON cotizaciones_generadas';
  END IF;
END $$;

CREATE POLICY "anon_full_access_clientes" ON clientes FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_citas" ON citas FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_portafolio_proyectos" ON portafolio_proyectos FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_materiales" ON materiales FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_proyectos" ON proyectos FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_modelos" ON modelos FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_modelo_materiales" ON modelo_materiales FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_propuestas_diseno" ON propuestas_diseno FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_propuesta_modelos" ON propuesta_modelos FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_cotizacionversiones" ON cotizacionversiones FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_cotizaciones_generadas" ON cotizaciones_generadas FOR ALL USING (auth.role() = 'anon');
