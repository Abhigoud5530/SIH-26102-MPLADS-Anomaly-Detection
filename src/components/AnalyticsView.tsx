import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Project, RiskSummary } from '../types';
import {
  formatINR,
  formatPercent,
  getProjectRiskScore,
  getProjectConfidence,
} from '../utils/formatters';
import { BarChart3, PieChart as PieIcon, TrendingUp, Users, ShieldAlert, Award } from 'lucide-react';

interface AnalyticsViewProps {
  projects: Project[];
  summary: RiskSummary;
}

const RISK_PALETTE = {
  critical: '#450a0a',
  high: '#e11d48',
  medium: '#d97706',
  low: '#059669',
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ projects, summary }) => {
  // 1. Risk Score Distribution Histogram (0-20, 20-40, 40-60, 60-80, 80-100)
  const scoreBuckets = useMemo(() => {
    const buckets = [
      { range: '0-20 (Low)', count: 0, fill: '#059669' },
      { range: '21-40 (Low-Med)', count: 0, fill: '#10b981' },
      { range: '41-60 (Medium)', count: 0, fill: '#d97706' },
      { range: '61-80 (High)', count: 0, fill: '#e11d48' },
      { range: '81-100 (Critical)', count: 0, fill: '#450a0a' },
    ];

    projects.forEach((p) => {
      const s = getProjectRiskScore(p);
      if (s === null) return;
      if (s <= 20) buckets[0].count++;
      else if (s <= 40) buckets[1].count++;
      else if (s <= 60) buckets[2].count++;
      else if (s <= 80) buckets[3].count++;
      else buckets[4].count++;
    });

    return buckets;
  }, [projects]);

  // 2. Peer Deviation Buckets
  const peerDeviationData = useMemo(() => {
    const buckets = [
      { range: '≤ 0% (Below Baseline)', count: 0, fill: '#059669' },
      { range: '1% - 25% (Normal)', count: 0, fill: '#10b981' },
      { range: '26% - 100% (Moderate)', count: 0, fill: '#d97706' },
      { range: '> 100% (High Outlier)', count: 0, fill: '#e11d48' },
    ];

    projects.forEach((p) => {
      if (p.peer_deviation_pct === null || p.peer_deviation_pct === undefined) return;
      const d = p.peer_deviation_pct;
      if (d <= 0) buckets[0].count++;
      else if (d <= 25) buckets[1].count++;
      else if (d <= 100) buckets[2].count++;
      else buckets[3].count++;
    });

    return buckets;
  }, [projects]);

  // 3. Project Category Distribution
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      // Shorten activity label if very long
      const words = (p.activity_type || 'Unclassified').split(' ').slice(0, 4).join(' ');
      counts[words] = (counts[words] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [projects]);

  // 4. Sanction vs Peer Average for Top Sanctioned Projects
  const sanctionVsPeer = useMemo(() => {
    return [...projects]
      .filter((p) => p.sanction_amount && p.peer_average_amount)
      .sort((a, b) => (b.sanction_amount ?? 0) - (a.sanction_amount ?? 0))
      .slice(0, 6)
      .map((p) => ({
        id: `#${p.project_id}`,
        sanction: p.sanction_amount,
        peerAvg: p.peer_average_amount,
        diffPct: p.peer_deviation_pct,
      }));
  }, [projects]);

  // 5. Vendor Concentration
  const vendorConcentration = useMemo(() => {
    const map: Record<string, { name: string; projectCount: number; totalExp: number }> = {};
    projects.forEach((p) => {
      if (!p.vendor_name) return;
      if (!map[p.vendor_name]) {
        map[p.vendor_name] = {
          name: p.vendor_name,
          projectCount: p.vendor_project_count || 1,
          totalExp: p.vendor_total_expenditure || (p.total_expenditure ?? 0),
        };
      }
    });

    return Object.values(map)
      .sort((a, b) => b.totalExp - a.totalExp)
      .slice(0, 5);
  }, [projects]);

  // 6. Data Confidence Distribution
  const confidenceData = useMemo(() => {
    const buckets = [
      { range: '90% - 100% (High)', count: 0, fill: '#1d4ed8' },
      { range: '80% - 89% (Reliable)', count: 0, fill: '#3b82f6' },
      { range: '< 80% (Moderate)', count: 0, fill: '#93c5fd' },
    ];

    projects.forEach((p) => {
      const c = getProjectConfidence(p);
      if (c === null) return;
      if (c >= 90) buckets[0].count++;
      else if (c >= 80) buckets[1].count++;
      else buckets[2].count++;
    });

    return buckets;
  }, [projects]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-[#0f2544] text-white rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-blue-300" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Portfolio Intelligence
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          MPLADS Statistical &amp; Anomaly Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
          Aggregated quantitative distributions derived directly from the backend analytical engine, covering score spreads, peer deviations, financial variance, and contractor concentrations.
        </p>
      </div>

      {/* Grid of Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* CHART 1: Risk Score Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Risk Score Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Number of projects grouped by final multi-criteria risk score (0-100)
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {projects.length} Works
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#475569' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2.5 rounded shadow border border-slate-700">
                          <p className="font-bold">{data.range}</p>
                          <p className="text-slate-300 font-mono">{data.count} projects</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreBuckets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Peer Deviation Analysis */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Peer Group Deviation Spread
              </h2>
              <p className="text-xs text-slate-500">
                Variance between project sanction amount and baseline average of identical works
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
              Deviation Metric
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peerDeviationData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#475569' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2.5 rounded shadow border border-slate-700">
                          <p className="font-bold">{data.range}</p>
                          <p className="text-slate-300 font-mono">{data.count} projects</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {peerDeviationData.map((entry, index) => (
                    <Cell key={`cell-dev-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Sanction Amount vs Peer Average */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Sanction Amount vs. Peer Average
              </h2>
              <p className="text-xs text-slate-500">
                Side-by-side comparison for highest allocated projects
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
              INR Comparison
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sanctionVsPeer} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="id" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#475569' }}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded shadow border border-slate-700">
                          <p className="font-bold mb-1">Project {d.id}</p>
                          <p className="text-blue-300">Sanction: {formatINR(d.sanction)}</p>
                          <p className="text-slate-400">Peer Avg: {formatINR(d.peerAvg)}</p>
                          {d.diffPct !== undefined && (
                            <p className="text-amber-400 mt-1 font-bold">
                              Deviation: {formatPercent(d.diffPct, true)}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar name="Sanction Amount" dataKey="sanction" fill="#1e3a8a" radius={[3, 3, 0, 0]} />
                <Bar name="Peer Baseline Average" dataKey="peerAvg" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Data Confidence Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Data Confidence Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Algorithm confidence level based on completeness of sanction, expenditure and timeline attributes
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
              Reliability Score
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs p-2.5 rounded shadow border border-slate-700">
                          <p className="font-bold">{data.range}</p>
                          <p className="text-blue-300 font-mono">{data.count} projects</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {confidenceData.map((entry, index) => (
                    <Cell key={`cell-conf-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: Vendor Concentration & Activity Classifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Vendor Concentration */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Contractor / Vendor Concentration
              </h2>
              <p className="text-xs text-slate-500">
                Top vendor entities by aggregated project value within analyzed dataset
              </p>
            </div>
            <Users className="w-4 h-4 text-slate-500" />
          </div>

          {vendorConcentration.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded">
              Vendor data currently not available in dataset.
            </div>
          ) : (
            <div className="space-y-3">
              {vendorConcentration.map((v, i) => (
                <div
                  key={v.name}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between"
                >
                  <div className="max-w-[65%]">
                    <span className="text-xs font-bold text-slate-900 block truncate" title={v.name}>
                      {i + 1}. {v.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Associated with {v.projectCount} analyzed project{v.projectCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-900 block">
                      {formatINR(v.totalExp)}
                    </span>
                    <span className="text-[10px] text-slate-500">Portfolio Value</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Category Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Prominent Work Categories
              </h2>
              <p className="text-xs text-slate-500">
                Most frequent activity classifications within monitored jurisdiction
              </p>
            </div>
            <Award className="w-4 h-4 text-slate-500" />
          </div>

          <div className="space-y-3">
            {categoryData.map((cat, i) => (
              <div key={cat.name} className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-1.5">
                  <span className="truncate pr-2">{cat.name}...</span>
                  <span className="font-mono text-slate-900">{cat.count} works</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 rounded-full"
                    style={{
                      width: `${Math.min(100, (cat.count / Math.max(1, projects.length)) * 100 * 2.5)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
