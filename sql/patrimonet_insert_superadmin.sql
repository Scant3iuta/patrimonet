-- CĂTRE SUPER ADMIN: CREAREA PROFILULUI ÎN BAZA DE DATE (REVIZIA 3)

-- Deși folosim Supabase Auth pentru securitatea parolelor,
-- tabelul "personal" are încă o restricție veche care cere ca rubrica "parola" 
-- să nu fie goală (NOT NULL). Vom insera un placeholder ('[Securizat Supabase]')
-- pentru a respecta regula bazei de date.

INSERT INTO public.personal (nume, prenume, email, rol, school_id, parola)
SELECT 'Admin', 'Cătălin', 'catalin@patrimonet.ro', 'super_admin', 1, '[Securizat Supabase]'
WHERE NOT EXISTS (
    SELECT 1 FROM public.personal WHERE email = 'catalin@patrimonet.ro'
);
