import React, { useState, useEffect } from 'react';
import { Filter, RotateCcw, MapPin, Building2, User, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Project, FilterState, StateOption, ConstituencyOption, MpOption } from '../types';
import { getStates, getConstituencies, getMps } from '../services/api';

export interface PrimaryFiltersProps {
  projects: Project[];
  appliedFilters: FilterState;
  onApplyFilters: (filters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onClearProjects?: () => void;
  totalFilteredCount: number;
}

export const PrimaryFilters: React.FC<PrimaryFiltersProps> = ({
  projects,
  appliedFilters,
  onApplyFilters,
  onResetFilters,
  onClearProjects,
  totalFilteredCount,
}) => {
  // Store actual numeric/string IDs for API queries
  const [selectedStateId, setSelectedStateId] = useState<string | number | null>(appliedFilters.stateId ?? null);
  const [selectedConstituencyId, setSelectedConstituencyId] = useState<string | number | null>(appliedFilters.constituencyId ?? null);
  const [selectedMpId, setSelectedMpId] = useState<string | number | null>(appliedFilters.mpId ?? null);

  // Store human-readable display names
  const [selectedStateName, setSelectedStateName] = useState<string>(appliedFilters.stateName || appliedFilters.state || '');
  const [selectedConstituencyName, setSelectedConstituencyName] = useState<string>(appliedFilters.constituencyName || appliedFilters.constituency || '');
  const [selectedMpName, setSelectedMpName] = useState<string>(appliedFilters.mpName || appliedFilters.mp || '');

  // Options populated from backend hierarchy endpoints
  const [states, setStates] = useState<StateOption[]>([]);
  const [constituencies, setConstituencies] = useState<ConstituencyOption[]>([]);
  const [mps, setMps] = useState<MpOption[]>([]);

  // Loading states
  const [loadingStates, setLoadingStates] = useState<boolean>(false);
  const [loadingConstituencies, setLoadingConstituencies] = useState<boolean>(false);
  const [loadingMps, setLoadingMps] = useState<boolean>(false);

  // Synchronize local input state when appliedFilters change externally (e.g. on reset)
  useEffect(() => {
    setSelectedStateId(appliedFilters.stateId ?? null);
    setSelectedConstituencyId(appliedFilters.constituencyId ?? null);
    setSelectedMpId(appliedFilters.mpId ?? null);
    setSelectedStateName(appliedFilters.stateName || appliedFilters.state || '');
    setSelectedConstituencyName(appliedFilters.constituencyName || appliedFilters.constituency || '');
    setSelectedMpName(appliedFilters.mpName || appliedFilters.mp || '');
  }, [
    appliedFilters.stateId,
    appliedFilters.constituencyId,
    appliedFilters.mpId,
    appliedFilters.stateName,
    appliedFilters.constituencyName,
    appliedFilters.mpName,
    appliedFilters.state,
    appliedFilters.constituency,
    appliedFilters.mp,
  ]);

  // Load States on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchInitialHierarchy() {
      setLoadingStates(true);
      try {
        const stateList = await getStates();
        if (!isMounted) return;
        setStates(stateList);

        // If an initial stateId exists, load constituencies
        if (appliedFilters.stateId) {
          setLoadingConstituencies(true);
          const constList = await getConstituencies(appliedFilters.stateId);
          if (!isMounted) return;
          setConstituencies(constList);
          setLoadingConstituencies(false);

          // If an initial constituencyId exists, load MPs: GET /mps/{state_id}/{constituency_id}
          if (appliedFilters.constituencyId) {
            setLoadingMps(true);
            const mpList = await getMps(appliedFilters.stateId, appliedFilters.constituencyId);
            if (!isMounted) return;
            setMps(mpList);
            setLoadingMps(false);
          }
        }
      } catch (err) {
        console.error('Failed to load initial states hierarchy:', err);
      } finally {
        if (isMounted) {
          setLoadingStates(false);
          setLoadingConstituencies(false);
          setLoadingMps(false);
        }
      }
    }

    fetchInitialHierarchy();

    return () => {
      isMounted = false;
    };
  }, []);

  // 1. When State changes:
  // selectedConstituency = null
  // selectedMP = null
  // clear old projects.
  // Then fetch GET /constituencies/{state_id}
  const handleStateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rawValue = e.target.value;

    // Reset subordinate selections and clear old projects immediately
    onClearProjects?.();

    if (!rawValue) {
      setSelectedStateId(null);
      setSelectedStateName('');
      setSelectedConstituencyId(null);
      setSelectedConstituencyName('');
      setSelectedMpId(null);
      setSelectedMpName('');
      setConstituencies([]);
      setMps([]);
      return;
    }

    const matchingState = states.find((s) => String(s.id) === String(rawValue));
    const stateId = matchingState ? matchingState.id : (isNaN(Number(rawValue)) ? rawValue : Number(rawValue));
    const stateName = matchingState ? matchingState.name : '';

    setSelectedStateId(stateId);
    setSelectedStateName(stateName);
    setSelectedConstituencyId(null);
    setSelectedConstituencyName('');
    setSelectedMpId(null);
    setSelectedMpName('');
    setConstituencies([]);
    setMps([]);

    setLoadingConstituencies(true);
    try {
      const constList = await getConstituencies(stateId);
      setConstituencies(constList);
    } catch (err) {
      console.error(`Failed to fetch constituencies for state ${stateId}:`, err);
      setConstituencies([]);
    } finally {
      setLoadingConstituencies(false);
    }
  };

  // 2. When Constituency changes:
  // selectedMP = null
  // clear old projects.
  // Then fetch GET /mps/{state_id}/{constituency_id}
  const handleConstituencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rawValue = e.target.value;

    // Reset MP selection and clear old projects immediately
    onClearProjects?.();

    if (!rawValue) {
      setSelectedConstituencyId(null);
      setSelectedConstituencyName('');
      setSelectedMpId(null);
      setSelectedMpName('');
      setMps([]);
      return;
    }

    const matchingConst = constituencies.find((c) => String(c.id) === String(rawValue));
    const constId = matchingConst ? matchingConst.id : (isNaN(Number(rawValue)) ? rawValue : Number(rawValue));
    const constName = matchingConst ? matchingConst.name : '';

    setSelectedConstituencyId(constId);
    setSelectedConstituencyName(constName);
    setSelectedMpId(null);
    setSelectedMpName('');
    setMps([]);

    if (selectedStateId === null || selectedStateId === undefined || String(selectedStateId).trim() === '') {
      return;
    }

    // Call GET /mps/{state_id}/{constituency_id}
    setLoadingMps(true);
    try {
      const mpList = await getMps(selectedStateId, constId);
      setMps(mpList);
    } catch (err) {
      console.error(`Failed to fetch MPs for state ${selectedStateId}, constituency ${constId}:`, err);
      setMps([]);
    } finally {
      setLoadingMps(false);
    }
  };

  // 3. When MP changes: store actual numeric ID returned by /mps
  const handleMpChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rawValue = e.target.value;

    // Do NOT retain the previous project's dataset when selection changes
    onClearProjects?.();

    if (!rawValue) {
      setSelectedMpId(null);
      setSelectedMpName('');
      return;
    }

    const matchingMp = mps.find((m) => String(m.id) === String(rawValue));
    const mpId = matchingMp ? matchingMp.id : (isNaN(Number(rawValue)) ? rawValue : Number(rawValue));
    const mpName = matchingMp ? matchingMp.name : '';

    const numericMpId = typeof mpId === 'number' ? mpId : (!isNaN(Number(mpId)) ? Number(mpId) : mpId);

    setSelectedMpId(numericMpId);
    setSelectedMpName(mpName);
  };

  // 4. Apply filters: passes exact IDs to GET /projects?state_id={...}&constituency_id={...}&mp_id={...}
  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const stateId =
      selectedStateId !== null && selectedStateId !== undefined && String(selectedStateId).trim() !== ''
        ? Number(selectedStateId)
        : null;
    const constituencyId =
      selectedConstituencyId !== null && selectedConstituencyId !== undefined && String(selectedConstituencyId).trim() !== ''
        ? Number(selectedConstituencyId)
        : null;
    const mpId =
      selectedMpId !== null && selectedMpId !== undefined && String(selectedMpId).trim() !== ''
        ? Number(selectedMpId)
        : null;

    onApplyFilters({
      stateId,
      constituencyId,
      mpId,
      stateName: selectedStateName,
      constituencyName: selectedConstituencyName,
      mpName: selectedMpName,
      state: selectedStateName,
      constituency: selectedConstituencyName,
      mp: selectedMpName,
    });
  };

  // 5. Reset filters
  const handleReset = () => {
    setSelectedStateId(null);
    setSelectedStateName('');
    setSelectedConstituencyId(null);
    setSelectedConstituencyName('');
    setSelectedMpId(null);
    setSelectedMpName('');
    setConstituencies([]);
    setMps([]);
    onResetFilters();
  };

  const hasActiveFilters = Boolean(
    appliedFilters.stateId ||
    appliedFilters.constituencyId ||
    appliedFilters.mpId ||
    appliedFilters.state ||
    appliedFilters.constituency ||
    appliedFilters.mp
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 mb-8">
      {/* Filter Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-md">
            <Filter className="w-5 h-5 text-[#0f2544]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Administrative Jurisdiction Filters
            </h2>
            <p className="text-xs text-slate-500">
              Filter analyzed projects hierarchically by State, Parliamentary Constituency, and Member of Parliament.
            </p>
          </div>
        </div>

        {/* Hierarchy Breadcrumb indicator */}
        <div className="flex items-center text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
          <span className="font-semibold text-slate-900">Current Scope:</span>
          <span className="mx-1.5 text-slate-400">/</span>
          <span className={appliedFilters.stateName || appliedFilters.state ? 'text-blue-700 font-semibold' : 'text-slate-500'}>
            {appliedFilters.stateName || appliedFilters.state || 'All States'}
          </span>
          <ChevronRight className="w-3 h-3 mx-1 text-slate-400" />
          <span className={appliedFilters.constituencyName || appliedFilters.constituency ? 'text-blue-700 font-semibold' : 'text-slate-500'}>
            {appliedFilters.constituencyName || appliedFilters.constituency || 'All Constituencies'}
          </span>
          <ChevronRight className="w-3 h-3 mx-1 text-slate-400" />
          <span className={appliedFilters.mpName || appliedFilters.mp ? 'text-blue-700 font-semibold' : 'text-slate-500'}>
            {appliedFilters.mpName || appliedFilters.mp ? (appliedFilters.mpName || appliedFilters.mp || '').split('(')[0].trim() : 'All MPs'}
          </span>
        </div>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleApply}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* 1. STATE (GET /states) */}
          <div>
            <label
              htmlFor="filter-state-select"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>State / Union Territory</span>
              {loadingStates && <Loader2 className="w-3 h-3 text-blue-600 animate-spin ml-auto" />}
            </label>
            <div className="relative">
              <select
                id="filter-state-select"
                value={selectedStateId !== null && selectedStateId !== undefined ? String(selectedStateId) : ''}
                onChange={handleStateChange}
                disabled={loadingStates}
                className="w-full h-12 pl-3 pr-8 text-sm font-semibold text-slate-800 bg-slate-50 hover:bg-white border-2 border-slate-300 focus:border-blue-600 focus:bg-white rounded-md transition-colors appearance-none cursor-pointer outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingStates ? 'Loading States...' : '[ All States / UTs ]'}
                </option>
                {states.map((st) => (
                  <option key={st.id} value={String(st.id)}>
                    {st.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-600">
                ▼
              </div>
            </div>
          </div>

          {/* 2. CONSTITUENCY (GET /constituencies/{state_id}) */}
          <div>
            <label
              htmlFor="filter-constituency-select"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Parliamentary Constituency</span>
              {loadingConstituencies && <Loader2 className="w-3 h-3 text-blue-600 animate-spin ml-auto" />}
            </label>
            <div className="relative">
              <select
                id="filter-constituency-select"
                value={selectedConstituencyId !== null && selectedConstituencyId !== undefined ? String(selectedConstituencyId) : ''}
                onChange={handleConstituencyChange}
                disabled={!selectedStateId || loadingConstituencies}
                className="w-full h-12 pl-3 pr-8 text-sm font-semibold text-slate-800 bg-slate-50 hover:bg-white border-2 border-slate-300 focus:border-blue-600 focus:bg-white rounded-md transition-colors appearance-none cursor-pointer outline-none disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingConstituencies
                    ? 'Loading Constituencies...'
                    : selectedStateName
                    ? `[ All Constituencies in ${selectedStateName} ]`
                    : '[ Select State First ]'}
                </option>
                {constituencies.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-600">
                ▼
              </div>
            </div>
          </div>

          {/* 3. MP (GET /mps/{state_id}/{constituency_id}) */}
          <div>
            <label
              htmlFor="filter-mp-select"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Member of Parliament (MP)</span>
              {loadingMps && <Loader2 className="w-3 h-3 text-blue-600 animate-spin ml-auto" />}
            </label>
            <div className="relative">
              <select
                id="filter-mp-select"
                value={selectedMpId !== null && selectedMpId !== undefined ? String(selectedMpId) : ''}
                onChange={handleMpChange}
                disabled={!selectedConstituencyId || loadingMps}
                className="w-full h-12 pl-3 pr-8 text-sm font-semibold text-slate-800 bg-slate-50 hover:bg-white border-2 border-slate-300 focus:border-blue-600 focus:bg-white rounded-md transition-colors appearance-none cursor-pointer outline-none disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingMps
                    ? 'Loading MPs...'
                    : selectedConstituencyName
                    ? `[ All MPs for ${selectedConstituencyName} ]`
                    : selectedStateName
                    ? '[ Select Constituency First ]'
                    : '[ Select State First ]'}
                </option>
                {mps.map((mp) => (
                  <option key={mp.id} value={String(mp.id)}>
                    {mp.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-600">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Actions Row */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Matching Projects:{' '}
            <span className="font-bold text-slate-900 text-sm">{totalFilteredCount}</span>{' '}
            projects in current selection
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              id="reset-filters-btn"
              onClick={handleReset}
              disabled={!hasActiveFilters && !selectedStateId && !selectedConstituencyId && !selectedMpId}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Reset Filters</span>
            </button>

            <button
              type="submit"
              id="apply-filters-btn"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-[#0f2544] hover:bg-[#1a3860] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Export HierarchicalFilters alias for seamless compatibility
export const HierarchicalFilters = PrimaryFilters;

