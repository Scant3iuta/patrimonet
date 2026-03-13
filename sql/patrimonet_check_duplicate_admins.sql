-- 🔍 INVESTIGAȚIE: VERIFICARE PROFILE DUPLICATE SUPER ADMIN
-- Rulează acest script în Supabase SQL Editor pentru a vedea cine are rol de super_admin

-- 1. Vedem toți Super Adminii înregistrați
SELECT id, nume, prenume, email, rol, created_at 
FROM public.personal 
WHERE rol = 'super_admin'
ORDER BY created_at DESC;

-- 2. REPARARE (OPȚIONAL): Dacă vrei să păstrezi doar profilul "Oance Catalin Traian" 
-- și să ștergi profilul generic "Cătălin Admin":
-- ATENȚIE: Verifică ID-urile din rezultatul de mai sus înainte de a rula DELETE!

/*
DELETE FROM public.personal 
WHERE email = 'catalin@patrimonet.ro' 
AND nume = 'Admin';
*/

-- 3. ACTUALIZARE NUME: Dacă vrei să păstrezi emailul catalin@patrimonet.ro dar cu numele corect:
/*
UPDATE public.personal 
SET nume = 'Oancea', prenume = 'Cătălin Traian' 
WHERE email = 'catalin@patrimonet.ro';
*/
