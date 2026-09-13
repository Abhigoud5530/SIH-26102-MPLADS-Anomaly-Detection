import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RiskSummary } from '../types';
import { ShieldCheck, Info } from 'lucide-react';

interface RiskOverviewProps {
  summary: RiskSummary;
}

const RISK_COLORS = {
  critical: '#450a0a', // dark red
  high: '#e11d48',     // red/rose
  medium: '#d97706',   // amber
  low: '#059669',      // green
};

export const RiskOverview: React.FC<RiskOverviewProps> = ({ summary }) => {
  const total = summary.total_projects || 1;

  const data = [
    {
      name: 'Critical Review',
      value: summary.critical_review,
      color: RISK_COLORS.critical,
      pct: ((summary.critical_review / total) * 100).toFixed(1),
      desc: 'Immediate multi-criteria anomaly indicators',
    },
    {
      name: 'High Risk',
      value: summary.high,
      color: RISK_COLORS.high,
      pct: ((summary.high / total) * 100).toFixed(1),
      desc: 'Substantial peer deviation or similarity',
    },
    {
      name: 'Medium Risk',
      value: summary.medium,
      color: RISK_COLORS.medium,
      pct: ((summary.medium / total) * 100).toFixed(1),
      desc: 'Moderate variance from expenditure baseline',
    },
    {
      name: 'Low Risk',
      value: summary.low,
      color: RISK_COLORS.low,
      pct: ((summary.low / total) * 100).toFixed(1),
      desc: 'Consistent with peer cluster patterns',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-100 gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Portfolio Risk Distribution
          </h2>
          <p className="text-xs text-slate-500">
            Categorization across all analyzed MPLADS projects based on multi-criteria risk scoring.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
          <Info className="w-3.5 h-3.5 text-blue-600" />
          <span>Decision Support Indicator Distribution</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Donut Chart with Centered Total Count */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <div className="w-full h-64 max-w-[280px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded shadow-lg border border-slate-700">
                          <p className="font-bold">{item.name}</p>
                          <p className="text-slate-300">
                            {item.value} projects ({item.pct}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Total Count */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total
              </span>
              <span className="text-3xl font-extrabold text-slate-900 font-mono">
                {summary.total_projects}
              </span>
              <span className="text-[11px] text-slate-400">Analyzed</span>
            </div>
          </div>
        </div>

        {/* Right: Detailed Breakdown & Metrics */}
        <div className="lg:col-span-7 space-y-4">
          {data.map((item) => (
            <div key={item.name} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-bold text-slate-800">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold font-mono text-slate-900">
                    {item.value} <span className="text-xs font-normal text-slate-500">projects</span>
                  </span>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 min-w-[52px] text-right">
                    {item.pct}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(Number(item.pct), item.value > 0 ? 3 : 0)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>

              <p className="text-[11px] text-slate-500 pl-6">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
