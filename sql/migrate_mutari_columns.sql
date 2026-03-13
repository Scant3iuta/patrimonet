-- ============================================================
-- Fix: Fac user_id nullable in tabela mutari (FK constraint)
-- PatrimoNet — CN Vasile Goldis Arad
-- Data: 2026-03-02
-- ============================================================
-- Eroare: "violates foreign key constraint mutari_user_id_fkey"
-- Cauza: user_id local nu exista ca ID in tabela personal din SB

-- Fac user_id nullable (permite null)
ALTER TABLE mutari ALTER COLUMN user_id DROP NOT NULL;

-- Verificare
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'mutari' 
ORDER BY ordinal_position;
