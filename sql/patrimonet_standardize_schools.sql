-- 🏴‍☠️ SCRIPT STANDARDIZARE TABEL "schools" (TENANȚI)
-- Asigură că baza de date și interfața "vorbesc aceeași limbă" (Română)

-- 1. Redenumim/Adăugăm coloanele lipsă pentru a fi 100% compatibili cu codul JS
DO $$ 
BEGIN
    -- Ne asigurăm că avem coloanele în limba română (folosite de Frontend)
    BEGIN ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS nume TEXT; EXCEPTION WHEN others THEN END;
    BEGIN ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS cod TEXT; EXCEPTION WHEN others THEN END;
    BEGIN ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS admin_name TEXT; EXCEPTION WHEN others THEN END;
    
    -- IMPORTANT: Eliminăm NOT NULL de pe coloanele vechi pentru a permite migrarea
    BEGIN ALTER TABLE public.schools ALTER COLUMN "name" DROP NOT NULL; EXCEPTION WHEN others THEN END;
    BEGIN ALTER TABLE public.schools ALTER COLUMN "code" DROP NOT NULL; EXCEPTION WHEN others THEN END;

    -- Sincronizăm datele din coloanele englezești (dacă există) în cele românești
    -- Folosim CASE pentru a evita suprascrierea dacă deja avem date noi
    UPDATE public.schools SET nume = name WHERE nume IS NULL AND name IS NOT NULL;
    UPDATE public.schools SET cod = code WHERE cod IS NULL AND code IS NOT NULL;
END $$;

-- 2. Consolidăm Tenanții existenți (pentru a fi siguri că datele sunt complete)
INSERT INTO public.schools (id, nume, cod, admin_name, active, licenta)
VALUES 
    (1, 'Colegiul Național „Vasile Goldiș”', 'CNVGA', 'Admin Patrimoniu', true, 'STANDARD'),
    (2, 'Liceul Teoretic (Exemplu)', 'SCOALA2', 'Director Scoala 2', true, 'STANDARD')
ON CONFLICT (id) DO UPDATE SET 
    nume = EXCLUDED.nume,
    cod = EXCLUDED.cod,
    admin_name = EXCLUDED.admin_name,
    active = EXCLUDED.active,
    licenta = EXCLUDED.licenta;

-- 3. Curățăm coloanele redundante sau nefolosite (Opțional, dar recomandat pentru "aceeași limbă")
-- Comentat pentru siguranță, poți rula manual dacă vrei curățenie absolută:
-- ALTER TABLE public.schools DROP COLUMN IF EXISTS name;
-- ALTER TABLE public.schools DROP COLUMN IF EXISTS code;
