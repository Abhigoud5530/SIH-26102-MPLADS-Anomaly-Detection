import { Project, RiskLevel } from '../types';

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return 'Not available';
  }
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  }
}

export function formatPercent(val: number | null | undefined, includeSign = false): string {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return 'Not available';
  }
  const num = Number(val);
  const formatted = num.toFixed(1) + '%';
  if (includeSign && num > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') {
    return 'Not available';
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return dateStr;
    }
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function getProjectRiskScore(project: Project): number | null {
  if (project.final_risk_score !== undefined && project.final_risk_score !== null) {
    return Number(project.final_risk_score);
  }
  if (project.risk_score !== undefined && project.risk_score !== null) {
    return Number(project.risk_score);
  }
  return null;
}

export function getProjectConfidence(project: Project): number | null {
  if (project.data_confidence_pct !== undefined && project.data_confidence_pct !== null) {
    return Number(project.data_confidence_pct);
  }
  if (project.data_confidence !== undefined && project.data_confidence !== null) {
    return Number(project.data_confidence);
  }
  return null;
}

export function getProjectMpName(project: Project): string {
  return project.mp_name || project.mp || 'Not available';
}

export function normalizeRiskLevel(level: string | null | undefined): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL REVIEW' | 'UNKNOWN' {
  if (!level) return 'UNKNOWN';
  const clean = level.trim().toUpperCase();
  if (clean.includes('CRITICAL')) return 'CRITICAL REVIEW';
  if (clean.includes('HIGH')) return 'HIGH';
  if (clean.includes('MED')) return 'MEDIUM';
  if (clean.includes('LOW')) return 'LOW';
  return 'UNKNOWN';
}

export function getRiskBadgeClasses(level: string | null | undefined): {
  badge: string;
  dot: string;
  border: string;
  label: string;
} {
  const normalized = normalizeRiskLevel(level);

  switch (normalized) {
    case 'CRITICAL REVIEW':
      return {
        badge: 'bg-red-950 text-red-100 border border-red-800 font-bold',
        dot: 'bg-red-500 ring-2 ring-red-400/40',
        border: 'border-l-4 border-l-red-950 border-red-300',
        label: 'Critical Review',
      };
    case 'HIGH':
      return {
        badge: 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold',
        dot: 'bg-rose-600',
        border: 'border-l-4 border-l-rose-600 border-slate-200',
        label: 'High Risk',
      };
    case 'MEDIUM':
      return {
        badge: 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold',
        dot: 'bg-amber-600',
        border: 'border-l-4 border-l-amber-500 border-slate-200',
        label: 'Medium Risk',
      };
    case 'LOW':
      return {
        badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold',
        dot: 'bg-emerald-600',
        border: 'border-l-4 border-l-emerald-500 border-slate-200',
        label: 'Low Risk',
      };
    default:
      return {
        badge: 'bg-slate-100 text-slate-700 border border-slate-300 font-medium',
        dot: 'bg-slate-400',
        border: 'border-l-4 border-l-slate-400 border-slate-200',
        label: level || 'Not available',
      };
  }
}

export function displayOrNA(val: any): string {
  if (val === null || val === undefined || val === '' || val === 'null') {
    return 'Not available';
  }
  return String(val);
}
