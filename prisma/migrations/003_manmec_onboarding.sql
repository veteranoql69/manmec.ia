-- ============================================================
-- MANMEC IA — Parche 003: Onboarding Status + Trigger actualizado
-- Instrucciones: Pegar en Supabase Studio → SQL Editor → Run
-- Ejecutar DESPUÉS de 001 y 002
-- ============================================================

-- ============================================================
-- 1. Agregar onboarding_status a manmec_users
-- pending  = recién llegó, necesita onboarding o asignación manual
-- complete = tiene org + rol asignado, acceso completo
-- ============================================================
ALTER TABLE manmec_users
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'pending'
    CHECK (onboarding_status IN ('pending', 'complete'));

COMMENT ON COLUMN manmec_users.onboarding_status IS
  'pending = sin org/rol (muestra /onboarding). complete = acceso completo al dashboard.';


-- ============================================================
-- 2. Tabla de dominios públicos conocidos (referencia)
--    Para distinguir Google Workspace vs Gmail personal
-- ============================================================
CREATE TABLE IF NOT EXISTS manmec_public_email_domains (
  domain text PRIMARY KEY
);

INSERT INTO manmec_public_email_domains (domain) VALUES
  ('gmail.com'), ('googlemail.com'),
  ('hotmail.com'), ('hotmail.cl'),
  ('outlook.com'), ('outlook.cl'),
  ('yahoo.com'), ('yahoo.cl'),
  ('live.com'), ('live.cl'),
  ('icloud.com'), ('me.com'),
  ('msn.com'), ('protonmail.com'),
  ('tutanota.com')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 3. ACTUALIZAR trigger de creación de perfil
--    Lógica nueva:
--    A) Dominio corporativo con org registrada → MECHANIC, complete
--    B) Dominio corporativo sin org registrada → NULL org, pending (onboarding)
--    C) Dominio público (@gmail.com, etc.)    → NULL org, pending (onboarding)
--    En B y C el claim `hd` del token se guarda para pre-rellenar el formulario
-- ============================================================
CREATE OR REPLACE FUNCTION manmec_fn_create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email         text;
  v_domain        text;
  v_org_id        uuid;
  v_full_name     text;
  v_avatar_url    text;
  v_provider      text;
  v_hosted_domain text;      -- claim `hd` de Google Workspace
  v_is_public     boolean;
  v_onboarding    text;
  v_role          manmec_user_role;
BEGIN
  v_email         := NEW.email;
  v_domain        := split_part(v_email, '@', 2);
  v_full_name     := COALESCE(
                       NEW.raw_user_meta_data->>'full_name',
                       NEW.raw_user_meta_data->>'name',
                       v_email
                     );
  v_avatar_url    := NEW.raw_user_meta_data->>'avatar_url';
  v_provider      := COALESCE(NEW.raw_app_meta_data->>'provider', 'google');
  v_hosted_domain := NEW.raw_user_meta_data->>'hd';  -- Google Workspace claim

  -- ¿Es dominio público? (gmail, hotmail, etc.)
  SELECT EXISTS(
    SELECT 1 FROM manmec_public_email_domains WHERE domain = v_domain
  ) INTO v_is_public;

  -- Buscar organización existente por dominio
  SELECT id INTO v_org_id
  FROM manmec_organizations
  WHERE v_domain = ANY(allowed_domains)
    AND deleted_at IS NULL
  LIMIT 1;

  -- Determinar rol y estado de onboarding
  IF v_org_id IS NOT NULL THEN
    -- Escenario A: Dominio corporativo con org registrada → acceso directo
    v_role       := 'MECHANIC';
    v_onboarding := 'complete';
  ELSE
    -- Escenarios B y C: Sin org → mostrar formulario de onboarding
    v_role       := NULL;
    v_onboarding := 'pending';
  END IF;

  INSERT INTO manmec_users (
    id, organization_id, role, full_name, avatar_url,
    auth_provider, onboarding_status
  ) VALUES (
    NEW.id,
    v_org_id,       -- NULL en B y C → formulario de onboarding
    v_role,
    v_full_name,
    v_avatar_url,
    v_provider,
    v_onboarding
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Reinstalar trigger
DROP TRIGGER IF EXISTS trg_create_user_profile ON auth.users;
CREATE TRIGGER trg_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_create_user_profile();


-- ============================================================
-- 4. Función para completar onboarding (llamada desde la API)
--    Crea la organización y actualiza el usuario en una sola transacción
-- ============================================================
CREATE OR REPLACE FUNCTION manmec_fn_complete_onboarding(
  p_user_id     uuid,
  p_org_name    text,
  p_org_rut     text DEFAULT NULL,
  p_org_domain  text DEFAULT NULL   -- dominio corporativo a registrar (opcional)
)
RETURNS uuid   -- retorna el nuevo organization_id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id        uuid;
  v_allowed_domains text[] := '{}';
BEGIN
  -- Validaciones básicas
  IF p_org_name IS NULL OR trim(p_org_name) = '' THEN
    RAISE EXCEPTION 'El nombre de la organización es requerido';
  END IF;

  -- Agregar dominio corporativo si fue provisto y no es público
  IF p_org_domain IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM manmec_public_email_domains WHERE domain = trim(lower(p_org_domain))
  ) THEN
    v_allowed_domains := ARRAY[trim(lower(p_org_domain))];
  END IF;

  -- Crear organización
  INSERT INTO manmec_organizations (name, rut, allowed_domains, plan)
  VALUES (trim(p_org_name), p_org_rut, v_allowed_domains, 'free')
  RETURNING id INTO v_org_id;

  -- Actualizar usuario: COMPANY_ADMIN + onboarding completo
  UPDATE manmec_users
  SET
    organization_id   = v_org_id,
    role              = 'COMPANY_ADMIN',
    onboarding_status = 'complete',
    updated_at        = now()
  WHERE id = p_user_id;

  RETURN v_org_id;
END;
$$;

COMMENT ON FUNCTION manmec_fn_complete_onboarding IS
  'Llamar desde Server Action de Next.js al enviar el formulario de onboarding.
   Crea org + asigna COMPANY_ADMIN en una sola transacción atómica.';


-- ============================================================
-- 5. RLS: permitir al usuario ver/actualizar su propio perfil durante onboarding
--    (ya existe "users_select_self" — solo agregamos para public_email_domains)
-- ============================================================
ALTER TABLE manmec_public_email_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_domains_select" ON manmec_public_email_domains
  FOR SELECT USING (true);  -- lectura pública, es solo una lista de referencia


-- ============================================================
-- FIN DEL PARCHE 003
-- ============================================================
-- Verificar:
-- SELECT id, full_name, organization_id, role, onboarding_status
-- FROM manmec_users ORDER BY created_at DESC LIMIT 10;
