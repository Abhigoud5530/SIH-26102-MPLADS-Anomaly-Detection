import React, { useState, useMemo } from 'react';
import { Search, Eye, ArrowUpDown, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Project } from '../types';
import {
  formatINR,
  formatPercent,
  getProjectRiskScore,
  getProjectConfidence,
  getRiskBadgeClasses,
  displayOrNA,
} from '../utils/formatters';

interface ProjectTableProps {
  projects: Project[];
  onViewProject: (project: Project) => void;
  selectedRiskFilter?: string | null;
  onClearRiskFilter?: () => void;
}

type SortField = 'project_id' | 'sanction_amount' | 'total_expenditure' | 'anomaly_score' | 'peer_deviation_pct' | 'risk_score' | 'confidence';

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onViewProject,
  selectedRiskFilter,
  onClearRiskFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('risk_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter within already selected administrative scope by search query and optional risk pill
  const filteredProjects = useMemo(() => {
    let list = [...projects];

    // Optional risk category quick filter
    if (selectedRiskFilter && selectedRiskFilter !== 'ALL') {
      list = list.filter((p) => {
        const lvl = (p.risk_level || '').toUpperCase();
        if (selectedRiskFilter === 'CRITICAL REVIEW') return lvl.includes('CRITICAL');
        if (selectedRiskFilter === 'HIGH') return lvl.includes('HIGH');
        if (selectedRiskFilter === 'MEDIUM') return lvl.includes('MED');
        if (selectedRiskFilter === 'LOW') return lvl.includes('LOW');
        return true;
      });
    }

    // Keyword search within ID, Activity or Vendor
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const id = String(p.project_id || '').toLowerCase();
        const activity = String(p.activity_type || '').toLowerCase();
        const desc = String(p.work_description || p.description || '').toLowerCase();
        const vendor = String(p.vendor_name || '').toLowerCase();
        return id.includes(q) || activity.includes(q) || desc.includes(q) || vendor.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'project_id':
          valA = a.project_id;
          valB = b.project_id;
          break;
        case 'sanction_amount':
          valA = a.sanction_amount ?? 0;
          valB = b.sanction_amount ?? 0;
          break;
        case 'total_expenditure':
          valA = a.total_expenditure ?? 0;
          valB = b.total_expenditure ?? 0;
          break;
        case 'anomaly_score':
          valA = a.anomaly_score ?? 0;
          valB = b.anomaly_score ?? 0;
          break;
        case 'peer_deviation_pct':
          valA = a.peer_deviation_pct ?? 0;
          valB = b.peer_deviation_pct ?? 0;
          break;
        case 'confidence':
          valA = getProjectConfidence(a) ?? 0;
          valB = getProjectConfidence(b) ?? 0;
          break;
        case 'risk_score':
        default:
          valA = getProjectRiskScore(a) ?? 0;
          valB = getProjectRiskScore(b) ?? 0;
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [projects, selectedRiskFilter, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-8">
      {/* Table Header Section */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Project Risk Analysis
              </h2>
              {selectedRiskFilter && selectedRiskFilter !== 'ALL' && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-200">
                  <span>Filtered: {selectedRiskFilter}</span>
                  {onClearRiskFilter && (
                    <button
                      onClick={onClearRiskFilter}
                      className="hover:text-red-700 font-bold ml-1 cursor-pointer"
                      title="Clear risk filter"
                    >
                      &times;
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive list of analyzed works with statistical anomaly metrics, peer variance, and explainable risk scores.
            </p>
          </div>

          {/* PROJECT SEARCH: "Search Project ID, Activity or Vendor" */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="project-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search Project ID, Activity or Vendor..."
              className="w-full h-11 pl-9 pr-4 text-sm bg-white border border-slate-300 rounded-md placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[980px]">
          <thead>
            <tr className="bg-[#0f2544] text-white text-xs uppercase tracking-wider font-semibold border-b border-slate-700">
              <th
                onClick={() => handleSort('project_id')}
                className="py-3.5 px-4 cursor-pointer hover:bg-[#16355e] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Project ID</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 max-w-[280px]">Activity</th>
              <th
                onClick={() => handleSort('sanction_amount')}
                className="py-3.5 px-4 cursor-pointer hover:bg-[#16355e] transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Sanction Amount</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('total_expenditure')}
                className="py-3.5 px-4 cursor-pointer hover:bg-[#16355e] transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Expenditure</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('anomaly_score')}
                className="py-3.5 px-4 cursor-pointer hover:bg-[#16355e] transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Anomaly Score</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('peer_deviation_pct')}
                className="py-3.5 px-4 cursor-pointer hover:bg-[#16355e] transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Peer Deviation</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('risk_score')}
                className="py-3.5 px-4 cursor-pointer hover:bg-[#16355e] transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Risk Score</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 text-center">Risk Level</th>
              <th
                onClick={() => handleSort('confidence')}
                className="py-3.5 px-4 cursor-pointer hover:bg-[#16355e] transition-colors text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Confidence</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {paginatedProjects.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 px-4 text-center text-slate-500 bg-slate-50/50">
                  <p className="font-semibold text-base text-slate-800">
                    No projects found for the selected filters.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try adjusting your search query or selecting a different administrative jurisdiction.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedProjects.map((project) => {
                const score = getProjectRiskScore(project);
                const confidence = getProjectConfidence(project);
                const badge = getRiskBadgeClasses(project.risk_level);
                const anomalyScore =
                  project.anomaly_score !== null && project.anomaly_score !== undefined
                    ? Number(project.anomaly_score).toFixed(2)
                    : 'Not available';

                return (
                  <tr
                    key={project.project_id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    {/* Project ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      #{project.project_id}
                    </td>

                    {/* Activity */}
                    <td className="py-3.5 px-4 max-w-[280px]">
                      <div className="font-medium text-slate-900 line-clamp-1" title={project.activity_type}>
                        {project.activity_type}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {project.vendor_name ? `Vendor: ${project.vendor_name}` : `${project.constituency}, ${project.state}`}
                      </div>
                    </td>

                    {/* Sanction Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {formatINR(project.sanction_amount)}
                    </td>

                    {/* Expenditure */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatINR(project.total_expenditure)}
                    </td>

                    {/* Anomaly Score */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-700 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-semibold">
                        {anomalyScore}
                      </span>
                    </td>

                    {/* Peer Deviation */}
                    <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                      {project.peer_deviation_pct !== null && project.peer_deviation_pct !== undefined ? (
                        <span
                          className={`font-semibold text-xs px-2 py-0.5 rounded ${
                            project.peer_deviation_pct > 100
                              ? 'bg-red-100 text-red-900'
                              : project.peer_deviation_pct > 25
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {formatPercent(project.peer_deviation_pct, true)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Not available</span>
                      )}
                    </td>

                    {/* Risk Score */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold whitespace-nowrap">
                      <span
                        className={`text-sm px-2 py-0.5 rounded ${
                          score !== null && score >= 75
                            ? 'text-red-950 font-extrabold bg-red-100'
                            : score !== null && score >= 50
                            ? 'text-rose-700 font-bold bg-rose-50'
                            : score !== null && score >= 35
                            ? 'text-amber-800 bg-amber-50'
                            : 'text-emerald-800 bg-emerald-50'
                        }`}
                      >
                        {score !== null ? score.toFixed(1) : 'N/A'}
                      </span>
                    </td>

                    {/* Risk Level Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs rounded-md uppercase tracking-wider ${badge.badge}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Data Confidence */}
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-700 whitespace-nowrap">
                      {confidence !== null ? `${confidence.toFixed(1)}%` : 'Not available'}
                    </td>

                    {/* Action [ View ] */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewProject(project)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Status Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{' '}
          <span className="font-bold text-slate-900">
            {filteredProjects.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
          </span>{' '}
          to{' '}
          <span className="font-bold text-slate-900">
            {Math.min(currentPage * itemsPerPage, filteredProjects.length)}
          </span>{' '}
          of <span className="font-bold text-slate-900">{filteredProjects.length}</span> projects
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
