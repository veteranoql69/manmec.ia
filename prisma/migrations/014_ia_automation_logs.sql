-- ============================================================
-- MANMEC IA — Migración 014: Logs de Automatización IA
-- ============================================================

CREATE TABLE IF NOT EXISTS manmec_ia_automation_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  external_id     text,                                      -- Aviso, Orden o Guía
  type            text        NOT NULL,                      -- OT_OPEN, OT_CLOSE, SHIPMENT, etc.
  status          text        NOT NULL DEFAULT 'SUCCESS',    -- SUCCESS, ERROR, WARNING
  raw_payload     jsonb,                                     -- El body del webhook original
  ai_response     jsonb,                                     -- Lo que devolvió el parser
  error_message   text,                                      -- Detalle técnico en caso de fallo
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE manmec_ia_automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ia_logs_select" ON manmec_ia_automation_logs FOR SELECT 
  USING (organization_id = manmec_my_org_id() AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR'));

-- Índices para velocidad de búsqueda
CREATE INDEX IF NOT EXISTS idx_ia_logs_org_created ON manmec_ia_automation_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_logs_external ON manmec_ia_automation_logs(external_id);
