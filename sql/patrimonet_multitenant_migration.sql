-- ==============================================================================
-- PATRIMONET - Script de Tranziție Multi-Tenant (V3)
-- Acest script va extinde baza de date curentă pentru a suporta mai multe școli.
-- Datele existente vor fi automat atribuite către "Tenant 1" (CNVGA).
-- Atenție: Rulează acest script în Supabase SQL Editor.
-- ==============================================================================

-- 1. Creare Tabel Școli (Schools / Tenants)
CREATE TABLE IF NOT EXISTS schools (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    logo_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inserare Prima Școală (CNVGA - Păstrarea Datelor Curente)
-- Ne asigurăm că avem "Tenant 1" creat pentru ca restul datelor să aibă de cine să se atașeze
INSERT INTO schools (id, name, code, logo_url) 
VALUES (1, 'Colegiul Național "Vasile Goldiș" Arad', 'CNVGA', 'https://i.ibb.co/C3yG40q/logo-cnvega.png')
ON CONFLICT (id) DO NOTHING;

-- Modificăm secvența pentru ca viitoarele insert-uri să funcționeze corect dacă am setat manual ID=1
SELECT setval('schools_id_seq', (SELECT MAX(id) FROM schools));

-- ==============================================================================
-- 3. Actualizare Tabel `personal` (Roluri Noi & School ID)
-- ==============================================================================

-- Adăugăm coloana `school_id` și setăm valoarea default pe 1 pentru a include utilizatorii actuali
ALTER TABLE personal 
ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;

-- Ștergem vechea constrângere de rol (numele variază, de obicei supabase îl generează ca personal_rol_check)
-- Dacă eroarea apare, poți rula manual: ALTER TABLE personal DROP CONSTRAINT IF EXISTS personal_rol_check;
ALTER TABLE personal DROP CONSTRAINT IF EXISTS personal_rol_check;

-- Adăugăm noile roluri:
-- super_admin, school_admin, auditor, pedagog, it_admin, mentenanta, normal_user
ALTER TABLE personal 
ADD CONSTRAINT personal_rol_check 
CHECK (rol IN ('super_admin', 'school_admin', 'auditor', 'pedagog', 'it_admin', 'mentenanta', 'normal_user', 'admin_app', 'admin_pat', 'contabil', 'director', 'bucatar', 'paznic', 'ingrijitor'));
-- Am lăsat și rolurile vechi temporar pentru a nu buși conturile deja existente până le refaceti

-- Actualizăm rolurile vechi în cele noi
UPDATE personal SET rol = 'super_admin' WHERE rol = 'admin_app';
UPDATE personal SET rol = 'school_admin' WHERE rol = 'admin_pat';
UPDATE personal SET rol = 'auditor' WHERE rol IN ('contabil', 'director');
UPDATE personal SET rol = 'mentenanta' WHERE rol IN ('bucatar', 'paznic', 'ingrijitor'); -- temporar

-- ==============================================================================
-- 4. Adăugare Coloană `school_id` la restul tabelelor
-- ==============================================================================

-- Pentru a păstra datele curente pe CNVGA (Tenant 1), default-ul este 1.
ALTER TABLE cladiri ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE camere ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE inventar ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE furnizori ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE achizitii ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE mutari ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE rezervari ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE probleme ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE prezenta ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE mese ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE fluxuri ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE notificari ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE istoric_log ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE DEFAULT 1;

-- ==============================================================================
-- 5. Row Level Security (RLS) - Izolarea Tenanților
-- ==============================================================================

/*
 * ATENȚIE: Supabase folosește auth.uid() pentru a identifica utilizatorul logat curent.
 * Pentru simplitate (și până când refaci login-ul pe supabase auth nativ), 
 * o politică strictă ar arăta așa:
 * 
 * CREATE POLICY "Izolare cladiri pe scoala" ON cladiri 
 * FOR ALL USING (school_id = (SELECT school_id FROM personal WHERE email = curent_user_email));
 *
 * Dar deoarece momentan autentificarea ta este "custom" și ține informația în localstorage, nu în auth JWT,
 * noi ne vom asigura izolarea la nivel de cereri API din JavaScript (selectezi mereu eq('school_id', userSchoolId)).
 * 
 * Mai târziu, poți rula activarea RLS complet din Supabase. Deocamdată facem doar baza pentru ca codul să meargă.
*/

-- Activăm RLS pe tabelul schools
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schools allow all temp" ON schools FOR ALL USING (true);


-- GATA. Script finalizat. 
