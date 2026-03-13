-- 🛠️ FIX SCHEMA: ADĂUGARE COLOANĂ 'cui' ÎN TABELUL 'schools'
-- Această coloană este necesară pentru sincronizarea corectă cu Frontend-ul (app_logic.js)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='schools' AND column_name='cui'
    ) THEN
        ALTER TABLE public.schools ADD COLUMN cui TEXT;
    END IF;
END $$;

-- Verificare
SELECT id, nume, cod, cui FROM public.schools;
