import { Project, RiskSummary, StateOption, ConstituencyOption, MpOption } from '../types';
import { BENCHMARK_PROJECTS, BENCHMARK_RISK_SUMMARY } from '../data/benchmarkData';
import { getProjectMpName } from '../utils/formatters';

/**
 * Single API service layer for MPLADS AI-Assisted Anomaly Detection & Investigation Support System.
 *
 * Backend URL is centralized here and defaults to http://127.0.0.1:8000.
 * Changing this URL or configuring it via environment variable or in-app settings
 * updates all endpoints uniformly.
 */export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';

const STORAGE_KEY_URL = 'mplads_api_base_url';
const STORAGE_KEY_MODE = 'mplads_data_source_mode';

export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && String(envUrl).trim()) return String(envUrl).trim();

  try {
    const saved = localStorage.getItem(STORAGE_KEY_URL);
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const savedUrl = saved?.trim() || '';

    // When running the downloaded project locally, prefer the local FastAPI
    // backend over an old Render URL that may have been saved by an earlier build.
    if (
      savedUrl &&
      !(currentHost === 'localhost' || currentHost === '127.0.0.1') ||
      (savedUrl && !savedUrl.includes('sih-26102-mplads-anomaly-detection.onrender.com'))
    ) {
      if (savedUrl) return savedUrl;
    }
  } catch {
    // ignore
  }

  return DEFAULT_API_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
  } catch {
    // ignore
  }
}

export function resetApiBaseUrl(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_URL);
  } catch {
    // ignore
  }
}

export type DataSourceMode = 'live' | 'benchmark';

export function getDataSourceMode(): DataSourceMode {
  try {
    const mode = localStorage.getItem(STORAGE_KEY_MODE);
    if (mode === 'benchmark') return 'benchmark';
  } catch {
    // ignore
  }
  return 'live';
}

export function setDataSourceMode(mode: DataSourceMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
  } catch {
    // ignore
  }
}

/**
 * Generic request helper with generous timeout to accommodate Render free-tier cold starts
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 120000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Health check to probe if the backend is reachable
 */
export async function checkBackendHealth(): Promise<{ ok: boolean; statusText?: string }> {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  try {
    const res = await fetchWithTimeout(`${baseUrl}/risk-summary`, { method: 'GET' }, 15000);
    if (res.ok) {
      return { ok: true, statusText: 'Connected' };
    }
    return { ok: false, statusText: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err: any) {
    return { ok: false, statusText: err?.message || 'Connection failed' };
  }
}

/**
 * Safely parses and normalizes a project record from backend response,
 * ensuring administrative jurisdiction and risk indicators are properly structured.
 *
 * Real Backend Schema Note:
 * The Render FastAPI backend returns projects with ML & statistical indicators (anomaly_score,
 * peer_average_amount, final_risk_score, etc.). When state, constituency, or MP are not
 * explicitly keyed in the payload, this normalizer maps each project to its verified MPLADS
 * jurisdiction for the SIH 26102 dataset (State: Andhra Pradesh, Constituency: Vijayawada,
 * MP: Shri Kesineni Srinivas (Nani)). If the backend provides explicit jurisdiction fields,
 * they are preserved with absolute priority.
 */
export interface ProjectContext {
  stateName?: string | null;
  constituencyName?: string | null;
  mpName?: string | null;
}

/**
 * Safely parses and normalizes a project record from backend response,
 * preserving backend ML risk indicators (anomaly_score, final_risk_score, risk_level, data_confidence_pct, risk_reasons).
 * Never overwrites project data with fake or hardcoded jurisdictions.
 */
export function normalizeProject(raw: any, context?: ProjectContext): Project {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }

  // Preserve explicit jurisdiction fields from API, or context from active filter if not present in payload
  const rawState = raw.state || raw.state_name || raw.State || raw.STATE || context?.stateName || null;
  const rawConst = raw.constituency || raw.constituency_name || raw.parliamentary_constituency || raw.Constituency || raw.CONSTITUENCY || context?.constituencyName || null;
  const rawMp = raw.mp || raw.mp_name || raw.member_of_parliament || raw.MP || raw.Mp || context?.mpName || null;

  const resolvedState = rawState ? String(rawState).trim() : null;
  const resolvedConst = rawConst ? String(rawConst).trim() : null;
  const resolvedMp = rawMp ? String(rawMp).trim() : null;

  // Parse risk_reasons into string array
  let reasons: string[] = [];
  if (Array.isArray(raw.risk_reasons)) {
    reasons = raw.risk_reasons.filter(Boolean);
  } else if (typeof raw.risk_reasons === 'string') {
    reasons = raw.risk_reasons
      .split(';')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  return {
    ...raw,
    project_id: raw.project_id !== undefined && raw.project_id !== null ? raw.project_id : '',
    activity_type: raw.activity_type || 'Civil Infrastructure Work',
    work_description: raw.work_description || raw.description || null,
    state: resolvedState,
    constituency: resolvedConst,
    mp: resolvedMp,
    mp_name: resolvedMp,
    sanction_amount: raw.sanction_amount !== undefined && raw.sanction_amount !== null && !isNaN(Number(raw.sanction_amount)) ? Number(raw.sanction_amount) : null,
    total_expenditure: raw.total_expenditure !== undefined && raw.total_expenditure !== null && !isNaN(Number(raw.total_expenditure)) ? Number(raw.total_expenditure) : null,
    anomaly_score: raw.anomaly_score !== undefined && raw.anomaly_score !== null && !isNaN(Number(raw.anomaly_score)) ? Number(raw.anomaly_score) : null,
    peer_average_amount: raw.peer_average_amount !== undefined && raw.peer_average_amount !== null && !isNaN(Number(raw.peer_average_amount)) ? Number(raw.peer_average_amount) : null,
    peer_deviation_pct: raw.peer_deviation_pct !== undefined && raw.peer_deviation_pct !== null && !isNaN(Number(raw.peer_deviation_pct)) ? Number(raw.peer_deviation_pct) : null,
    vendor_name: raw.vendor_name || null,
    vendor_project_count: raw.vendor_project_count !== undefined && raw.vendor_project_count !== null && !isNaN(Number(raw.vendor_project_count)) ? Number(raw.vendor_project_count) : null,
    similarity_pct: raw.similarity_pct !== undefined && raw.similarity_pct !== null && !isNaN(Number(raw.similarity_pct)) ? Number(raw.similarity_pct) : null,
    potential_duplicate: Boolean(raw.potential_duplicate),
    final_risk_score: raw.final_risk_score !== undefined && raw.final_risk_score !== null && !isNaN(Number(raw.final_risk_score))
      ? Number(raw.final_risk_score)
      : (raw.risk_score !== undefined && raw.risk_score !== null && !isNaN(Number(raw.risk_score)) ? Number(raw.risk_score) : null),
    risk_level: raw.risk_level || 'Low',
    data_confidence_pct: raw.data_confidence_pct !== undefined && raw.data_confidence_pct !== null && !isNaN(Number(raw.data_confidence_pct)) ? Number(raw.data_confidence_pct) : null,
    risk_reasons: reasons,
  };
}

export interface ProjectsFilterParams {
  state_id?: string | number | null;
  constituency_id?: string | number | null;
  mp_id?: string | number | null;
  stateName?: string | null;
  constituencyName?: string | null;
  mpName?: string | null;
}

export interface ProjectsResponse {
  total_projects: number;
  projects: Project[];
}

/**
 * GET /projects
 * Returns analyzed projects from the backend.
 * Initial state: GET /projects with no filters.
 * On Apply Filters: calls GET /projects?state_id={stateId}&constituency_id={constituencyId}&mp_id={mpId}
 */
export async function getProjects(params?: ProjectsFilterParams): Promise<ProjectsResponse> {
  const stateId =
    params?.state_id !== undefined && params?.state_id !== null && String(params.state_id).trim() !== ''
      ? Number(params.state_id)
      : null;
  const constituencyId =
    params?.constituency_id !== undefined && params?.constituency_id !== null && String(params.constituency_id).trim() !== ''
      ? Number(params.constituency_id)
      : null;
  const mpId =
    params?.mp_id !== undefined && params?.mp_id !== null && String(params.mp_id).trim() !== ''
      ? Number(params.mp_id)
      : null;

  const hasState = stateId !== null && !isNaN(stateId);
  const hasConstituency = constituencyId !== null && !isNaN(constituencyId);
  const hasMp = mpId !== null && !isNaN(mpId);
  const hasFilter = hasState || hasConstituency || hasMp;
  const hasCompleteFilter = hasState && hasConstituency && hasMp;

  // Never silently turn a partial jurisdiction selection into the unfiltered
  // 37-project benchmark/global dataset.
  if (hasFilter && !hasCompleteFilter) {
    throw new Error('Please select a State, Constituency, and MP before loading filtered projects.');
  }

  // Offline benchmark mode only when no specific filters/MP are selected
  const mode = getDataSourceMode();
  if (mode === 'benchmark' && !hasFilter) {
    return Promise.resolve({
      total_projects: BENCHMARK_PROJECTS.length,
      projects: BENCHMARK_PROJECTS.map((p) => normalizeProject(p)),
    });
  }

  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const searchParams = new URLSearchParams();

  // Send exact numeric IDs to backend, not names
  if (stateId !== null && !isNaN(stateId)) {
    searchParams.set('state_id', String(stateId));
  }
  if (constituencyId !== null && !isNaN(constituencyId)) {
    searchParams.set('constituency_id', String(constituencyId));
  }
  if (mpId !== null && !isNaN(mpId)) {
    searchParams.set('mp_id', String(mpId));
  }

  // Cache-bust live project requests so a newly selected jurisdiction can never
  // reuse a previous browser/proxy response.
  searchParams.set('_ts', String(Date.now()));
  const qs = searchParams.toString();
  const url = qs ? `${baseUrl}/projects?${qs}` : `${baseUrl}/projects`;

  // Required debugging logs
  console.log("Selected IDs:", {
    stateId,
    constituencyId,
    mpId,
  });

  console.log("Filtered projects URL:", url);

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      console.error(`[API ERROR] GET ${url} failed with HTTP ${response.status} ${response.statusText}`);
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();

    const rawList = Array.isArray(data) ? data : (data.projects || data.data || []);
    const totalCount = typeof data?.total_projects === 'number'
      ? data.total_projects
      : (typeof data?.total === 'number' ? data.total : rawList.length);

    console.log("response.total_projects:", totalCount);
    console.log("response.projects.length:", rawList.length);

    const normalizedList = rawList.map((item: any) =>
      normalizeProject(item, {
        stateName: params?.stateName,
        constituencyName: params?.constituencyName,
        mpName: params?.mpName,
      })
    );

    return {
      total_projects: totalCount,
      projects: normalizedList,
    };
  } catch (error: any) {
    console.error(`Failed to fetch /projects from backend (${url}):`, error);
    throw error;
  }
}

/**
 * GET /projects/{project_id}
 * Returns detailed analysis for one project
 */
export async function getProject(projectId: string | number): Promise<Project> {
  const mode = getDataSourceMode();
  if (mode === 'benchmark') {
    const found = BENCHMARK_PROJECTS.find((p) => String(p.project_id) === String(projectId));
    if (found) return Promise.resolve(normalizeProject(found));
    return Promise.reject(new Error(`Project #${projectId} not found in benchmark data.`));
  }

  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  try {
    const response = await fetchWithTimeout(`${baseUrl}/projects/${encodeURIComponent(String(projectId))}`, {}, 60000);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return normalizeProject(data);
  } catch (error: any) {
    console.error(`Failed to fetch /projects/${projectId}:`, error);
    throw error;
  }
}

/**
 * GET /high-risk
 * Returns High and Critical Review projects
 */
export async function getHighRiskProjects(): Promise<Project[]> {
  const mode = getDataSourceMode();
  if (mode === 'benchmark') {
    const filtered = BENCHMARK_PROJECTS.filter((p) => {
      const lvl = (p.risk_level || '').toUpperCase();
      return lvl.includes('HIGH') || lvl.includes('CRITICAL');
    });
    return Promise.resolve(filtered.map((item) => normalizeProject(item)));
  }

  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  try {
    const response = await fetchWithTimeout(`${baseUrl}/high-risk`, {}, 60000);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const rawList = Array.isArray(data) ? data : data.projects || [];
    return rawList.map((item: any) => normalizeProject(item));
  } catch (error: any) {
    console.error('Failed to fetch /high-risk:', error);
    throw error;
  }
}

/**
 * GET /risk-summary
 * Returns: { total_projects, critical_review, high, medium, low }
 */
export async function getRiskSummary(): Promise<RiskSummary> {
  const mode = getDataSourceMode();
  if (mode === 'benchmark') {
    return Promise.resolve({ ...BENCHMARK_RISK_SUMMARY });
  }

  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  try {
    const response = await fetchWithTimeout(`${baseUrl}/risk-summary`);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return {
      total_projects: Number(data.total_projects ?? 0),
      critical_review: Number(data.critical_review ?? 0),
      high: Number(data.high ?? 0),
      medium: Number(data.medium ?? 0),
      low: Number(data.low ?? 0),
    };
  } catch (error: any) {
    console.error('Failed to fetch /risk-summary:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Administrative Hierarchy Endpoints
// - GET /states
// - GET /constituencies/{state_id}
// - GET /mps/{constituency_id}/{state_id}
// ---------------------------------------------------------------------------

function parseStateItem(item: any): StateOption | null {
  if (!item) return null;
  if (typeof item === 'string') {
    const trimmed = item.trim();
    return trimmed ? { id: trimmed, name: trimmed } : null;
  }
  if (typeof item === 'object') {
    const name =
      item.STATE_NAME ||
      item.state_name ||
      item.State_Name ||
      item.name ||
      item.state ||
      item.CAPTION ||
      item.caption ||
      item.title ||
      item.label;
    const id =
      item.STATE_ID !== undefined && item.STATE_ID !== null
        ? item.STATE_ID
        : item.state_id !== undefined && item.state_id !== null
        ? item.state_id
        : item.ID !== undefined && item.ID !== null
        ? item.ID
        : item.id !== undefined && item.id !== null
        ? item.id
        : name;

    if (name) {
      return { id, name: String(name).trim() };
    }
  }
  return null;
}

function parseConstituencyItem(item: any, stateId: string | number): ConstituencyOption | null {
  if (!item) return null;
  if (typeof item === 'string') {
    const trimmed = item.trim();
    return trimmed ? { id: trimmed, name: trimmed, state_id: stateId } : null;
  }
  if (typeof item === 'object') {
    const name =
      item.CAPTION ||
      item.caption ||
      item.CONSTITUENCY_NAME ||
      item.constituency_name ||
      item.name ||
      item.constituency ||
      item.title ||
      item.label;
    const id =
      item.ID !== undefined && item.ID !== null
        ? item.ID
        : item.id !== undefined && item.id !== null
        ? item.id
        : item.CONSTITUENCY_ID !== undefined && item.CONSTITUENCY_ID !== null
        ? item.CONSTITUENCY_ID
        : item.constituency_id !== undefined && item.constituency_id !== null
        ? item.constituency_id
        : name;

    if (name) {
      return {
        id,
        name: String(name).trim(),
        state_id: item.STATE_ID ?? item.state_id ?? stateId,
      };
    }
  }
  return null;
}

function parseMpItem(item: any, stateId: string | number, constituencyId: string | number): MpOption | null {
  if (!item) return null;
  if (typeof item === 'string') {
    const trimmed = item.trim();
    return trimmed ? { id: trimmed, name: trimmed, constituency_id: constituencyId, state_id: stateId } : null;
  }
  if (typeof item === 'object') {
    // API returns { "ID": 3019173, "CAPTION": "Asaduddin Owaisi" }
    const id =
      item.ID !== undefined && item.ID !== null
        ? item.ID
        : item.id !== undefined && item.id !== null
        ? item.id
        : item.MP_ID !== undefined && item.MP_ID !== null
        ? item.MP_ID
        : item.mp_id;

    const caption =
      item.CAPTION ||
      item.caption ||
      item.MP_NAME ||
      item.mp_name ||
      item.name ||
      item.mp ||
      item.title ||
      item.label;

    if (id !== undefined && id !== null) {
      return {
        id: Number(id) || id,
        name: caption ? String(caption).trim() : String(id),
        constituency_id: item.CONSTITUENCY_ID ?? item.constituency_id ?? constituencyId,
        state_id: item.STATE_ID ?? item.state_id ?? stateId,
      };
    }
  }
  return null;
}

/**
 * GET /states
 * Primary and authoritative source for all States and Union Territories.
 * Directly calls the deployed FastAPI backend endpoint.
 */
export async function getStates(): Promise<StateOption[]> {
  const mode = getDataSourceMode();
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');

  if (mode === 'benchmark') {
    const uniqueNames = Array.from(
      new Set(BENCHMARK_PROJECTS.map((p) => p.state?.trim()).filter((s): s is string => Boolean(s)))
    ).sort((a, b) => a.localeCompare(b));
    return uniqueNames.map((name) => ({ id: name, name }));
  }

  const url = `${baseUrl}/states`;
  console.log(`[API REQUEST] GET ${url}`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    console.error(`[API ERROR] GET ${url} failed with HTTP ${res.status} ${res.statusText}`);
    throw new Error(`GET /states failed: HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  console.log(`[API RESPONSE] GET ${url}:`, data);
  const rawList = Array.isArray(data) ? data : (data.states || data.data || []);
  const parsed = rawList.map(parseStateItem).filter((s): s is StateOption => Boolean(s && s.name));

  if (parsed.length === 0) {
    throw new Error('GET /states returned an empty list');
  }

  // Deduplicate by state ID/name and sort alphabetically
  const map = new Map<string | number, StateOption>();
  for (const s of parsed) {
    if (!map.has(s.id)) {
      map.set(s.id, s);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * GET /constituencies/{state_id}
 * Populates Parliamentary Constituency after State selection.
 * Directly calls the deployed FastAPI backend endpoint.
 */
export async function getConstituencies(
  stateId: string | number
): Promise<ConstituencyOption[]> {
  if (stateId === undefined || stateId === null || String(stateId).trim() === '') {
    return [];
  }

  const mode = getDataSourceMode();
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');

  if (mode === 'benchmark') {
    const matching = BENCHMARK_PROJECTS.filter((p) => {
      return p.state?.trim().toLowerCase() === String(stateId).trim().toLowerCase();
    });
    const uniqueNames = Array.from(
      new Set(matching.map((p) => p.constituency?.trim()).filter((c): c is string => Boolean(c)))
    ).sort();
    return uniqueNames.map((name) => ({ id: name, name, state_id: stateId }));
  }

  const url = `${baseUrl}/constituencies/${encodeURIComponent(String(stateId))}`;
  console.log(`[API REQUEST] GET ${url}`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    console.error(`[API ERROR] GET ${url} failed with HTTP ${res.status}`);
    throw new Error(`GET /constituencies/${stateId} failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log(`[API RESPONSE] GET ${url}:`, data);
  const rawList = Array.isArray(data) ? data : (data.constituencies || data.data || []);
  const parsed = rawList
    .map((item: any) => parseConstituencyItem(item, stateId))
    .filter((c): c is ConstituencyOption => Boolean(c && c.name));

  return parsed.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * GET /mps/{state_id}/{constituency_id}
 * Populates Member of Parliament (MP) after Constituency selection.
 * Directly calls the deployed FastAPI backend endpoint.
 * Note: state_id is first parameter, constituency_id is second parameter.
 */
export async function getMps(
  stateId: string | number,
  constituencyId: string | number
): Promise<MpOption[]> {
  if (
    stateId === undefined ||
    stateId === null ||
    String(stateId).trim() === '' ||
    constituencyId === undefined ||
    constituencyId === null ||
    String(constituencyId).trim() === ''
  ) {
    return [];
  }

  const mode = getDataSourceMode();
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');

  if (mode === 'benchmark') {
    return [];
  }

  const url = `${baseUrl}/mps/${encodeURIComponent(String(stateId))}/${encodeURIComponent(String(constituencyId))}`;
  console.log(`[API REQUEST] GET ${url}`);
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    console.error(`[API ERROR] GET ${url} failed with HTTP ${res.status}`);
    throw new Error(`GET /mps/${stateId}/${constituencyId} failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log(`[API RESPONSE] GET ${url}:`, data);
  const rawList = Array.isArray(data) ? data : (data.mps || data.data || []);
  const parsed = rawList
    .map((item: any) => parseMpItem(item, stateId, constituencyId))
    .filter((m): m is MpOption => Boolean(m && m.name && m.id !== undefined && m.id !== null));

  return parsed.sort((a, b) => a.name.localeCompare(b.name));
}

