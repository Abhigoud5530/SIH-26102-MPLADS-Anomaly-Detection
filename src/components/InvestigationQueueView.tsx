import React, { useState, useMemo } from 'react';
import { AlertTriangle, ShieldAlert, ArrowUpDown, Search, Filter, ChevronRight, Eye } from 'lucide-react';
import { Project } from '../types';
import {
  formatINR,
  getProjectRiskScore,
  getProjectConfidence,
  getRiskBadgeClasses,
  getProjectMpName,
  displayOrNA,
} from '../utils/formatters';

interface InvestigationQueueViewProps {
  projects: Project[];
  onInvestigate: (project: Project) => void;
}

type QueueSortOption = 'risk_score' | 'confidence' | 'sanction_amount' | 'anomaly_score';

export const InvestigationQueueView: React.FC<InvestigationQueueViewProps> = ({
  projects,
  onInvestigate,
}) => {
  const [sortBy, setSortBy] = useState<QueueSortOption>('risk_score');
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'CRITICAL REVIEW' | 'HIGH'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter queue strictly to Critical Review and High Risk
  const queueProjects = useMemo(() => {
    let list = projects.filter((p) => {
      const lvl = (p.risk_level || '').toUpperCase();
      return lvl.includes('CRITICAL') || lvl.includes('HIGH') || (getProjectRiskScore(p) ?? 0) >= 65;
    });

    if (filterLevel !== 'ALL') {
      list = list.filter((p) => {
        const lvl = (p.risk_level || '').toUpperCase();
        if (filterLevel === 'CRITICAL REVIEW') return lvl.includes('CRITICAL');
        if (filterLevel === 'HIGH') return lvl.includes('HIGH');
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const id = String(p.project_id || '').toLowerCase();
        const act = String(p.activity_type || '').toLowerCase();
        const v = String(p.vendor_name || '').toLowerCase();
        const c = String(p.constituency || '').toLowerCase();
        return id.includes(q) || act.includes(q) || v.includes(q) || c.includes(q);
      });
    }

    // Sort by chosen criteria
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortBy) {
        case 'confidence':
          valA = getProjectConfidence(a) ?? 0;
          valB = getProjectConfidence(b) ?? 0;
          break;
        case 'sanction_amount':
          valA = a.sanction_amount ?? 0;
          valB = b.sanction_amount ?? 0;
          break;
        case 'anomaly_score':
          valA = a.anomaly_score ?? 0;
          valB = b.anomaly_score ?? 0;
          break;
        case 'risk_score':
        default:
          valA = getProjectRiskScore(a) ?? 0;
          valB = getProjectRiskScore(b) ?? 0;
          break;
      }

      return valB - valA; // Descending
    });

    return list;
  }, [projects, sortBy, filterLevel, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="bg-[#0f2544] text-white rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-rose-600 rounded-md">
                <AlertTriangle className="w-4 h-4 text-white" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                Priority Docket
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Investigation Queue
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Centralized triage docket containing projects classified as <strong>Critical Review</strong> or <strong>High Risk</strong> requiring field audit, invoice cross-verification, or administrative scrutiny.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-lg border border-slate-700">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Pending Review</span>
              <span className="text-3xl font-extrabold font-mono text-white">
                {queueProjects.length}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-xs text-slate-300">
              <div>High Priority</div>
              <div className="text-slate-400">Decision-support queue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Sort & Search */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Filter tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Filter:
          </span>
          <button
            onClick={() => setFilterLevel('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
              filterLevel === 'ALL'
                ? 'bg-[#0f2544] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Priority
          </button>
          <button
            onClick={() => setFilterLevel('CRITICAL REVIEW')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
              filterLevel === 'CRITICAL REVIEW'
                ? 'bg-red-950 text-red-100'
                : 'bg-red-50 text-red-900 border border-red-200 hover:bg-red-100'
            }`}
          >
            Critical Review Only
          </button>
          <button
            onClick={() => setFilterLevel('HIGH')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
              filterLevel === 'HIGH'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            High Risk Only
          </button>
        </div>

        {/* Right: Sort By selector and search */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="queue-sort-select" className="text-xs font-bold text-slate-600 whitespace-nowrap">
              Sort By:
            </label>
            <select
              id="queue-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as QueueSortOption)}
              className="h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="risk_score">Risk Score (Highest First)</option>
              <option value="confidence">Data Confidence</option>
              <option value="sanction_amount">Sanction Amount</option>
              <option value="anomaly_score">Anomaly Score</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docket..."
              className="w-full h-10 pl-8 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Queue Cards / Rows */}
      {queueProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Projects in Investigation Queue</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            All current projects either fall into standard monitoring categories or match no projects under current filter parameters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queueProjects.map((project, index) => {
            const score = getProjectRiskScore(project);
            const confidence = getProjectConfidence(project);
            const badge = getRiskBadgeClasses(project.risk_level);
            const primaryIndicator =
              project.risk_reasons && project.risk_reasons.length > 0
                ? project.risk_reasons[0]
                : project.peer_deviation_pct && project.peer_deviation_pct > 50
                ? `Sanction amount is ${project.peer_deviation_pct.toFixed(1)}% above peer average`
                : 'Multi-criteria outlier detected by Isolation Forest model';

            const isCritical = (project.risk_level || '').toUpperCase().includes('CRITICAL');

            return (
              <div
                key={project.project_id}
                className={`bg-white rounded-lg border-2 p-5 sm:p-6 shadow-xs transition-all hover:shadow-md ${
                  isCritical ? 'border-red-400 border-l-8 border-l-red-950' : 'border-slate-300 border-l-8 border-l-rose-600'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left info column */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Queue Position #{index + 1}
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        Project #{project.project_id}
                      </span>
                      <span className={`px-2.5 py-0.5 text-xs rounded-md uppercase tracking-wider ${badge.badge}`}>
                        {badge.label}
                      </span>
                      {project.potential_duplicate && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Potential Duplicate
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5 leading-snug">
                      {project.activity_type}
                    </h3>

                    <div className="text-xs text-slate-500 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span><strong>State:</strong> {project.state}</span>
                      <span>&bull;</span>
                      <span><strong>Constituency:</strong> {project.constituency}</span>
                      <span>&bull;</span>
                      <span><strong>MP:</strong> {getProjectMpName(project)}</span>
                      {project.vendor_name && (
                        <>
                          <span>&bull;</span>
                          <span><strong>Vendor:</strong> {project.vendor_name}</span>
                        </>
                      )}
                    </div>

                    {/* Primary Indicator Box */}
                    <div className="bg-rose-50/80 border border-rose-200 rounded-md p-3 text-xs font-semibold text-rose-950 flex items-start gap-2 max-w-3xl">
                      <span className="text-rose-600 font-bold text-sm leading-none mt-0.5">⚠</span>
                      <div>
                        <span className="font-bold text-rose-900">Primary Indicator: </span>
                        <span>{primaryIndicator}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Score & Action Column */}
                  <div className="flex sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between lg:justify-center gap-4 lg:min-w-[200px] border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 text-left lg:text-right">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Risk Score
                        </span>
                        <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
                          {score !== null ? score.toFixed(1) : 'N/A'}
                          <span className="text-xs font-normal text-slate-400">/100</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Confidence
                        </span>
                        <span className="text-base font-bold font-mono text-blue-900">
                          {confidence !== null ? `${confidence.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center lg:self-stretch">
                      <button
                        type="button"
                        onClick={() => onInvestigate(project)}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-[#0f2544] hover:bg-[#1a3860] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Search className="w-3.5 h-3.5 text-blue-300" />
                        <span>Investigate</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
