-- FIX LOGIN: Corectarea politicilor pe tabelul "personal" fără bucle infinite.

-- 1. Ne asigurăm că funcțiile ajutătoare există și ocolesc RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS bigint AS $$
  SELECT school_id FROM public.personal 
  WHERE email = auth.jwt() ->> 'email'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.personal 
    WHERE email = auth.jwt() ->> 'email' 
    AND rol = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Stergem politicile vechi si pe cele gresite care puteau cauza bucla infinita
DROP POLICY IF EXISTS "Tenant isolation" ON personal;
DROP POLICY IF EXISTS "Super admin full access" ON personal;
DROP POLICY IF EXISTS "Allow select own profile" ON personal;
DROP POLICY IF EXISTS "Tenant isolation personal" ON personal;

-- 3. Fiecare utilizator (inclusiv Super Admin) are voie absolută să își citească propriul rand.
-- (Baza de date verifică doar dacă emailul logat este egal cu emailul de pe rând).
CREATE POLICY "Allow select own profile" ON personal FOR SELECT USING (email = auth.jwt() ->> 'email');

-- 4. Super administratorii au voie să vadă restul rândurilor și să le editeze.
-- (Folosim funcția is_super_admin() care ocolește RLS în fundal ca să nu se blocheze).
CREATE POLICY "Super admin full access" ON personal FOR ALL USING (is_super_admin());

-- 5. Izolare pentru restul rolurilor (School Admin, Contabil, etc).
-- Aceștia pot vedea și edita doar colegii din aceeași școală, cu excepția la Super Admin.
CREATE POLICY "Tenant isolation personal" ON personal FOR ALL USING (school_id = get_user_school_id());
