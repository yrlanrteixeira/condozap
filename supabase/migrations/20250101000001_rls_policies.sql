-- =====================================================
-- CondoZap - Row Level Security (RLS) Policies
-- Isola dados entre condomínios (multi-tenancy)
-- =====================================================

-- =====================================================
-- ENABLE RLS em todas as tabelas
-- =====================================================

ALTER TABLE condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get user's role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user has access to condominium
CREATE OR REPLACE FUNCTION auth.has_condominium_access(condo_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_condominiums
    WHERE user_id = auth.uid()
    AND condominium_id = condo_id
  ) OR auth.user_role() IN ('SUPER_ADMIN', 'PROFESSIONAL_SYNDIC');
$$ LANGUAGE SQL SECURITY DEFINER;

-- =====================================================
-- POLICIES: condominiums
-- =====================================================

-- SUPER_ADMIN e PROFESSIONAL_SYNDIC: podem ver todos
CREATE POLICY "Admins can view all condominiums"
  ON condominiums FOR SELECT
  USING (auth.user_role() IN ('SUPER_ADMIN', 'PROFESSIONAL_SYNDIC'));

-- Usuários comuns: veem apenas seus condomínios
CREATE POLICY "Users can view their condominiums"
  ON condominiums FOR SELECT
  USING (
    id IN (
      SELECT condominium_id
      FROM user_condominiums
      WHERE user_id = auth.uid()
    )
  );

-- SUPER_ADMIN: pode criar condomínios
CREATE POLICY "Super admins can insert condominiums"
  ON condominiums FOR INSERT
  WITH CHECK (auth.user_role() = 'SUPER_ADMIN');

-- Admins do condomínio: podem atualizar
CREATE POLICY "Admins can update their condominiums"
  ON condominiums FOR UPDATE
  USING (auth.has_condominium_access(id))
  WITH CHECK (auth.has_condominium_access(id));

-- =====================================================
-- POLICIES: users
-- =====================================================

-- Usuário pode ver próprio perfil
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- SUPER_ADMIN pode ver todos
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  USING (auth.user_role() = 'SUPER_ADMIN');

-- Usuário pode atualizar próprio perfil
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =====================================================
-- POLICIES: user_condominiums
-- =====================================================

-- Usuário vê suas próprias associações
CREATE POLICY "Users can view own condominium associations"
  ON user_condominiums FOR SELECT
  USING (user_id = auth.uid());

-- SUPER_ADMIN vê tudo
CREATE POLICY "Super admins can view all associations"
  ON user_condominiums FOR SELECT
  USING (auth.user_role() = 'SUPER_ADMIN');

-- SUPER_ADMIN e ADMIN podem criar associações
CREATE POLICY "Admins can create associations"
  ON user_condominiums FOR INSERT
  WITH CHECK (
    auth.user_role() = 'SUPER_ADMIN'
    OR (
      auth.user_role() IN ('ADMIN', 'PROFESSIONAL_SYNDIC')
      AND auth.has_condominium_access(condominium_id)
    )
  );

-- =====================================================
-- POLICIES: residents
-- =====================================================

-- Usuários com acesso ao condomínio veem moradores
CREATE POLICY "Users can view residents of their condominiums"
  ON residents FOR SELECT
  USING (auth.has_condominium_access(condominium_id));

-- ADMIN/SYNDIC podem criar moradores
CREATE POLICY "Admins can insert residents"
  ON residents FOR INSERT
  WITH CHECK (
    auth.has_condominium_access(condominium_id)
    AND auth.user_role() IN ('SUPER_ADMIN', 'PROFESSIONAL_SYNDIC', 'ADMIN', 'SYNDIC')
  );

-- ADMIN/SYNDIC podem atualizar moradores
CREATE POLICY "Admins can update residents"
  ON residents FOR UPDATE
  USING (
    auth.has_condominium_access(condominium_id)
    AND auth.user_role() IN ('SUPER_ADMIN', 'PROFESSIONAL_SYNDIC', 'ADMIN', 'SYNDIC')
  )
  WITH CHECK (
    auth.has_condominium_access(condominium_id)
  );

-- ADMIN/SYNDIC podem deletar moradores
CREATE POLICY "Admins can delete residents"
  ON residents FOR DELETE
  USING (
    auth.has_condominium_access(condominium_id)
    AND auth.user_role() IN ('SUPER_ADMIN', 'PROFESSIONAL_SYNDIC', 'ADMIN', 'SYNDIC')
  );

-- =====================================================
-- POLICIES: complaints
-- =====================================================

-- Usuários com acesso ao condomínio veem denúncias
CREATE POLICY "Users can view complaints of their condominiums"
  ON complaints FOR SELECT
  USING (auth.has_condominium_access(condominium_id));

-- Moradores podem criar denúncias
CREATE POLICY "Residents can create complaints"
  ON complaints FOR INSERT
  WITH CHECK (auth.has_condominium_access(condominium_id));

-- ADMIN/SYNDIC podem atualizar status
CREATE POLICY "Admins can update complaint status"
  ON complaints FOR UPDATE
  USING (
    auth.has_condominium_access(condominium_id)
    AND auth.user_role() IN ('SUPER_ADMIN', 'PROFESSIONAL_SYNDIC', 'ADMIN', 'SYNDIC')
  )
  WITH CHECK (
    auth.has_condominium_access(condominium_id)
  );

-- =====================================================
-- POLICIES: complaint_status_history
-- =====================================================

CREATE POLICY "Users can view complaint history of their condominiums"
  ON complaint_status_history FOR SELECT
  USING (
    complaint_id IN (
      SELECT id FROM complaints
      WHERE auth.has_condominium_access(condominium_id)
    )
  );

CREATE POLICY "Admins can insert complaint history"
  ON complaint_status_history FOR INSERT
  WITH CHECK (
    complaint_id IN (
      SELECT id FROM complaints
      WHERE auth.has_condominium_access(condominium_id)
    )
  );

-- =====================================================
-- POLICIES: messages
-- =====================================================

-- Usuários veem mensagens do condomínio
CREATE POLICY "Users can view messages of their condominiums"
  ON messages FOR SELECT
  USING (auth.has_condominium_access(condominium_id));

-- ADMIN/SYNDIC podem enviar mensagens
CREATE POLICY "Admins can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.has_condominium_access(condominium_id)
    AND auth.user_role() IN ('SUPER_ADMIN', 'PROFESSIONAL_SYNDIC', 'ADMIN', 'SYNDIC')
  );

-- =====================================================
-- GRANT permissions para authenticated users
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- AUDIT LOG (opcional - para compliance LGPD)
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS para audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (auth.user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());
