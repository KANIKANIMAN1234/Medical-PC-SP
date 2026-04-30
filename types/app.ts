// ユーザー・テナント関連
export type UserRole = 'superadmin' | 'owner' | 'editor' | 'viewer';
export type PlanType = 'free' | 'standard' | 'premium';
export type OrgStatus = 'trial' | 'active' | 'cancelled';

export interface AppUser {
  id: string;
  line_uid: string;
  display_name: string;
  picture_url?: string;
  is_superadmin: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: PlanType;
  status: OrgStatus;
  trial_ends_at?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
}

export interface OrganizationUser {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  user?: AppUser;
  organization?: Organization;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  token: string;
  role: UserRole;
  invited_by: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

// 家族メンバー
export interface Member {
  id: string;
  organization_id: string;
  name: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  blood_type?: string;
  notes?: string;
  is_self: boolean;
  created_at: string;
}

// 病院マスタ
export interface Hospital {
  id: string;
  organization_id: string;
  name: string;
  department?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

// 通院記録
export interface Visit {
  id: string;
  organization_id: string;
  member_id: string;
  hospital_id?: string;
  visit_date: string;
  department?: string;
  doctor_name?: string;
  chief_complaint?: string;
  diagnosis?: string;
  next_visit_date?: string;
  next_visit_time?: string;
  notes?: string;
  created_at: string;
  member?: Member;
  hospital?: Hospital;
  medications?: Medication[];
  medical_expenses?: MedicalExpense[];
}

// お薬手帳
export interface Medication {
  id: string;
  organization_id: string;
  member_id: string;
  visit_id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  is_ongoing: boolean;
  notes?: string;
  created_at: string;
  member?: Member;
}

// 医療費
export interface MedicalExpense {
  id: string;
  organization_id: string;
  member_id: string;
  visit_id?: string;
  payment_date: string;
  hospital_name?: string;
  facility_type?: 'hospital' | 'pharmacy' | 'other';
  total_amount: number;
  breakdown?: Record<string, number>;
  receipt_image_url?: string;
  gdrive_file_id?: string;
  is_deductible: boolean;
  notes?: string;
  created_at: string;
  member?: Member;
}

// 健康診断
export type JudgmentLevel = 'A' | 'B' | 'C' | 'D' | 'E';

export interface HealthCheckup {
  id: string;
  organization_id: string;
  member_id: string;
  checkup_date: string;
  facility_name?: string;
  checkup_type?: string;
  overall_judgment?: JudgmentLevel;
  image_urls?: string[];
  gdrive_file_ids?: string[];
  notes?: string;
  created_at: string;
  member?: Member;
  checkup_items?: CheckupItem[];
}

export interface CheckupItem {
  id: string;
  checkup_id: string;
  item_name: string;
  value?: number;
  unit?: string;
  reference_range?: string;
  judgment?: JudgmentLevel;
}

// システムログ
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface SystemLog {
  id: string;
  user_id?: string;
  organization_id?: string;
  action: string;
  target_table?: string;
  target_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  level: LogLevel;
  created_at: string;
  user?: AppUser;
  organization?: Organization;
}

// ダッシュボード集計
export interface DashboardSummary {
  monthly_expense: number;
  yearly_expense: number;
  monthly_visits: number;
  upcoming_visits: Visit[];
  active_medications: Medication[];
  latest_checkup?: HealthCheckup;
  recent_visits: Visit[];
}

// OCR結果
export interface OcrReceiptResult {
  payment_date?: string;
  hospital_name?: string;
  facility_type?: 'hospital' | 'pharmacy' | 'other';
  total_amount?: number;
  breakdown?: Record<string, number>;
  confidence: number;
}

export interface OcrCheckupResult {
  facility_name?: string;
  checkup_date?: string;
  overall_judgment?: JudgmentLevel;
  items: Array<{
    item_name: string;
    value?: number;
    unit?: string;
    reference_range?: string;
    judgment?: JudgmentLevel;
  }>;
  confidence: number;
}
