-- 012_manmec_ai_onboarding.sql
-- Migración para añadir soporte al Bot de Telegram (Omnicanal) y Onboarding Zero-Friction

-- 1. Añadir ai_settings a manmec_organizations
ALTER TABLE public.manmec_organizations
ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}'::jsonb;

-- 2. Añadir telegram_chat_id a manmec_users
-- phone ya existe. onboarding_status también existe (pending|complete).
ALTER TABLE public.manmec_users
ADD COLUMN IF NOT EXISTS telegram_chat_id UUID UNIQUE; -- O string, dependendiendo del tipo de ID de Telegram. 
-- Wait, Telegram Chat IDs are bigints or strings. Let's make it TEXT.
ALTER TABLE public.manmec_users
DROP COLUMN IF EXISTS telegram_chat_id;
ALTER TABLE public.manmec_users
ADD COLUMN telegram_chat_id TEXT UNIQUE;

-- 3. Crear tabla temporal para emparejamiento por QR
CREATE TABLE IF NOT EXISTS public.manmec_telegram_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    phone_number TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.manmec_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT manmec_telegram_tokens_user_fkey FOREIGN KEY (user_id) REFERENCES public.manmec_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_manmec_telegram_tokens_token ON public.manmec_telegram_tokens(token);

-- Configuración de RLS (Row Level Security) para la nueva tabla
ALTER TABLE public.manmec_telegram_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas
-- Solo el servidor interno (Service Role) gestionará estos tokens principalmente.
CREATE POLICY "Servicio interno puede gestionar telegram_tokens"
ON public.manmec_telegram_tokens
FOR ALL
USING (auth.uid() IS NOT NULL); -- En MVP, dejar a auth o service_role.

-- Si queremos ser estrictos:
-- users can only create and read their own tokens
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.manmec_telegram_tokens;
CREATE POLICY "Users can manage their own tokens"
ON public.manmec_telegram_tokens
FOR ALL
USING (auth.uid() = user_id);

-- Para el trigger de actualización de updated_at no aplica aquí ya que no hay columna.
