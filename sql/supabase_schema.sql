-- SCRIPT SQL PENTRU INITIALIZARE SUPABASE - PATRIMONET
-- Rulează acest script în SQL Editor din tabloul de bord Supabase

-- 1. Tabel CLADIRI
CREATE TABLE IF NOT EXISTS cladiri (
    id BIGSERIAL PRIMARY KEY,
    cod TEXT,
    nume TEXT NOT NULL,
    adresa TEXT,
    etaje INTEGER DEFAULT 1,
    an_constructie INTEGER,
    suprafata DECIMAL,
    suprafata_construita DECIMAL,
    suprafata_desfasurata DECIMAL,
    stare_generala TEXT DEFAULT 'Bună',
    cod_siiir TEXT,
    tip_acoperis TEXT,
    tip_incalzire TEXT,
    supraveghere TEXT,
    grupuri_sanitare TEXT,
    stare_reabilitare TEXT,
    an_reabilitare INTEGER,
    regim_inaltime TEXT,
    tip_structura TEXT,
    observatii TEXT,
    school_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel CAMERE
CREATE TABLE IF NOT EXISTS camere (
    id BIGSERIAL PRIMARY KEY,
    cladire_id BIGINT REFERENCES cladiri(id) ON DELETE CASCADE,
    cod TEXT,
    nume TEXT NOT NULL,
    tip TEXT,
    etaj INTEGER DEFAULT 0,
    suprafata DECIMAL,
    responsabil TEXT,
    capacitate INTEGER,
    school_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel FURNIZORI
CREATE TABLE IF NOT EXISTS furnizori (
    id BIGSERIAL PRIMARY KEY,
    nume TEXT NOT NULL,
    cui TEXT,
    adresa TEXT,
    tel TEXT,
    email TEXT,
    persoana TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel INVENTAR (Bunuri)
CREATE TABLE IF NOT EXISTS inventar (
    id BIGSERIAL PRIMARY KEY,
    nr_inv TEXT UNIQUE,
    nume TEXT NOT NULL,
    cat TEXT,
    cladire_id BIGINT REFERENCES cladiri(id),
    camera_id BIGINT REFERENCES camere(id),
    stare TEXT DEFAULT 'Bun',
    val DECIMAL DEFAULT 0,
    data_pif DATE,
    furnizor_id BIGINT REFERENCES furnizori(id),
    cont TEXT,
    durata TEXT,
    amortizare DECIMAL DEFAULT 0,
    obs TEXT,
    school_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel PERSONAL (Utilizatori)
CREATE TABLE IF NOT EXISTS personal (
    id BIGSERIAL PRIMARY KEY,
    prenume TEXT,
    nume TEXT,
    email TEXT UNIQUE NOT NULL,
    parola TEXT,
    rol TEXT,
    tel TEXT,
    functie TEXT,
    categorie TEXT,
    school_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel ACHIZITII
CREATE TABLE IF NOT EXISTS achizitii (
    id BIGSERIAL PRIMARY KEY,
    descriere TEXT,
    furnizor_id BIGINT REFERENCES furnizori(id),
    cantitate INTEGER DEFAULT 1,
    val DECIMAL DEFAULT 0,
    data_doc DATE,
    status TEXT DEFAULT 'Comandat',
    aprobare_necesara TEXT DEFAULT 'nu',
    note TEXT,
    user_id BIGINT,
    school_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabel MUTARI
CREATE TABLE IF NOT EXISTS mutari (
    id BIGSERIAL PRIMARY KEY,
    bun_id BIGINT REFERENCES inventar(id),
    user_id BIGINT REFERENCES personal(id),
    data DATE,
    de_cladire TEXT,
    de_camera TEXT,
    la_cladire TEXT,
    la_camera TEXT,
    la_cladire_id BIGINT REFERENCES cladiri(id),
    la_camera_id BIGINT REFERENCES camere(id),
    motiv TEXT,
    obs TEXT,
    status TEXT DEFAULT 'Finalizată',
    aprobat_de TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabel REZERVARI
CREATE TABLE IF NOT EXISTS rezervari (
    id BIGSERIAL PRIMARY KEY,
    camera_id BIGINT REFERENCES camere(id),
    user_id BIGINT REFERENCES personal(id),
    data DATE,
    ora_start TEXT,
    ora_end TEXT,
    materie TEXT,
    elevi INTEGER DEFAULT 0,
    echipamente TEXT,
    status TEXT DEFAULT 'Aprobată',
    aprobat_de TEXT,
    obs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabel TASKS
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    titlu TEXT,
    prioritate TEXT DEFAULT 'Medie',
    status TEXT DEFAULT 'deschisa',
    camera_id BIGINT REFERENCES camere(id),
    bun_id BIGINT REFERENCES inventar(id),
    assign_id BIGINT REFERENCES personal(id),
    assign_ids JSONB,
    description TEXT,
    termen DATE,
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabel PREZENTA
CREATE TABLE IF NOT EXISTS prezenta (
    id BIGSERIAL PRIMARY KEY,
    data DATE,
    elevi INTEGER DEFAULT 0,
    tip_zi TEXT DEFAULT 'saptamana',
    obs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Tabel MESE
CREATE TABLE IF NOT EXISTS mese (
    id BIGSERIAL PRIMARY KEY,
    data DATE,
    mic_dejun INTEGER DEFAULT 0,
    pranz INTEGER DEFAULT 0,
    cina INTEGER DEFAULT 0,
    obs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Tabel PROBLEME (Raportari defecte)
CREATE TABLE IF NOT EXISTS probleme (
    id BIGSERIAL PRIMARY KEY,
    tip TEXT,
    locatie TEXT,
    descriere TEXT,
    prio TEXT DEFAULT 'Medie',
    status TEXT DEFAULT 'Deschisă',
    rezolvat_de TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Tabel FLUXURI
CREATE TABLE IF NOT EXISTS fluxuri (
    id BIGSERIAL PRIMARY KEY,
    tip TEXT,
    titlu TEXT,
    responsabil_id BIGINT REFERENCES personal(id),
    user_id BIGINT REFERENCES personal(id),
    termen DATE,
    obs TEXT,
    step_curent INTEGER DEFAULT 0,
    status TEXT DEFAULT 'În așteptare',
    data_start DATE,
    data_final DATE,
    istoric_pasi JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Tabel ISTORIC_LOG
CREATE TABLE IF NOT EXISTS istoric_log (
    id BIGSERIAL PRIMARY KEY,
    tip TEXT,
    descriere TEXT,
    user_name TEXT,
    user_rol TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTA: Pentru simplitate in faza de test, poti dezactiva RLS sau poti adauga politici permisive.
-- Dezactivare RLS (Optional, pentru testare rapida):
ALTER TABLE cladiri DISABLE ROW LEVEL SECURITY;
ALTER TABLE camere DISABLE ROW LEVEL SECURITY;
ALTER TABLE furnizori DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventar DISABLE ROW LEVEL SECURITY;
ALTER TABLE personal DISABLE ROW LEVEL SECURITY;
ALTER TABLE achizitii DISABLE ROW LEVEL SECURITY;
ALTER TABLE mutari DISABLE ROW LEVEL SECURITY;
ALTER TABLE rezervari DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE prezenta DISABLE ROW LEVEL SECURITY;
ALTER TABLE mese DISABLE ROW LEVEL SECURITY;
ALTER TABLE probleme DISABLE ROW LEVEL SECURITY;
ALTER TABLE fluxuri DISABLE ROW LEVEL SECURITY;
ALTER TABLE istoric_log DISABLE ROW LEVEL SECURITY;
