-- SCRIPT PENTRU REPARAREA ȘI POPULAREA TABELULUI "schools" (TENANȚI)
-- (Versiunea finală compatibilă cu constrângerile inițiale din baza de date)

-- Baza de date a fost creată inițial cu coloane în limba engleză ("name" NOT NULL, "code" etc.).
-- Pentru a evita erorile, vom popula atât coloanele vechi, cât și pe cele noi în limba română folosite de frontend.

DO $$ 
BEGIN
    BEGIN ALTER TABLE public.schools ADD COLUMN cod TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.schools ADD COLUMN nume TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.schools ADD COLUMN admin_name TEXT; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.schools ADD COLUMN licenta TEXT DEFAULT 'STANDARD'; EXCEPTION WHEN duplicate_column THEN END;
    BEGIN ALTER TABLE public.schools ADD COLUMN expiry DATE; EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- 3. Inserăm (sau updatăm) Tenanții principali, respectând structura originială.
-- Tenant 1: CNVGA
INSERT INTO public.schools (id, name, code, cod, nume, admin_name, active, licenta)
VALUES (
    1, 
    'Colegiul Național „Vasile Goldiș”', -- coloana veche obligatorie
    'CNVGA',                             -- coloana veche
    'CNVGA',                             -- coloana nouă Frontend
    'Colegiul Național „Vasile Goldiș”', -- coloana nouă Frontend
    'Admin Patrimoniu', 
    true, 
    'STANDARD'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    cod = EXCLUDED.cod, 
    nume = EXCLUDED.nume, 
    admin_name = EXCLUDED.admin_name,
    licenta = EXCLUDED.licenta;

-- Tenant 2: A doua școală
INSERT INTO public.schools (id, name, code, cod, nume, admin_name, active, licenta)
VALUES (
    2, 
    'Liceul Teoretic (Exemplu)',        -- coloana veche obligatorie
    'SCOALA2',                          -- coloana veche
    'SCOALA2',                          -- coloana nouă Frontend
    'Liceul Teoretic (Exemplu)',        -- coloana nouă Frontend
    'Director Scoala 2', 
    true, 
    'STANDARD'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    cod = EXCLUDED.cod, 
    nume = EXCLUDED.nume, 
    admin_name = EXCLUDED.admin_name,
    licenta = EXCLUDED.licenta;

-- 4. Asigurăm vizibilitatea corectă (RLS)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Schools visibility" ON public.schools;
CREATE POLICY "Schools visibility" ON public.schools FOR SELECT USING (true); 
