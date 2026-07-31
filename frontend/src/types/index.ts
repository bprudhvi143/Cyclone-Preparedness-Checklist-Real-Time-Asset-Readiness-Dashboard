export type UserRole = "ADMIN" | "COMMISSIONER" | "ZONE_OFFICER" | "FIELD_OFFICER";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type CycleStatus = "DRAFT" | "ACTIVE" | "COMPLETED";
export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AlertSeverity = "WARNING" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type AssetStatus = "FUNCTIONAL" | "NON_FUNCTIONAL" | "STAGED" | "DISPATCHED";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  zone_id?: string;
  ward_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
}

export interface Ward {
  id: string;
  zone_id: string;
  number: number;
  name: string;
  boundary?: number[][];
}

export interface Shelter {
  id: string;
  ward_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  contact_person?: string;
  contact_phone?: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface Asset {
  id: string;
  category_id: string;
  ward_id: string;
  shelter_id?: string;
  name: string;
  serial_number: string;
  status: AssetStatus;
  latitude?: number;
  longitude?: number;
}

export interface OperationalCycle {
  id: string;
  disaster_type_id: string;
  name: string;
  status: CycleStatus;
  start_date: string;
  end_date?: string;
}

export interface ChecklistQuestion {
  id: string;
  section_id: string;
  question_text: string;
  weight: number;
  requires_photo: boolean;
  is_critical: boolean;
  sort_order: number;
}

export interface ChecklistSection {
  id: string;
  template_id: string;
  title: string;
  sort_order: number;
  questions: ChecklistQuestion[];
}

export interface ChecklistTemplate {
  id: string;
  disaster_type_id: string;
  title: string;
  version: number;
  is_active: boolean;
  sections?: ChecklistSection[];
}

export interface PhotoMetadata {
  id: string;
  response_id: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  uploaded_by: string;
  device_timestamp?: string;
}

export interface ChecklistResponse {
  id: string;
  submission_id: string;
  question_id: string;
  response_value: "YES" | "NO" | "NOT_APPLICABLE";
  remarks?: string;
  photo?: PhotoMetadata;
}

export interface ChecklistSubmission {
  id: string;
  operational_cycle_id: string;
  user_id: string;
  shelter_id?: string;
  asset_id?: string;
  status: SubmissionStatus;
  submitted_gps?: string;
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_remarks?: string;
  submitter?: User;
  shelter?: Shelter;
  asset?: Asset;
  responses: ChecklistResponse[];
}

export interface SystemAlert {
  id: string;
  submission_id: string;
  question_id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  assigned_to?: string;
  resolved_by?: string;
  resolution_remarks?: string;
  triggered_at: string;
  resolved_at?: string;
  submission?: ChecklistSubmission;
  question?: ChecklistQuestion;
  assignee?: User;
}

export interface ReadinessSnapshot {
  id: string;
  operational_cycle_id: string;
  level: "CITY" | "ZONE" | "WARD" | "SHELTER";
  target_id: string;
  overall_score: number;
  category_scores: Record<string, number>;
  calculated_at: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  role: UserRole;
  full_name: string;
}

export interface DashboardStatsResponse {
  overall_readiness: number;
  total_shelters: number;
  ready_shelters: number;
  active_critical_alerts: number;
  total_assets: number;
  functional_asset_pct: number;
  pending_submissions: number;
  recent_activity: {
    id: string;
    description: string;
    timestamp: string;
    ip_address?: string;
  }[];
}
