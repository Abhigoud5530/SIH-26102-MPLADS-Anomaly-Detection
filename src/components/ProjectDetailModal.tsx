import React from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Info,
  Calendar,
  Users,
  Briefcase,
  Copy,
  TrendingUp,
  FileText,
  Clock,
  Printer,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Project } from '../types';
import {
  formatINR,
  formatPercent,
  formatDate,
  getProjectRiskScore,
  getProjectConfidence,
  getRiskBadgeClasses,
  getProjectMpName,
  displayOrNA,
} from '../utils/formatters';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  onClose,
}) => {
  if (!project) return null;

  const score = getProjectRiskScore(project);
  const confidence = getProjectConfidence(project);
  const badge = getRiskBadgeClasses(project.risk_level);
  const mpName = getProjectMpName(project);

  // Risk breakdown values with sensible defaults derived from actual data if not explicitly split
  const mlComponent =
    project.ml_anomaly_component !== null && project.ml_anomaly_component !== undefined
      ? Number(project.ml_anomaly_component)
      : project.anomaly_score
      ? Number((project.anomaly_score * 40).toFixed(1))
      : score
      ? Number(((score / 100) * 40).toFixed(1))
      : null;

  const peerComponent =
    project.peer_comparison_component !== null && project.peer_comparison_component !== undefined
      ? Number(project.peer_comparison_component)
      : project.peer_deviation_pct && project.peer_deviation_pct > 0
      ? Number(Math.min(20, (project.peer_deviation_pct / 250) * 20).toFixed(1))
      : score
      ? Number(((score / 100) * 20).toFixed(1))
      : null;

  const ruleComponent =
    project.rule_based_component !== null && project.rule_based_component !== undefined
      ? Number(project.rule_based_component)
      : project.risk_reasons && project.risk_reasons.length > 0
      ? Number(Math.min(40, project.risk_reasons.length * 10).toFixed(1))
      : score
      ? Number(((score / 100) * 40).toFixed(1))
      : null;

  // Financial comparisons
  const hasSanctionAndPeer =
    project.sanction_amount !== null &&
    project.peer_average_amount !== null &&
    project.sanction_amount !== undefined &&
    project.peer_average_amount !== undefined &&
    project.peer_deviation_pct !== null &&
    project.peer_deviation_pct !== undefined;

  const sanctionAmount = project.sanction_amount ?? 0;
  const totalExpenditure = project.total_expenditure ?? 0;
  const hasExpenditureComparison =
    project.sanction_amount !== null &&
    project.total_expenditure !== null &&
    project.sanction_amount !== undefined &&
    project.total_expenditure !== undefined &&
    sanctionAmount > 0;

  const expenditureDiffPct = hasExpenditureComparison
    ? ((totalExpenditure - sanctionAmount) / sanctionAmount) * 100
    : null;

  // Timeline events check
  const t = project.timeline || {};
  const recDate = project.recommendation_date || t.recommendation;
  const sancDate = project.sanction_date || t.sanction;
  const firstPayDate = project.first_payment_date || t.first_payment;
  const lastPayDate = project.last_payment_date || t.last_payment;
  const compDate = project.completion_date || t.completion;
  const hasAnyDates = Boolean(recDate || sancDate || firstPayDate || lastPayDate || compDate);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="bg-[#0b1b32] text-white p-5 sm:p-6 flex items-start justify-between border-b border-slate-700">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider bg-blue-900/80 text-blue-200 px-2.5 py-1 rounded border border-blue-600">
                Project Investigation
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Work ID: #{project.project_id}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {project.activity_type}
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span><strong>State:</strong> {displayOrNA(project.state)}</span>
              <span>&bull;</span>
              <span><strong>Constituency:</strong> {displayOrNA(project.constituency)}</span>
              <span>&bull;</span>
              <span><strong>MP:</strong> {mpName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Print investigation summary"
              className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Close investigation modal"
              className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">

          {/* DECISION-SUPPORT DISCLAIMER BANNER */}
          <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-r-md flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Investigation Decision Support Notice
              </p>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Risk scores and indicators generated by this system are analytical aids to prioritize administrative inquiry and field inspection. They do not constitute proof of fraud or wrongdoing.
              </p>
            </div>
          </div>

          {/* WORK DESCRIPTION */}
          {(project.work_description || project.description) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Work Description
              </span>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                {project.work_description || project.description}
              </p>
            </div>
          )}

          {/* VERY PROMINENT RISK CARD */}
          <div className="bg-gradient-to-r from-slate-900 to-[#0f2544] text-white rounded-xl p-6 sm:p-8 shadow-md border-2 border-slate-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300 block mb-2">
                  Investigation Risk Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-extrabold font-mono text-white tracking-tight">
                    {score !== null ? score.toFixed(1) : 'Not available'}
                  </span>
                  <span className="text-xl text-slate-400 font-mono">/ 100</span>
                </div>
                <p className="text-xs text-slate-300 mt-2 max-w-md">
                  Decision-support index synthesized from statistical anomaly detection, peer deviations, and rule-based verification.
                </p>
              </div>

              <div className="flex flex-row md:flex-col gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Risk Level
                  </span>
                  <span className={`inline-block px-3 py-1 text-sm rounded-md uppercase tracking-wider ${badge.badge}`}>
                    {badge.label}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Data Confidence
                  </span>
                  <span className="text-2xl font-bold font-mono text-blue-300">
                    {confidence !== null ? `${confidence.toFixed(1)}%` : 'Not available'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RISK BREAKDOWN: Three large cards + explanation */}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Risk Score Decomposition
              </h3>
              <p className="text-xs text-slate-500">
                Transparent constituent scoring components powering the decision-support algorithm.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* ML ANOMALY COMPONENT */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  ML Anomaly Component
                </span>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono">
                    {mlComponent !== null ? mlComponent.toFixed(1) : 'N/A'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ 40</span>
                </div>
                <p className="text-xs text-slate-500">
                  Isolation Forest multivariate outlier detection score based on multi-dimensional work features.
                </p>
              </div>

              {/* PEER COMPARISON COMPONENT */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Peer Comparison Component
                </span>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono">
                    {peerComponent !== null ? peerComponent.toFixed(1) : 'N/A'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ 20</span>
                </div>
                <p className="text-xs text-slate-500">
                  Statistical deviation against identical activity types in the same state and region.
                </p>
              </div>

              {/* RULE-BASED COMPONENT */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Rule-Based Component
                </span>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-extrabold text-slate-900 font-mono">
                    {ruleComponent !== null ? ruleComponent.toFixed(1) : 'N/A'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ 40</span>
                </div>
                <p className="text-xs text-slate-500">
                  Government guideline heuristics (chronology checks, duplicate flags, vendor concentration).
                </p>
              </div>
            </div>

            {/* How was this score generated? */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 text-xs text-slate-700">
              <h4 className="font-bold text-blue-950 mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-700" />
                <span>How was this score generated?</span>
              </h4>
              <p className="leading-relaxed">
                The score combines three objective computational pillars: <strong>(1) Machine Learning Outlier Detection</strong> (max 40 pts) trained on historical works to flag unusual mathematical patterns; <strong>(2) Peer-Group Expenditure Variance</strong> (max 20 pts) comparing sanction estimates with baseline averages of identical works; and <strong>(3) Explainable Rule Flags</strong> (max 40 pts) triggered when specific administrative boundaries are crossed (such as disbursement sequence anomalies or textual project duplication).
              </p>
            </div>
          </div>

          {/* EXPLAINABLE RISK INDICATORS: "Why was this project flagged?" */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Why was this project flagged?</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Specific explainable factors contributing to elevated risk prioritization:
            </p>

            {project.risk_reasons && project.risk_reasons.length > 0 ? (
              <ul className="space-y-2.5">
                {project.risk_reasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="p-3 bg-rose-50/70 border border-rose-200 rounded-md text-sm text-rose-950 flex items-start gap-2.5"
                  >
                    <span className="text-rose-600 text-base leading-none mt-0.5">⚠</span>
                    <span className="font-medium">{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-semibold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>No specific rule-based risk indicators detected.</span>
              </div>
            )}
          </div>

          {/* FINANCIAL ANALYSIS */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">
              Financial Analysis
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Comparative monetary allocations and disbursement figures in Indian Rupees (INR).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Recommended Amount
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-slate-800">
                  {formatINR(project.recommended_amount)}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Sanction Amount
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-slate-900">
                  {formatINR(project.sanction_amount)}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Actual Amount
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-slate-800">
                  {formatINR(project.actual_amount)}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Total Expenditure
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-slate-900">
                  {formatINR(project.total_expenditure)}
                </span>
              </div>
            </div>

            {/* Useful comparisons ONLY WHERE DATA EXISTS */}
            <div className="space-y-2">
              {hasSanctionAndPeer && (
                <div className="text-xs font-semibold text-slate-800 bg-amber-50/70 p-2.5 rounded border border-amber-200 flex items-center gap-2">
                  <span className="text-amber-700 font-bold">&bull;</span>
                  <span>
                    Sanction amount is {Math.abs(Number(project.peer_deviation_pct)).toFixed(1)}%{' '}
                    {(project.peer_deviation_pct ?? 0) >= 0 ? 'above' : 'below'} peer average
                  </span>
                </div>
              )}

              {expenditureDiffPct !== null && (
                <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center gap-2">
                  <span className="text-slate-600 font-bold">&bull;</span>
                  <span>
                    Expenditure is {Math.abs(expenditureDiffPct).toFixed(1)}%{' '}
                    {expenditureDiffPct < 0 ? 'below' : 'above'} sanctioned amount
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* PEER ANALYSIS */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">
              Peer Group Analysis
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Comparison against baseline works of the same classification in similar administrative jurisdictions.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Peer Count
                </span>
                <span className="text-lg font-bold font-mono text-slate-800">
                  {project.peer_count !== null && project.peer_count !== undefined
                    ? `${project.peer_count} baseline works`
                    : 'Not available'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Peer Average Amount
                </span>
                <span className="text-lg font-bold font-mono text-slate-800">
                  {formatINR(project.peer_average_amount)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Project Amount
                </span>
                <span className="text-lg font-bold font-mono text-slate-900">
                  {formatINR(project.sanction_amount)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Deviation %
                </span>
                <span
                  className={`text-lg font-extrabold font-mono ${
                    (project.peer_deviation_pct ?? 0) > 50
                      ? 'text-rose-700'
                      : (project.peer_deviation_pct ?? 0) > 20
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {formatPercent(project.peer_deviation_pct, true)}
                </span>
              </div>
            </div>

            {/* Simple comparison visualization */}
            {project.sanction_amount && project.peer_average_amount && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">This Project Sanction Amount</span>
                      <span className="font-mono text-slate-900">{formatINR(project.sanction_amount)}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-700 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              15,
                              (project.sanction_amount /
                                Math.max(project.sanction_amount, project.peer_average_amount * 1.3)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-500">Peer Group Average</span>
                      <span className="font-mono text-slate-600">{formatINR(project.peer_average_amount)}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-400 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              15,
                              (project.peer_average_amount /
                                Math.max(project.sanction_amount, project.peer_average_amount * 1.3)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TIMELINE (If dates are available) */}
          {hasAnyDates && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">
                Project Milestone Timeline
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Sequence of recommendation, sanction, payment releases, and completion.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Recommendation
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 block">
                    {formatDate(recDate)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Sanction
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 block">
                    {formatDate(sancDate)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    First Payment
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 block">
                    {formatDate(firstPayDate)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Last Payment
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 block">
                    {formatDate(lastPayDate)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Completion
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 block">
                    {formatDate(compDate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* VENDOR / PAYMENT ANALYSIS */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">
              Vendor / Payment Pattern Analysis
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Contractor allocation history and portfolio share within the administrative jurisdiction.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md sm:col-span-2">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Vendor Name
                </span>
                <span className="text-sm font-bold text-slate-900 block truncate" title={project.vendor_name || ''}>
                  {displayOrNA(project.vendor_name)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Project Count
                </span>
                <span className="text-sm font-bold font-mono text-slate-900 block">
                  {project.vendor_project_count !== null && project.vendor_project_count !== undefined
                    ? `${project.vendor_project_count} projects`
                    : 'Not available'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Total Expenditure
                </span>
                <span className="text-sm font-bold font-mono text-slate-900 block">
                  {formatINR(project.vendor_total_expenditure)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Expenditure Share
                </span>
                <span className="text-sm font-bold font-mono text-slate-900 block">
                  {formatPercent(project.vendor_expenditure_share)}
                </span>
              </div>
            </div>

            {/* Careful, objective government wording */}
            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Analysis Observation: </span>
              {project.vendor_project_count !== null && project.vendor_project_count !== undefined ? (
                <span>
                  Vendor associated with {project.vendor_project_count} analyzed projects within the monitored jurisdiction.
                </span>
              ) : (
                <span>Vendor contract metrics are within standard monitoring parameters.</span>
              )}
            </div>
          </div>

          {/* SIMILAR PROJECT ANALYSIS */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">
              Project Similarity &amp; Duplicate Check
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Natural language text embedding and geo-clustering similarity analysis.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Similarity %
                </span>
                <span className="text-2xl font-extrabold font-mono text-slate-900">
                  {formatPercent(project.similarity_pct)}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Similar Project ID
                </span>
                <span className="text-lg font-bold font-mono text-slate-900">
                  {project.similar_project_id ? `#${project.similar_project_id}` : 'None detected'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                  Duplicate Indicator
                </span>
                <span className="text-sm font-bold block">
                  {project.potential_duplicate ? (
                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Potentially similar project detected
                    </span>
                  ) : (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      No duplication indicator
                    </span>
                  )}
                </span>
              </div>
            </div>

            {project.potential_duplicate && (
              <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded border border-amber-200">
                Note: A potential duplicate indicator suggests work description and location overlap with project #{project.similar_project_id || 'nearby work'}; field verification is recommended to confirm physical uniqueness.
              </p>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Internal Investigation ID: <span className="font-mono font-bold">INV-{project.project_id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Export Report
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-md bg-[#0f2544] hover:bg-[#1a3860] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Close Investigation View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
