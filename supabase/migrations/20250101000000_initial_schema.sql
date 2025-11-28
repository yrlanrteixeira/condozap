-- =====================================================
-- CondoZap - Initial Database Schema
-- Multi-tenant SaaS para gestão de condomínios
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'PROFESSIONAL_SYNDIC', 'ADMIN', 'SYNDIC', 'RESIDENT');
CREATE TYPE permission_scope AS ENUM ('GLOBAL', 'LOCAL');
CREATE TYPE condominium_plan AS ENUM ('STANDARD', 'ENTERPRISE', 'PARTNER');
CREATE TYPE condominium_status AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED');
CREATE TYPE resident_type AS ENUM ('OWNER', 'TENANT');
CREATE TYPE complaint_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE complaint_priority AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE message_type AS ENUM ('TEXT', 'TEMPLATE', 'IMAGE');
CREATE TYPE message_scope AS ENUM ('ALL', 'TOWER', 'FLOOR', 'UNIT');
CREATE TYPE whatsapp_status AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');

-- =====================================================
-- TABLES
-- =====================================================

-- Condominiums (Multi-tenant root)
CREATE TABLE condominiums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  cnpj VARCHAR(14) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  towers TEXT[] NOT NULL DEFAULT '{}',

  -- WhatsApp Integration
  whatsapp_phone VARCHAR(15),
  whatsapp_business_id VARCHAR(255),

  -- Plan & Status
  plan condominium_plan DEFAULT 'STANDARD',
  status condominium_status DEFAULT 'TRIAL',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (links to auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'ADMIN',
  permission_scope permission_scope DEFAULT 'LOCAL',
  resident_id UUID,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User <-> Condominium (Many-to-Many)
CREATE TABLE user_condominiums (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, condominium_id)
);

-- Residents
CREATE TABLE residents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL, -- Formato E.164: +5511999990000
  tower VARCHAR(50) NOT NULL,
  floor VARCHAR(50) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  type resident_type DEFAULT 'OWNER',

  -- LGPD Compliance
  consent_whatsapp BOOLEAN DEFAULT FALSE,
  consent_data_processing BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one resident per unit
  UNIQUE(condominium_id, tower, floor, unit)
);

-- Complaints
CREATE TABLE complaints (
  id SERIAL PRIMARY KEY,
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  status complaint_status DEFAULT 'OPEN',
  priority complaint_priority,
  is_anonymous BOOLEAN DEFAULT FALSE,

  -- Audit trail
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaint Status History
CREATE TABLE complaint_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  from_status complaint_status NOT NULL,
  to_status complaint_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (WhatsApp logs)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  type message_type NOT NULL,
  scope message_scope NOT NULL,

  -- Targeting
  target_tower VARCHAR(50),
  target_floor VARCHAR(50),
  target_unit VARCHAR(50),

  content TEXT NOT NULL,

  -- WhatsApp metadata
  whatsapp_message_id VARCHAR(255),
  whatsapp_status whatsapp_status,

  -- Batch tracking
  batch_id UUID,
  recipient_count INTEGER DEFAULT 0,

  sent_by UUID NOT NULL REFERENCES users(id),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES para Performance
-- =====================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_user_condominiums_user_id ON user_condominiums(user_id);
CREATE INDEX idx_user_condominiums_condominium_id ON user_condominiums(condominium_id);

CREATE INDEX idx_residents_condominium_id ON residents(condominium_id);
CREATE INDEX idx_residents_phone ON residents(phone);

CREATE INDEX idx_complaints_condominium_id ON complaints(condominium_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_priority ON complaints(priority);
CREATE INDEX idx_complaints_resident_id ON complaints(resident_id);

CREATE INDEX idx_messages_condominium_id ON messages(condominium_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_batch_id ON messages(batch_id) WHERE batch_id IS NOT NULL;

-- =====================================================
-- TRIGGERS para updated_at automático
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_condominiums_updated_at
  BEFORE UPDATE ON condominiums
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION: Criar usuário automaticamente após signup
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, permission_scope)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'ADMIN'),
    'LOCAL'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- COMMENTS para documentação
-- =====================================================

COMMENT ON TABLE condominiums IS 'Root multi-tenant table. Each row represents a condominium using CondoZap.';
COMMENT ON TABLE users IS 'User profiles linked to Supabase Auth. Roles determine permissions.';
COMMENT ON TABLE user_condominiums IS 'Many-to-many: Users can access multiple condominiums (Professional Syndics).';
COMMENT ON TABLE residents IS 'Condominium residents. One per unit. Linked to WhatsApp phone.';
COMMENT ON TABLE complaints IS 'Anonymous or identified complaints. Supports priority and status workflow.';
COMMENT ON TABLE messages IS 'WhatsApp message logs. Supports targeting by scope (all/tower/floor/unit).';
