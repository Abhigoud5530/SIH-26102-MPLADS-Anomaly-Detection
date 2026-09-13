import React from 'react';
import { AlertTriangle, ShieldAlert, ArrowRight, Eye, Search, AlertCircle } from 'lucide-react';
import { Project } from '../types';
import {
  getProjectRiskScore,
  getProjectConfidence,
  getRiskBadgeClasses,
  displayOrNA,
} from '../utils/formatters';

interface ProjectsRequiringAttentionProps {
  projects: Project[];
  onViewDetails: (project: Project) => void;
  onInvestigate: (project: Project) => void;
}

export const ProjectsRequiringAttention: React.FC<ProjectsRequiringAttentionProps> = ({
  projects,
  onViewDetails,
  onInvestigate,
}) => {
  // Filter for high risk and critical review projects, sorted by risk score descending
  const attentionProjects = projects
    .filter((p) => {
      const lvl = (p.risk_level || '').toUpperCase();
      return lvl.includes('CRITICAL') || lvl.includes('HIGH') || (getProjectRiskScore(p) ?? 0) >= 65;
    })
    .sort((a, b) => (getProjectRiskScore(b) ?? 0) - (getProjectRiskScore(a) ?? 0))
    .slice(0, 6);

  if (attentionProjects.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
          Projects Requiring Attention
        </h2>
        <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <p className="font-semibold text-slate-700">No high-risk projects detected in current filter selection.</p>
          <p className="text-xs text-slate-500 mt-1">All filtered projects meet standard baseline thresholds.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-md">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Projects Requiring Attention
            </h2>
            <p className="text-xs text-slate-500">
              Prioritized projects exhibiting elevated anomaly indicators or significant peer expenditure deviation.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-red-100 text-red-900 rounded-full border border-red-200 self-start sm:self-auto">
          {attentionProjects.length} Critical &amp; High Risk Projects
        </span>
      </div>

      {/* Grid of Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {attentionProjects.map((project) => {
          const score = getProjectRiskScore(project);
          const confidence = getProjectConfidence(project);
          const badge = getRiskBadgeClasses(project.risk_level);
          const primaryIndicator =
            project.risk_reasons && project.risk_reasons.length > 0
              ? project.risk_reasons[0]
              : project.peer_deviation_pct && project.peer_deviation_pct > 50
              ? `Sanction amount is ${project.peer_deviation_pct.toFixed(1)}% above peer average`
              : 'Multi-criteria investigation trigger activated';

          const isCritical = (project.risk_level || '').toUpperCase().includes('CRITICAL');

          return (
            <div
              key={project.project_id}
              className={`rounded-lg border-2 p-5 flex flex-col justify-between transition-all hover:shadow-md ${
                isCritical
                  ? 'border-red-400 bg-gradient-to-b from-red-50/50 to-white'
                  : 'border-rose-300 bg-white'
              }`}
            >
              <div>
                {/* Card Top: ID & Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Project ID
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 font-mono">
                      #{project.project_id}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 text-xs rounded-md uppercase tracking-wider ${badge.badge}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Activity Type */}
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-3 h-10" title={project.activity_type}>
                  {project.activity_type}
                </h3>

                {/* Location Micro-info */}
                <div className="text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100 flex items-center gap-1.5">
                  <span>{project.constituency}</span>
                  <span>&bull;</span>
                  <span>{project.state}</span>
                </div>

                {/* Risk Score & Confidence Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-50 p-3 rounded-md border border-slate-200/80">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Risk Score
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 font-mono">
                      {score !== null ? score.toFixed(1) : 'Not available'}
                      <span className="text-xs text-slate-500 font-normal"> / 100</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Data Confidence
                    </span>
                    <span className="text-xl font-extrabold text-blue-900 font-mono">
                      {confidence !== null ? `${confidence.toFixed(1)}%` : 'Not available'}
                    </span>
                  </div>
                </div>

                {/* Primary Risk Indicator Box */}
                <div className="mb-5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Primary indicator:
                  </span>
                  <div className="text-xs font-semibold text-rose-900 bg-rose-50/80 p-2.5 rounded border border-rose-200/80 flex items-start gap-2">
                    <span className="text-rose-600 font-bold flex-shrink-0 mt-0.5">&bull;</span>
                    <span className="leading-snug">{primaryIndicator}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onViewDetails(project)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInvestigate(project)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#0f2544] hover:bg-[#1a3860] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-blue-300" />
                  <span>Investigate</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
