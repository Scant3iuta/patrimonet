-- 🪄 REPARARE FINALĂ: CONSOLIDARE PROFIL SUPER ADMIN
-- Acest script va șterge duplicatul și va asigura că profilul rămas are numele corect și email-ul corect.

-- 1. Ștergem profilul "nou" creat de scriptul de recuperare (ID 35)
-- (Păstrăm ID 23 pentru că are un istoric mai vechi în sistem)
DELETE FROM public.personal WHERE id = 35;

-- 2. Actualizăm profilul original (ID 23) cu datele corecte de contact și nume
UPDATE public.personal 
SET 
    nume = 'Oance', 
    prenume = 'Catalin Traian', 
    email = 'catalin@patrimonet.ro' 
WHERE id = 23;

-- 3. Verificare finală
SELECT id, nume, prenume, email, rol 
FROM public.personal 
WHERE rol = 'super_admin';
