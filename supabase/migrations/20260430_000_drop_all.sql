-- =============================================
-- 既存テーブルをすべて削除（依存関係の逆順）
-- Supabase SQL Editor で実行してください
-- =============================================

DROP TABLE IF EXISTS system_logs              CASCADE;
DROP TABLE IF EXISTS notifications            CASCADE;
DROP TABLE IF EXISTS checkup_items            CASCADE;
DROP TABLE IF EXISTS health_checkups          CASCADE;
DROP TABLE IF EXISTS medical_expenses         CASCADE;
DROP TABLE IF EXISTS visit_medications        CASCADE;
DROP TABLE IF EXISTS medications              CASCADE;
DROP TABLE IF EXISTS visits                   CASCADE;
DROP TABLE IF EXISTS hospitals                CASCADE;
DROP TABLE IF EXISTS members                  CASCADE;
DROP TABLE IF EXISTS organization_invitations CASCADE;
DROP TABLE IF EXISTS organization_users       CASCADE;
DROP TABLE IF EXISTS organizations            CASCADE;
DROP TABLE IF EXISTS users                    CASCADE;

-- ビュー削除
DROP VIEW IF EXISTS annual_expenses_summary CASCADE;

-- 関数削除
DROP FUNCTION IF EXISTS is_superadmin()          CASCADE;
DROP FUNCTION IF EXISTS update_updated_at()      CASCADE;
DROP FUNCTION IF EXISTS calc_medication_end_date() CASCADE;
