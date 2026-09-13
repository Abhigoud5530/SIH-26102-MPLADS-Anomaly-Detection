import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { PrimaryFilters, HierarchicalFilters } from './components/PrimaryFilters';
import { SummaryCards } from './components/SummaryCards';
import { RiskOverview } from './components/RiskOverview';
import { ProjectsRequiringAttention } from './components/ProjectsRequiringAttention';
import { ProjectTable } from './components/ProjectTable';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { InvestigationQueueView } from './components/InvestigationQueueView';
import { AnalyticsView } from './components/AnalyticsView';
import { AboutSystemView } from './components/AboutSystemView';

import {
  ActiveTab,
  Project,
  RiskSummary,
  FilterState,
  ConnectionStatus,
  DataSourceMode,
} from './types';
import {
  getProjects,
  getDataSourceMode,
  setDataSourceMode as saveDataSourceMode,
  checkBackendHealth,
} from './services/api';
import { getProjectRiskScore, getProjectMpName } from './utils/formatters';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [backendTotalProjects, setBackendTotalProjects] = useState<number | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>(getDataSourceMode());

  // Administrative Filters State
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    stateId: null,
    constituencyId: null,
    mpId: null,
    stateName: '',
    constituencyName: '',
    mpName: '',
    state: '',
    constituency: '',
    mp: '',
    riskLevel: '',
    searchQuery: '',
  });

  // Selected quick filter from clicking summary cards
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string | null>(null);

  // Active Project for Modal
  const [selectedProjectForModal, setSelectedProjectForModal] = useState<Project | null>(null);
  const requestSequence = React.useRef(0);

  // Clear projects callback when state or constituency or MP changes in dropdowns
  const handleClearProjects = useCallback(() => {
    setProjects([]);
    setBackendTotalProjects(0);
  }, []);

  // Load data function: initial unfiltered dashboard state
  const loadData = useCallback(async () => {
    // Invalidate any in-flight filtered request. Only the newest request may
    // update the dashboard, preventing an older global load from overwriting
    // a newly selected State -> Constituency -> MP result.
    const requestId = ++requestSequence.current;

    setLoading(true);
    setError(null);
    try {
      // 1. Check health
      const isHealthy = await checkBackendHealth();
      const currentMode = getDataSourceMode();

      if (currentMode === 'benchmark') {
        setConnectionStatus('benchmark');
      } else if (isHealthy) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('offline');
      }

      // 2. Initial unfiltered GET /projects call for initial dashboard state
      const projectsResponse = await getProjects();

      // Do not allow a stale unfiltered request to overwrite a newer filtered
      // response.
      if (requestId !== requestSequence.current) return;

      setProjects(projectsResponse.projects);
      setBackendTotalProjects(projectsResponse.total_projects);
    } catch (err: any) {
      if (requestId !== requestSequence.current) return;
      console.error('Failed to load project data:', err);
      setError(err.message || 'Unable to retrieve project data');
      setConnectionStatus('offline');
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Mode Change (Live vs Benchmark)
  const handleModeChange = (newMode: DataSourceMode) => {
    saveDataSourceMode(newMode);
    setDataSourceMode(newMode);

    if (appliedFilters.stateId && appliedFilters.constituencyId && appliedFilters.mpId) {
      handleApplyFilters(appliedFilters);
    } else {
      loadData();
    }
  };

  // Projects list: filtered by search query or risk filter if selected
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (appliedFilters.searchQuery && appliedFilters.searchQuery.trim() !== '') {
      const q = appliedFilters.searchQuery.trim().toLowerCase();
      result = result.filter((p) => {
        const idStr = String(p.project_id).toLowerCase();
        const actStr = (p.activity_type || '').toLowerCase();
        const venStr = (p.vendor_name || '').toLowerCase();
        return idStr.includes(q) || actStr.includes(q) || venStr.includes(q);
      });
    }

    if (selectedRiskFilter) {
      const filterUpper = selectedRiskFilter.toUpperCase();
      result = result.filter((p) => {
        const lvl = (p.risk_level || '').toUpperCase();
        if (filterUpper.includes('CRITICAL')) return lvl.includes('CRITICAL');
        if (filterUpper.includes('HIGH')) return lvl.includes('HIGH');
        if (filterUpper.includes('MED')) return lvl.includes('MED');
        if (filterUpper.includes('LOW')) return lvl.includes('LOW');
        return true;
      });
    }

    return result;
  }, [projects, appliedFilters.searchQuery, selectedRiskFilter]);

  // Risk cards must be calculated directly from the currently selected response.projects:
  // - Total Projects = projects.length / response.total_projects
  // - Critical Review = count where risk_level === "Critical Review"
  // - High Risk = count where risk_level === "High"
  // - Medium Risk = count where risk_level === "Medium"
  // - Low Risk = count where risk_level === "Low"
  const activeSummary = useMemo<RiskSummary>(() => {
    let crit = 0;
    let high = 0;
    let med = 0;
    let low = 0;

    projects.forEach((p) => {
      const lvl = String(p.risk_level || '').trim();
      const upper = lvl.toUpperCase();
      if (lvl === 'Critical Review' || upper === 'CRITICAL REVIEW' || upper === 'CRITICAL') {
        crit++;
      } else if (lvl === 'High' || upper === 'HIGH') {
        high++;
      } else if (lvl === 'Medium' || upper === 'MEDIUM') {
        med++;
      } else if (lvl === 'Low' || upper === 'LOW') {
        low++;
      } else {
        low++;
      }
    });

    const total =
      backendTotalProjects !== null && backendTotalProjects !== undefined
        ? backendTotalProjects
        : projects.length;

    return {
      total_projects: total,
      critical_review: crit,
      high: high,
      medium: med,
      low: low,
    };
  }, [projects, backendTotalProjects]);

  // Investigation Queue Count (Critical + High across entire loaded scope)
  const investigationQueueCount = useMemo(() => {
    return projects.filter((p) => {
      const lvl = (p.risk_level || '').toUpperCase();
      return lvl.includes('CRITICAL') || lvl.includes('HIGH') || (getProjectRiskScore(p) ?? 0) >= 65;
    }).length;
  }, [projects]);

  // Apply filters: fetch ONLY the selected jurisdiction's live dataset.
  const handleApplyFilters = async (newFilters: Partial<FilterState>) => {
    const stateId =
      newFilters.stateId !== undefined && newFilters.stateId !== null && String(newFilters.stateId).trim() !== ''
        ? Number(newFilters.stateId)
        : null;
    const constituencyId =
      newFilters.constituencyId !== undefined && newFilters.constituencyId !== null && String(newFilters.constituencyId).trim() !== ''
        ? Number(newFilters.constituencyId)
        : null;
    const mpId =
      newFilters.mpId !== undefined && newFilters.mpId !== null && String(newFilters.mpId).trim() !== ''
        ? Number(newFilters.mpId)
        : null;

    if (
      stateId === null || constituencyId === null || mpId === null ||
      !Number.isFinite(stateId) || !Number.isFinite(constituencyId) || !Number.isFinite(mpId)
    ) {
      setError('Please select a State, Constituency, and MP before applying filters.');
      setProjects([]);
      setBackendTotalProjects(0);
      return;
    }

    const updatedFilters: FilterState = {
      ...appliedFilters,
      ...newFilters,
      stateId,
      constituencyId,
      mpId,
    };

    setAppliedFilters(updatedFilters);
    setSelectedRiskFilter(null);
    setProjects([]);
    setBackendTotalProjects(0);
    setError(null);
    setLoading(true);

    const requestId = ++requestSequence.current;

    console.log('[FILTER APPLY]', {
      stateId,
      constituencyId,
      mpId,
      stateName: updatedFilters.stateName,
      constituencyName: updatedFilters.constituencyName,
      mpName: updatedFilters.mpName,
    });

    try {
      const res = await getProjects({
        state_id: stateId,
        constituency_id: constituencyId,
        mp_id: mpId,
        stateName: updatedFilters.stateName,
        constituencyName: updatedFilters.constituencyName,
        mpName: updatedFilters.mpName,
      });

      // Ignore a slower response if the user has already selected another jurisdiction.
      if (requestId !== requestSequence.current) return;

      console.log('[FILTER RESULT]', {
        total_projects: res.total_projects,
        projects_length: res.projects.length,
        sample_project_ids: res.projects.slice(0, 5).map((p) => p.project_id),
      });

      setProjects(res.projects);
      setBackendTotalProjects(res.total_projects);
    } catch (err: any) {
      if (requestId !== requestSequence.current) return;
      console.error('Failed to fetch filtered projects:', err);
      setError(err.message || 'Unable to retrieve projects for selected jurisdiction.');
      setProjects([]);
      setBackendTotalProjects(0);
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  };

  // Reset filters: restore global scope and reload initial unfiltered dataset
  const handleResetFilters = async () => {
    requestSequence.current += 1;
    setAppliedFilters({
      stateId: null,
      constituencyId: null,
      mpId: null,
      stateName: '',
      constituencyName: '',
      mpName: '',
      state: '',
      constituency: '',
      mp: '',
      riskLevel: '',
      searchQuery: '',
    });
    setSelectedRiskFilter(null);
    setBackendTotalProjects(null);
    loadData();
  };

  // Filter by clicking Summary card
  const handleFilterByRisk = (riskLevel: string) => {
    if (selectedRiskFilter === riskLevel) {
      setSelectedRiskFilter(null);
    } else {
      setSelectedRiskFilter(riskLevel);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* 1. Official Government Header */}
      <Header
        connectionStatus={connectionStatus}
        dataSourceMode={dataSourceMode}
        onModeChange={handleModeChange}
        onRefresh={() => {
          if (appliedFilters.stateId && appliedFilters.constituencyId && appliedFilters.mpId) {
            handleApplyFilters(appliedFilters);
          } else {
            loadData();
          }
        }}
      />

      {/* 2. Main Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        investigationCount={investigationQueueCount}
      />

      {/* 3. Primary Workspace / Pages */}
      <main className="flex-1 pb-16">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-[#0f2544] animate-spin mb-4" />
            <p className="text-base font-bold text-slate-800">
              Loading MPLADS Anomaly Detection System...
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Synchronizing with FastAPI risk analytics service
            </p>
          </div>
        ) : error ? (
          <div className="max-w-3xl mx-auto px-4 py-16">
            <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-6 text-center shadow-sm">
              <AlertCircle className="w-10 h-10 text-rose-700 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-rose-950">Data Retrieval Notice</h2>
              <p className="text-sm text-rose-800 mt-1 mb-5">{error}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={loadData}
                  className="px-5 py-2.5 bg-[#0f2544] text-white rounded-md font-semibold text-xs flex items-center gap-2 hover:bg-[#1a3860] cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Connection</span>
                </button>
                <button
                  onClick={() => handleModeChange('benchmark')}
                  className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-md font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Switch to Offline Benchmark Dataset
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* PAGE 1: MAIN DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 1. Primary Administrative Filters */}
                <PrimaryFilters
                  projects={projects}
                  appliedFilters={appliedFilters}
                  onApplyFilters={handleApplyFilters}
                  onResetFilters={handleResetFilters}
                  onClearProjects={handleClearProjects}
                  totalFilteredCount={backendTotalProjects ?? projects.length}
                />

                {/* 2. Summary Cards (Total, Critical, High, Medium, Low) */}
                <SummaryCards
                  summary={activeSummary}
                  onFilterByRisk={handleFilterByRisk}
                  selectedRiskFilter={selectedRiskFilter}
                />

                {/* 3. Risk Overview (Donut / Horizontal breakdown + Total) */}
                <RiskOverview summary={activeSummary} />

                {/* 4. Projects Requiring Attention (Top High/Critical Risk Cards) */}
                <ProjectsRequiringAttention
                  projects={projects}
                  onViewDetails={(p) => setSelectedProjectForModal(p)}
                  onInvestigate={(p) => setSelectedProjectForModal(p)}
                />

                {/* 5. Project Risk Analysis Table + Project Search */}
                <ProjectTable
                  projects={filteredProjects}
                  onViewProject={(p) => setSelectedProjectForModal(p)}
                  selectedRiskFilter={selectedRiskFilter}
                  onClearRiskFilter={() => setSelectedRiskFilter(null)}
                />
              </div>
            )}

            {/* PROJECTS TAB: Full Directory Table view with Administrative Filters */}
            {activeTab === 'projects' && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <HierarchicalFilters
                  projects={projects}
                  appliedFilters={appliedFilters}
                  onApplyFilters={handleApplyFilters}
                  onResetFilters={handleResetFilters}
                  onClearProjects={handleClearProjects}
                  totalFilteredCount={backendTotalProjects ?? projects.length}
                />

                <ProjectTable
                  projects={filteredProjects}
                  onViewProject={(p) => setSelectedProjectForModal(p)}
                  selectedRiskFilter={selectedRiskFilter}
                  onClearRiskFilter={() => setSelectedRiskFilter(null)}
                />
              </div>
            )}

            {/* PAGE 2 / 3: INVESTIGATION QUEUE */}
            {activeTab === 'investigation' && (
              <InvestigationQueueView
                projects={projects}
                onInvestigate={(p) => setSelectedProjectForModal(p)}
              />
            )}

            {/* ANALYTICS PAGE */}
            {activeTab === 'analytics' && (
              <AnalyticsView projects={projects} summary={activeSummary} />
            )}

            {/* ABOUT SYSTEM PAGE */}
            {activeTab === 'about' && <AboutSystemView />}
          </>
        )}
      </main>

      {/* PROJECT DETAILS INVESTIGATION MODAL */}
      <ProjectDetailModal
        project={selectedProjectForModal}
        onClose={() => setSelectedProjectForModal(null)}
      />

      {/* Official Government System Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-200">
              MPLADS AI-Assisted Anomaly Detection &amp; Investigation Support System
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Developed for Smart India Hackathon &bull; Dedicated to Ministry of Statistics and Programme Implementation (MoSPI)
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 bg-slate-800 text-slate-300 rounded font-mono text-[11px]">
              Decision Support System &bull; Non-Accusatory Analytical Framework
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
