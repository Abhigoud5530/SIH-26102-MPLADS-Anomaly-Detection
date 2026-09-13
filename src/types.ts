export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL REVIEW' | string;

export interface ProjectTimeline {
  recommendation?: string | null;
  sanction?: string | null;
  first_payment?: string | null;
  last_payment?: string | null;
  completion?: string | null;
}

export interface Project {
  project_id: string | number;
  activity_type: string;
  work_description?: string | null;
  description?: string | null;
  state?: string | null;
  constituency?: string | null;
  mp?: string | null;
  mp_name?: string | null;
  sanction_amount: number | null;
  recommended_amount?: number | null;
  actual_amount?: number | null;
  total_expenditure: number | null;
  anomaly_score: number | null;
  peer_count?: number | null;
  peer_average_amount: number | null;
  peer_deviation_pct: number | null;
  vendor_name: string | null;
  vendor_project_count: number | null;
  vendor_total_expenditure?: number | null;
  vendor_payment_count?: number | null;
  vendor_expenditure_share?: number | null;
  similarity_pct: number | null;
  similar_project_id: string | number | null;
  potential_duplicate: boolean | null;
  final_risk_score: number | null;
  risk_score?: number | null;
  risk_level: RiskLevel;
  data_confidence_pct: number | null;
  data_confidence?: number | null;
  risk_reasons: string[] | null;
  ml_anomaly_component?: number | null;
  peer_comparison_component?: number | null;
  rule_based_component?: number | null;
  recommendation_date?: string | null;
  sanction_date?: string | null;
  first_payment_date?: string | null;
  last_payment_date?: string | null;
  completion_date?: string | null;
  timeline?: ProjectTimeline | null;
  created_at?: string | null;
  status?: string | null;
}

export interface RiskSummary {
  total_projects: number;
  critical_review: number;
  high: number;
  medium: number;
  low: number;
}

export type DataSourceMode = 'live' | 'benchmark';
export type ConnectionStatus = 'connected' | 'offline' | 'checking' | 'benchmark';

export interface FilterState {
  stateId?: string | number | null;
  constituencyId?: string | number | null;
  mpId?: string | number | null;
  stateName?: string;
  constituencyName?: string;
  mpName?: string;
  state?: string;
  constituency?: string;
  mp?: string;
  searchQuery?: string;
  riskLevel?: string;
}

export interface StateOption {
  id: string | number;
  name: string;
}

export interface ConstituencyOption {
  id: string | number;
  name: string;
  state_id?: string | number;
}

export interface MpOption {
  id: string | number;
  name: string;
  constituency_id?: string | number;
  state_id?: string | number;
}

export type ActiveTab = 'dashboard' | 'projects' | 'investigation' | 'analytics' | 'about';
