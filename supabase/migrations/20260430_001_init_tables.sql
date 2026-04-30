-- =============================================
-- テーブル作成（m_: マスタ / t_: トランザクション）
-- =============================================

-- =========================================
-- マスタテーブル
-- =========================================

CREATE TABLE m_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id    VARCHAR(100) UNIQUE NOT NULL,
  display_name    VARCHAR(100) NOT NULL,
  picture_url     TEXT,
  line_channel_id VARCHAR(100),
  is_superadmin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE m_organizations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(100) NOT NULL,
  plan                   VARCHAR(20) NOT NULL DEFAULT 'trial'
                           CHECK (plan IN ('trial', 'basic', 'premium')),
  trial_ends_at          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  subscribed_at          TIMESTAMPTZ,
  plan_expires_at        TIMESTAMPTZ,
  stripe_customer_id     VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  max_members            INTEGER NOT NULL DEFAULT 5,
  created_by             UUID NOT NULL REFERENCES m_users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);

CREATE TABLE m_organization_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES m_organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES m_users(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL DEFAULT 'editor'
                    CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by      UUID REFERENCES m_users(id),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE m_organization_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES m_organizations(id) ON DELETE CASCADE,
  token           VARCHAR(100) UNIQUE NOT NULL
                    DEFAULT encode(gen_random_bytes(32), 'hex'),
  role            VARCHAR(20) NOT NULL DEFAULT 'editor',
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  used_at         TIMESTAMPTZ,
  used_by         UUID REFERENCES m_users(id),
  created_by      UUID NOT NULL REFERENCES m_users(id)
);

CREATE TABLE m_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES m_organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES m_users(id),
  name            VARCHAR(100) NOT NULL,
  relationship    VARCHAR(50),
  birth_date      DATE,
  gender          VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  blood_type      VARCHAR(5)  CHECK (blood_type IN ('A', 'B', 'O', 'AB')),
  allergies       TEXT,
  is_self         BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_color    VARCHAR(7) DEFAULT '#6366f1',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE m_hospitals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES m_organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES m_users(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  departments     TEXT[],
  address         TEXT,
  phone           VARCHAR(20),
  business_hours  TEXT,
  website_url     TEXT,
  notes           TEXT,
  is_favorite     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- =========================================
-- トランザクションテーブル
-- =========================================

CREATE TABLE t_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES m_organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES m_users(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES m_members(id),
  hospital_id     UUID REFERENCES m_hospitals(id),
  hospital_name   VARCHAR(200),
  department      VARCHAR(100),
  visit_date      DATE NOT NULL,
  chief_complaint TEXT,
  diagnosis       TEXT,
  doctor_name     VARCHAR(100),
  next_visit_date DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT hospital_required CHECK (
    hospital_id IS NOT NULL OR hospital_name IS NOT NULL
  )
);

CREATE TABLE t_medications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES m_organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES m_users(id) ON DELETE CASCADE,
  member_id        UUID NOT NULL REFERENCES m_members(id),
  hospital_id      UUID REFERENCES m_hospitals(id),
  drug_name        VARCHAR(200) NOT NULL,
  generic_name     VARCHAR(200),
  dosage           VARCHAR(100),
  frequency        VARCHAR(100),
  prescribed_date  DATE NOT NULL,
  days_supply      INTEGER,
  end_date         DATE,
  drug_type        VARCHAR(50),
  purpose          TEXT,
  precautions      TEXT,
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_times   TIME[],
  is_ongoing       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE TABLE t_visit_medications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id      UUID NOT NULL REFERENCES t_visits(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES t_medications(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (visit_id, medication_id)
);

CREATE TABLE t_medical_expenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES m_organizations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES m_users(id),
  member_id         UUID NOT NULL REFERENCES m_members(id),
  visit_id          UUID REFERENCES t_visits(id),
  expense_date      DATE NOT NULL,
  facility_name     VARCHAR(200) NOT NULL,
  expense_type      VARCHAR(20) NOT NULL DEFAULT 'hospital'
                      CHECK (expense_type IN ('hospital', 'pharmacy', 'other')),
  total_amount      INTEGER NOT NULL CHECK (total_amount >= 0),
  insurance_amount  INTEGER CHECK (insurance_amount >= 0),
  receipt_image_url TEXT,
  gdrive_file_id    TEXT,
  ocr_raw_text      TEXT,
  items             JSONB,
  is_deductible     BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE t_health_checkups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES m_organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES m_users(id),
  member_id        UUID NOT NULL REFERENCES m_members(id),
  checkup_date     DATE NOT NULL,
  facility_name    VARCHAR(200),
  checkup_type     VARCHAR(100),
  overall_judgment VARCHAR(5) CHECK (overall_judgment IN ('A','B','C','D','E')),
  image_urls       TEXT[],
  gdrive_file_ids  TEXT[],
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE t_checkup_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkup_id   UUID NOT NULL REFERENCES t_health_checkups(id) ON DELETE CASCADE,
  item_code    VARCHAR(50) NOT NULL,
  item_name    VARCHAR(100) NOT NULL,
  value        DECIMAL(10, 2),
  unit         VARCHAR(20),
  judgment     VARCHAR(5) CHECK (judgment IN ('A','B','C','D','E')),
  reference_lo DECIMAL(10, 2),
  reference_hi DECIMAL(10, 2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE t_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES m_users(id) ON DELETE CASCADE,
  member_id         UUID REFERENCES m_members(id),
  notification_type VARCHAR(50) NOT NULL,
  reference_id      UUID,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  message           TEXT NOT NULL,
  sent_at           TIMESTAMPTZ,
  is_cancelled      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE t_system_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES m_organizations(id),
  user_id         UUID REFERENCES m_users(id),
  action          VARCHAR(50) NOT NULL,
  resource_type   VARCHAR(50),
  resource_id     UUID,
  metadata        JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
