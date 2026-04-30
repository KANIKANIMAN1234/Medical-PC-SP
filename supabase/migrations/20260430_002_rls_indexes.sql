-- =============================================
-- インデックス・RLS設定
-- =============================================

-- =========================================
-- インデックス
-- =========================================

CREATE INDEX idx_m_org_users_org    ON m_organization_users (organization_id);
CREATE INDEX idx_m_org_users_user   ON m_organization_users (user_id);
CREATE INDEX idx_m_members_org      ON m_members (organization_id);
CREATE INDEX idx_m_hospitals_org    ON m_hospitals (organization_id);
CREATE INDEX idx_t_visits_org       ON t_visits (organization_id);
CREATE INDEX idx_t_visits_member    ON t_visits (member_id);
CREATE INDEX idx_t_visits_date      ON t_visits (visit_date);
CREATE INDEX idx_t_meds_org         ON t_medications (organization_id);
CREATE INDEX idx_t_meds_member      ON t_medications (member_id);
CREATE INDEX idx_t_expenses_org     ON t_medical_expenses (organization_id);
CREATE INDEX idx_t_expenses_member  ON t_medical_expenses (member_id);
CREATE INDEX idx_t_expenses_date    ON t_medical_expenses (expense_date);
CREATE INDEX idx_t_checkups_org     ON t_health_checkups (organization_id);
CREATE INDEX idx_t_checkups_member  ON t_health_checkups (member_id);
CREATE INDEX idx_t_notif_user       ON t_notifications (user_id);
CREATE INDEX idx_t_notif_scheduled  ON t_notifications (scheduled_at) WHERE sent_at IS NULL;

-- =========================================
-- updated_at自動更新トリガー関数
-- =========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_m_organizations_updated
  BEFORE UPDATE ON m_organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_t_visits_updated
  BEFORE UPDATE ON t_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_t_medications_updated
  BEFORE UPDATE ON t_medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_t_expenses_updated
  BEFORE UPDATE ON t_medical_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_t_checkups_updated
  BEFORE UPDATE ON t_health_checkups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================================
-- RLS有効化
-- =========================================

ALTER TABLE m_users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE m_organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE m_organization_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE m_organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE m_members                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE m_hospitals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_visits                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_medications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_visit_medications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_medical_expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_health_checkups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_checkup_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_system_logs             ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS ポリシー
-- =========================================

-- m_users: 自分のレコードのみ参照・更新
CREATE POLICY "m_users_select_self" ON m_users
  FOR SELECT USING (id = (SELECT id FROM m_users WHERE line_user_id = auth.jwt()->>'line_uid') OR
                    (auth.jwt()->>'is_superadmin')::boolean IS TRUE);

CREATE POLICY "m_users_update_self" ON m_users
  FOR UPDATE USING (id = (SELECT id FROM m_users WHERE line_user_id = auth.jwt()->>'line_uid'));

-- 組織関連の共通関数
CREATE OR REPLACE FUNCTION my_organization_ids() RETURNS UUID[] LANGUAGE sql STABLE AS $$
  SELECT ARRAY(
    SELECT organization_id FROM m_organization_users
    WHERE user_id = (SELECT id FROM m_users WHERE line_user_id = auth.jwt()->>'line_uid')
  );
$$;

CREATE OR REPLACE FUNCTION my_user_id() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT id FROM m_users WHERE line_user_id = auth.jwt()->>'line_uid';
$$;

-- m_organizations
CREATE POLICY "m_organizations_select" ON m_organizations
  FOR SELECT USING (id = ANY(my_organization_ids()) AND deleted_at IS NULL);

CREATE POLICY "m_organizations_insert" ON m_organizations
  FOR INSERT WITH CHECK (created_by = my_user_id());

CREATE POLICY "m_organizations_update" ON m_organizations
  FOR UPDATE USING (
    id = ANY(my_organization_ids()) AND
    EXISTS (SELECT 1 FROM m_organization_users
            WHERE organization_id = m_organizations.id
              AND user_id = my_user_id() AND role = 'owner')
  );

-- m_organization_users
CREATE POLICY "m_org_users_select" ON m_organization_users
  FOR SELECT USING (organization_id = ANY(my_organization_ids()));

CREATE POLICY "m_org_users_insert" ON m_organization_users
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM m_organization_users
            WHERE organization_id = m_organization_users.organization_id
              AND user_id = my_user_id() AND role = 'owner')
    OR user_id = my_user_id()
  );

-- m_organization_invitations
CREATE POLICY "m_org_invitations_select" ON m_organization_invitations
  FOR SELECT USING (organization_id = ANY(my_organization_ids()));

CREATE POLICY "m_org_invitations_insert" ON m_organization_invitations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM m_organization_users
            WHERE organization_id = m_organization_invitations.organization_id
              AND user_id = my_user_id() AND role = 'owner')
  );

-- m_members
CREATE POLICY "m_members_select" ON m_members
  FOR SELECT USING (organization_id = ANY(my_organization_ids()) AND deleted_at IS NULL);

CREATE POLICY "m_members_insert" ON m_members
  FOR INSERT WITH CHECK (organization_id = ANY(my_organization_ids()));

CREATE POLICY "m_members_update" ON m_members
  FOR UPDATE USING (organization_id = ANY(my_organization_ids()) AND deleted_at IS NULL);

-- m_hospitals
CREATE POLICY "m_hospitals_select" ON m_hospitals
  FOR SELECT USING (organization_id = ANY(my_organization_ids()) AND deleted_at IS NULL);

CREATE POLICY "m_hospitals_insert" ON m_hospitals
  FOR INSERT WITH CHECK (organization_id = ANY(my_organization_ids()));

CREATE POLICY "m_hospitals_update" ON m_hospitals
  FOR UPDATE USING (organization_id = ANY(my_organization_ids()));

-- t_visits
CREATE POLICY "t_visits_select" ON t_visits
  FOR SELECT USING (organization_id = ANY(my_organization_ids()) AND deleted_at IS NULL);

CREATE POLICY "t_visits_insert" ON t_visits
  FOR INSERT WITH CHECK (organization_id = ANY(my_organization_ids()));

CREATE POLICY "t_visits_update" ON t_visits
  FOR UPDATE USING (organization_id = ANY(my_organization_ids()));

-- t_medications
CREATE POLICY "t_medications_select" ON t_medications
  FOR SELECT USING (organization_id = ANY(my_organization_ids()) AND deleted_at IS NULL);

CREATE POLICY "t_medications_insert" ON t_medications
  FOR INSERT WITH CHECK (organization_id = ANY(my_organization_ids()));

CREATE POLICY "t_medications_update" ON t_medications
  FOR UPDATE USING (organization_id = ANY(my_organization_ids()));

-- t_visit_medications
CREATE POLICY "t_visit_meds_select" ON t_visit_medications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM t_visits WHERE id = visit_id AND organization_id = ANY(my_organization_ids()))
  );

CREATE POLICY "t_visit_meds_insert" ON t_visit_medications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM t_visits WHERE id = visit_id AND organization_id = ANY(my_organization_ids()))
  );

-- t_medical_expenses
CREATE POLICY "t_expenses_select" ON t_medical_expenses
  FOR SELECT USING (organization_id = ANY(my_organization_ids()));

CREATE POLICY "t_expenses_insert" ON t_medical_expenses
  FOR INSERT WITH CHECK (organization_id = ANY(my_organization_ids()));

CREATE POLICY "t_expenses_update" ON t_medical_expenses
  FOR UPDATE USING (organization_id = ANY(my_organization_ids()));

-- t_health_checkups
CREATE POLICY "t_checkups_select" ON t_health_checkups
  FOR SELECT USING (organization_id = ANY(my_organization_ids()));

CREATE POLICY "t_checkups_insert" ON t_health_checkups
  FOR INSERT WITH CHECK (organization_id = ANY(my_organization_ids()));

CREATE POLICY "t_checkups_update" ON t_health_checkups
  FOR UPDATE USING (organization_id = ANY(my_organization_ids()));

-- t_checkup_items
CREATE POLICY "t_checkup_items_select" ON t_checkup_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM t_health_checkups WHERE id = checkup_id AND organization_id = ANY(my_organization_ids()))
  );

CREATE POLICY "t_checkup_items_insert" ON t_checkup_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM t_health_checkups WHERE id = checkup_id AND organization_id = ANY(my_organization_ids()))
  );

-- t_notifications
CREATE POLICY "t_notifications_select" ON t_notifications
  FOR SELECT USING (user_id = my_user_id());

CREATE POLICY "t_notifications_insert" ON t_notifications
  FOR INSERT WITH CHECK (user_id = my_user_id());

-- t_system_logs（サービスロールのみ書き込み可能）
CREATE POLICY "t_system_logs_select" ON t_system_logs
  FOR SELECT USING ((auth.jwt()->>'is_superadmin')::boolean IS TRUE);

-- =========================================
-- 年間医療費集計ビュー
-- =========================================

CREATE OR REPLACE VIEW annual_expenses_summary AS
SELECT
  e.organization_id,
  e.member_id,
  m.name AS member_name,
  EXTRACT(YEAR FROM e.expense_date)::INTEGER AS year,
  SUM(e.total_amount) AS total,
  SUM(CASE WHEN e.is_deductible THEN e.total_amount ELSE 0 END) AS deductible_total
FROM t_medical_expenses e
JOIN m_members m ON m.id = e.member_id
GROUP BY e.organization_id, e.member_id, m.name, EXTRACT(YEAR FROM e.expense_date);

GRANT SELECT ON annual_expenses_summary TO authenticated;
