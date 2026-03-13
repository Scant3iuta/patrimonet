-- ==============================================================================
-- PATRIMONET - Schema Supabase V2 (Enhanced Security, Integrity & Audit)
-- Rulează acest script în Supabase SQL Editor
-- Atenție: Acest script VA ȘTERGE și va recrea tabelele, incluzând politicile.
-- ==============================================================================

-- 1. Curățare (Wipe curat a vechilor structuri pentru a reconstrui cu tipuri noi)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS istoric_log CASCADE;
DROP TABLE IF EXISTS notificari CASCADE;
DROP TABLE IF EXISTS fluxuri CASCADE;
DROP TABLE IF EXISTS probleme CASCADE;
DROP TABLE IF EXISTS mese CASCADE;
DROP TABLE IF EXISTS prezenta CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS rezervari CASCADE;
DROP TABLE IF EXISTS mutari CASCADE;
DROP TABLE IF EXISTS achizitii CASCADE;
DROP TABLE IF EXISTS furnizori CASCADE;
DROP TABLE IF EXISTS inventar CASCADE;
DROP TABLE IF EXISTS camere CASCADE;
DROP TABLE IF EXISTS cladiri CASCADE;
DROP TABLE IF EXISTS personal CASCADE;

-- 2. Creare Tabela Personal (cu suport nativ viitor pentru Auth auth.users)
CREATE TABLE personal (
  id BIGSERIAL PRIMARY KEY,
  -- legătura către Supabase Auth real (îl vom popula când facem tranziția totală)
  auth_user_id UUID UNIQUE, 
  prenume TEXT NOT NULL,
  nume TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  parola TEXT NOT NULL, -- folosit pe localhost; în viitor se va renunța pt auth auth.users
  rol TEXT NOT NULL CHECK (rol IN ('admin_app', 'admin_pat', 'contabil', 'director', 'mentenanta', 'pedagog', 'bucatar', 'paznic', 'ingrijitor')),
  tel TEXT,
  activ BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Entități de bază
CREATE TABLE cladiri (
  id BIGSERIAL PRIMARY KEY,
  cod TEXT NOT NULL,
  nume TEXT NOT NULL,
  adresa TEXT,
  etaje INTEGER DEFAULT 1,
  an_constructie INTEGER,
  suprafata NUMERIC,
  responsabil TEXT,
  data_reabilitare TEXT,
  note TEXT,
  suprafata_construita NUMERIC(10,2),
  suprafata_desfasurata NUMERIC(10,2),
  stare_generala TEXT,
  cod_siiir INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE camere (
  id BIGSERIAL PRIMARY KEY,
  cladire_id BIGINT REFERENCES cladiri(id) ON DELETE CASCADE,
  cod TEXT NOT NULL,
  nume TEXT NOT NULL,
  tip TEXT,
  etaj INTEGER DEFAULT 0,
  suprafata NUMERIC,
  responsabil TEXT,
  capacitate INTEGER
);

CREATE TABLE furnizori (
  id BIGSERIAL PRIMARY KEY,
  nume TEXT NOT NULL,
  cui TEXT,
  adresa TEXT,
  tel TEXT,
  email TEXT,
  persoana TEXT
);

CREATE TABLE inventar (
  id BIGSERIAL PRIMARY KEY,
  nr_inv TEXT NOT NULL UNIQUE,
  nume TEXT NOT NULL,
  cat TEXT,
  cladire_id BIGINT REFERENCES cladiri(id) ON DELETE SET NULL,
  camera_id BIGINT REFERENCES camere(id) ON DELETE SET NULL,
  stare TEXT DEFAULT 'Bun' CHECK (stare IN ('Bun', 'Uzat', 'Defect', 'Casat')),
  val NUMERIC DEFAULT 0,
  data_pif DATE,
  furnizor_id BIGINT REFERENCES furnizori(id) ON DELETE SET NULL,
  cont TEXT,
  durata INTEGER,
  amortizare NUMERIC DEFAULT 0,
  obs TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Entități tranzacționale
CREATE TABLE achizitii (
  id BIGSERIAL PRIMARY KEY,
  nr_doc TEXT,
  tip_doc TEXT,
  data_doc DATE,
  furnizor_id BIGINT REFERENCES furnizori(id) ON DELETE SET NULL,
  descriere TEXT,
  val NUMERIC,
  status TEXT DEFAULT 'În așteptare' CHECK (status IN ('În așteptare', 'Comandat', 'Recepționat', 'Aprobat', 'Respins')),
  user_id BIGINT REFERENCES personal(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mutari (
  id BIGSERIAL PRIMARY KEY,
  bun_id BIGINT REFERENCES inventar(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES personal(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  de_cladire TEXT, 
  de_camera TEXT,
  la_cladire_id BIGINT REFERENCES cladiri(id) ON DELETE SET NULL,
  la_camera_id BIGINT REFERENCES camere(id) ON DELETE SET NULL,
  motiv TEXT,
  obs TEXT,
  status TEXT DEFAULT 'În așteptare aprobare' CHECK (status IN ('În așteptare aprobare', 'Finalizată', 'Respinsă')),
  aprobat_de TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rezervari (
  id BIGSERIAL PRIMARY KEY,
  camera_id BIGINT REFERENCES camere(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES personal(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  ora_start TEXT,
  ora_end TEXT,
  materie TEXT,
  elevi INTEGER,
  echipamente TEXT,
  status TEXT DEFAULT 'În așteptare aprobare' CHECK (status IN ('În așteptare aprobare', 'Aprobată', 'Respinsă')),
  aprobat_de TEXT,
  creat_la DATE DEFAULT NOW()
);

CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  titlu TEXT NOT NULL,
  prioritate TEXT DEFAULT 'Medie' CHECK (prioritate IN ('Scăzută', 'Medie', 'Urgentă')),
  status TEXT DEFAULT 'Deschisă' CHECK (status IN ('Deschisă', 'În lucru', 'Finalizată')),
  camera_id BIGINT REFERENCES camere(id) ON DELETE SET NULL,
  bun_id BIGINT REFERENCES inventar(id) ON DELETE SET NULL,
  assign_id BIGINT REFERENCES personal(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES personal(id) ON DELETE SET NULL,
  description TEXT,
  termen DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE probleme (
  id BIGSERIAL PRIMARY KEY,
  tip TEXT,
  locatie TEXT,
  descriere TEXT,
  prio TEXT DEFAULT 'Medie',
  status TEXT DEFAULT 'Deschisă' CHECK (status IN ('Deschisă', 'În lucru', 'Rezolvată')),
  user_id BIGINT REFERENCES personal(id) ON DELETE SET NULL,
  rezolvat_de TEXT,
  creat DATE DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prezenta (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL UNIQUE,
  elevi INTEGER NOT NULL,
  tip_zi TEXT,
  obs TEXT,
  user_id BIGINT REFERENCES personal(id) ON DELETE SET NULL,
  creat TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mese (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL UNIQUE,
  mic_dejun INTEGER DEFAULT 0,
  pranz INTEGER DEFAULT 0,
  cina INTEGER DEFAULT 0,
  obs TEXT,
  user_id BIGINT REFERENCES personal(id) ON DELETE SET NULL
);

CREATE TABLE fluxuri (
  id BIGSERIAL PRIMARY KEY,
  tip TEXT NOT NULL,
  titlu TEXT NOT NULL,
  responsabil_id BIGINT REFERENCES personal(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES personal(id) ON DELETE SET NULL,
  termen DATE,
  obs TEXT,
  step_curent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'În așteptare' CHECK (status IN ('În așteptare', 'În lucru', 'Finalizat', 'Anulat')),
  data_start DATE DEFAULT NOW(),
  data_final DATE,
  istoric_pasi JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notificari (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  body TEXT,
  tip TEXT,
  target_roles TEXT[],
  read_by TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE istoric_log (
  id BIGSERIAL PRIMARY KEY,
  tip TEXT,
  descriere TEXT,
  user_name TEXT,
  user_rol TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    message TEXT,
    stack TEXT,
    url TEXT,
    user_id BIGINT REFERENCES personal(id) ON DELETE SET NULL,
    ua TEXT, 
    locatie TEXT 
);

-- ==============================================================================
-- Row Level Security (RLS) - Basic LockDown
-- ==============================================================================
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

-- Momentan, pentru a păstra compatibilitatea cu frontend-ul actual care nu folosește UUID Auth,
-- vom forța un "Allow all", dar acesta este Punctul de Plecare pentru a adăuga politici gen:
-- CREATE POLICY "Users can only see their own salaries" ON personal FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Allow anon everything temporally" ON personal FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON cladiri FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON camere FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON inventar FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON furnizori FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON achizitii FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON mutari FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON rezervari FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON prezenta FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON mese FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON probleme FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON fluxuri FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON notificari FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON istoric_log FOR ALL USING (true);
CREATE POLICY "Allow anon everything temporally" ON audit_logs FOR ALL USING (true);

-- ==============================================================================
-- Audit Logging Function
-- ==============================================================================
-- Creăm un trigger automat: Când se schimbă starea unui bun în tabela inventar
CREATE OR REPLACE FUNCTION audit_inventar_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stare IS DISTINCT FROM NEW.stare THEN
      INSERT INTO istoric_log (tip, descriere, user_name, user_rol)
      VALUES ('inventar', 'Stare bun actualizată de la ' || OLD.stare || ' la ' || NEW.stare || ' pentru bun_id ' || NEW.id, 'Sistem DB', 'Sistem');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_inventar ON inventar;
CREATE TRIGGER trg_audit_inventar
AFTER UPDATE ON inventar
FOR EACH ROW
EXECUTE FUNCTION audit_inventar_changes();
