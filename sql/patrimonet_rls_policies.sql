-- ============================================================
-- PATRIMONET — Politici RLS Reale (Row Level Security)
-- Rulează în Supabase SQL Editor DUPĂ patrimonet_audit_trail.sql
--
-- ATENȚIE: Acest script va ÎNLOCUI politicile existente
-- "Allow all" cu politici reale de izolare pe tenant.
--
-- Funcționare:
--   1. Utilizatorul se autentifică via Supabase Auth → auth.uid()
--   2. Funcția helper get_my_school_id() extrage school_id din personal
--   3. Funcția helper is_super_admin() verifică rolul
--   4. Fiecare tabel are 2 politici: super_admin (full) + tenant (izolat)
-- ============================================================

-- =============================================
-- 1. Funcții Helper (refolosite în toate politicile)
-- =============================================

-- Returnează school_id-ul utilizatorului curent
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS BIGINT AS $$
  SELECT school_id FROM personal
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifică dacă utilizatorul curent este super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM personal
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND rol = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- 2. Ștergere TOATE politicile vechi permisive
-- =============================================

-- Clădiri
DROP POLICY IF EXISTS "Allow all" ON cladiri;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON cladiri;
DROP POLICY IF EXISTS "Schools allow all temp" ON schools;

-- Camere
DROP POLICY IF EXISTS "Allow all" ON camere;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON camere;

-- Inventar
DROP POLICY IF EXISTS "Allow all" ON inventar;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON inventar;

-- Furnizori
DROP POLICY IF EXISTS "Allow all" ON furnizori;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON furnizori;

-- Achiziții
DROP POLICY IF EXISTS "Allow all" ON achizitii;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON achizitii;

-- Personal
DROP POLICY IF EXISTS "Allow all" ON personal;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON personal;

-- Mutări
DROP POLICY IF EXISTS "Allow all" ON mutari;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON mutari;

-- Rezervări
DROP POLICY IF EXISTS "Allow all" ON rezervari;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON rezervari;

-- Tasks
DROP POLICY IF EXISTS "Allow all" ON tasks;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON tasks;

-- Prezență
DROP POLICY IF EXISTS "Allow all" ON prezenta;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON prezenta;

-- Mese
DROP POLICY IF EXISTS "Allow all" ON mese;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON mese;

-- Probleme
DROP POLICY IF EXISTS "Allow all" ON probleme;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON probleme;

-- Fluxuri
DROP POLICY IF EXISTS "Allow all" ON fluxuri;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON fluxuri;

-- Notificări
DROP POLICY IF EXISTS "Allow all" ON notificari;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON notificari;

-- Istoric Log
DROP POLICY IF EXISTS "Allow all" ON istoric_log;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON istoric_log;

-- Audit Logs
DROP POLICY IF EXISTS "Allow all" ON audit_logs;
DROP POLICY IF EXISTS "Allow anon everything temporally" ON audit_logs;
DROP POLICY IF EXISTS "Allow anonymous insert for audit" ON audit_logs;

-- Schools
DROP POLICY IF EXISTS "Allow all" ON schools;
DROP POLICY IF EXISTS "Schools allow all temp" ON schools;

-- =============================================
-- 3. Activare RLS pe toate tabelele
-- =============================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE cladiri ENABLE ROW LEVEL SECURITY;
ALTER TABLE camere ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventar ENABLE ROW LEVEL SECURITY;
ALTER TABLE furnizori ENABLE ROW LEVEL SECURITY;
ALTER TABLE achizitii ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutari ENABLE ROW LEVEL SECURITY;
ALTER TABLE rezervari ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE prezenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE mese ENABLE ROW LEVEL SECURITY;
ALTER TABLE probleme ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxuri ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificari ENABLE ROW LEVEL SECURITY;
ALTER TABLE istoric_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. Politici Noi — SCHOOLS
-- =============================================
-- Super Admin vede toate școlile
CREATE POLICY "schools_super_admin" ON schools
    FOR ALL USING (is_super_admin());

-- Utilizatorii normali văd doar școala lor
CREATE POLICY "schools_tenant" ON schools
    FOR SELECT USING (id = get_my_school_id());

-- =============================================
-- 5. Politici Noi — PERSONAL
-- =============================================
CREATE POLICY "personal_super_admin" ON personal
    FOR ALL USING (is_super_admin());

CREATE POLICY "personal_tenant_select" ON personal
    FOR SELECT USING (school_id = get_my_school_id());

-- School admin poate insera/edita personal din școala sa
CREATE POLICY "personal_tenant_insert" ON personal
    FOR INSERT WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "personal_tenant_update" ON personal
    FOR UPDATE USING (school_id = get_my_school_id());

-- =============================================
-- 6. Macro — Politici pentru tabele standard cu school_id
-- (cladiri, camere, inventar, furnizori, achizitii,
--  mutari, rezervari, tasks, prezenta, mese,
--  probleme, fluxuri, notificari, istoric_log)
-- =============================================

-- CLADIRI
CREATE POLICY "cladiri_super_admin" ON cladiri FOR ALL USING (is_super_admin());
CREATE POLICY "cladiri_tenant" ON cladiri FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- CAMERE
CREATE POLICY "camere_super_admin" ON camere FOR ALL USING (is_super_admin());
CREATE POLICY "camere_tenant" ON camere FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- INVENTAR
CREATE POLICY "inventar_super_admin" ON inventar FOR ALL USING (is_super_admin());
CREATE POLICY "inventar_tenant" ON inventar FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- FURNIZORI
CREATE POLICY "furnizori_super_admin" ON furnizori FOR ALL USING (is_super_admin());
CREATE POLICY "furnizori_tenant" ON furnizori FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- ACHIZITII
CREATE POLICY "achizitii_super_admin" ON achizitii FOR ALL USING (is_super_admin());
CREATE POLICY "achizitii_tenant" ON achizitii FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- MUTARI
CREATE POLICY "mutari_super_admin" ON mutari FOR ALL USING (is_super_admin());
CREATE POLICY "mutari_tenant" ON mutari FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- REZERVARI
CREATE POLICY "rezervari_super_admin" ON rezervari FOR ALL USING (is_super_admin());
CREATE POLICY "rezervari_tenant" ON rezervari FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- TASKS
CREATE POLICY "tasks_super_admin" ON tasks FOR ALL USING (is_super_admin());
CREATE POLICY "tasks_tenant" ON tasks FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- PREZENTA
CREATE POLICY "prezenta_super_admin" ON prezenta FOR ALL USING (is_super_admin());
CREATE POLICY "prezenta_tenant" ON prezenta FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- MESE
CREATE POLICY "mese_super_admin" ON mese FOR ALL USING (is_super_admin());
CREATE POLICY "mese_tenant" ON mese FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- PROBLEME
CREATE POLICY "probleme_super_admin" ON probleme FOR ALL USING (is_super_admin());
CREATE POLICY "probleme_tenant" ON probleme FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- FLUXURI
CREATE POLICY "fluxuri_super_admin" ON fluxuri FOR ALL USING (is_super_admin());
CREATE POLICY "fluxuri_tenant" ON fluxuri FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- NOTIFICARI
CREATE POLICY "notificari_super_admin" ON notificari FOR ALL USING (is_super_admin());
CREATE POLICY "notificari_tenant" ON notificari FOR ALL
    USING (school_id = get_my_school_id() OR school_id IS NULL)
    WITH CHECK (school_id = get_my_school_id());

-- ISTORIC_LOG
CREATE POLICY "istoric_log_super_admin" ON istoric_log FOR ALL USING (is_super_admin());
CREATE POLICY "istoric_log_tenant_select" ON istoric_log
    FOR SELECT USING (school_id = get_my_school_id() OR school_id IS NULL);
CREATE POLICY "istoric_log_tenant_insert" ON istoric_log
    FOR INSERT WITH CHECK (true); -- oricine logat poate scrie loguri

-- AUDIT_LOGS (erori JS)
CREATE POLICY "audit_logs_super_admin" ON audit_logs FOR ALL USING (is_super_admin());
CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT WITH CHECK (true); -- oricine poate raporta erori
CREATE POLICY "audit_logs_tenant_select" ON audit_logs
    FOR SELECT USING (school_id = get_my_school_id() OR school_id IS NULL);

-- =============================================
-- 7. Reîmprospătare cache schema PostgREST
-- =============================================
NOTIFY pgrst, 'reload schema';

-- GATA!
SELECT 'DONE' AS status, 'Politici RLS reale aplicate pe toate tabelele' AS mesaj;
