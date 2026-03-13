-- ============================================================
-- Migrare: Adaugare coloane tehnice dedicate in tabela cladiri
-- PatrimoNet — CN Vasile Goldis Arad
-- Data: 2026-03-02
-- ============================================================

-- 1. Adaugare coloane noi
ALTER TABLE cladiri ADD COLUMN IF NOT EXISTS tip_acoperis TEXT DEFAULT '';
ALTER TABLE cladiri ADD COLUMN IF NOT EXISTS tip_incalzire TEXT DEFAULT '';
ALTER TABLE cladiri ADD COLUMN IF NOT EXISTS supraveghere TEXT DEFAULT '';
ALTER TABLE cladiri ADD COLUMN IF NOT EXISTS grupuri_sanitare TEXT DEFAULT '';
ALTER TABLE cladiri ADD COLUMN IF NOT EXISTS stare_reabilitare TEXT DEFAULT '';
ALTER TABLE cladiri ADD COLUMN IF NOT EXISTS an_reabilitare INTEGER DEFAULT NULL;
ALTER TABLE cladiri ADD COLUMN IF NOT EXISTS regim_inaltime TEXT DEFAULT '';
ALTER TABLE cladiri ADD COLUMN IF NOT EXISTS tip_structura TEXT DEFAULT '';

-- 2. Migrare date din JSON observatii (daca exista)
-- Aceasta preia datele deja salvate in format JSON din coloana observatii
UPDATE cladiri
SET
  tip_acoperis = COALESCE((observatii::json->>'tipAcoperis'), ''),
  tip_incalzire = COALESCE((observatii::json->>'tipIncalzire'), ''),
  supraveghere = COALESCE((observatii::json->>'supraveghere'), ''),
  grupuri_sanitare = COALESCE((observatii::json->>'grupuriSanitare'), ''),
  stare_reabilitare = COALESCE((observatii::json->>'stareReabilitare'), ''),
  an_reabilitare = (observatii::json->>'anReabilitare')::INTEGER,
  regim_inaltime = COALESCE((observatii::json->>'regimInaltime'), ''),
  tip_structura = COALESCE((observatii::json->>'tipStructura'), ''),
  observatii = COALESCE((observatii::json->>'note'), observatii)
WHERE observatii IS NOT NULL
  AND observatii LIKE '{%'
  AND observatii::json->>'tipAcoperis' IS NOT NULL;

-- 3. Verificare
SELECT cod, nume, tip_acoperis, tip_incalzire, supraveghere, grupuri_sanitare,
       stare_reabilitare, an_reabilitare, regim_inaltime, tip_structura, observatii
FROM cladiri;
