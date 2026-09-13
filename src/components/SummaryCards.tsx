import React from 'react';
import { Layers, ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { RiskSummary } from '../types';

interface SummaryCardsProps {
  summary: RiskSummary;
  onFilterByRisk?: (level: string) => void;
  selectedRiskFilter?: string | null;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  onFilterByRisk,
  selectedRiskFilter,
}) => {
  const cards = [
    {
      id: 'ALL',
      title: 'TOTAL PROJECTS',
      count: summary.total_projects,
      subtitle: 'Projects analyzed',
      icon: Layers,
      indicator: 'All Analyzed Scope',
      bgClass: 'bg-white',
      borderClass: 'border-slate-300 hover:border-slate-400',
      numColor: 'text-slate-900',
      iconColor: 'text-[#0f2544] bg-slate-100',
      tagClass: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'CRITICAL REVIEW',
      title: 'CRITICAL REVIEW',
      count: summary.critical_review,
      subtitle: 'Immediate attention required',
      icon: ShieldAlert,
      indicator: 'Critical Risk Indicator',
      bgClass: 'bg-red-50/40',
      borderClass: 'border-red-400 hover:border-red-600',
      numColor: 'text-red-950',
      iconColor: 'text-red-100 bg-red-950',
      tagClass: 'bg-red-950 text-red-100 font-bold',
    },
    {
      id: 'HIGH',
      title: 'HIGH RISK',
      count: summary.high,
      subtitle: 'Requires investigation review',
      icon: AlertTriangle,
      indicator: 'High Anomaly Indicator',
      bgClass: 'bg-rose-50/40',
      borderClass: 'border-rose-300 hover:border-rose-500',
      numColor: 'text-rose-700',
      iconColor: 'text-rose-700 bg-rose-100',
      tagClass: 'bg-rose-100 text-rose-800 font-semibold',
    },
    {
      id: 'MEDIUM',
      title: 'MEDIUM RISK',
      count: summary.medium,
      subtitle: 'Standard monitoring review',
      icon: AlertCircle,
      indicator: 'Moderate Deviation',
      bgClass: 'bg-amber-50/40',
      borderClass: 'border-amber-300 hover:border-amber-500',
      numColor: 'text-amber-800',
      iconColor: 'text-amber-700 bg-amber-100',
      tagClass: 'bg-amber-100 text-amber-900 font-semibold',
    },
    {
      id: 'LOW',
      title: 'LOW RISK',
      count: summary.low,
      subtitle: 'Consistent with baseline peers',
      icon: CheckCircle2,
      indicator: 'Baseline Peer Compliance',
      bgClass: 'bg-emerald-50/40',
      borderClass: 'border-emerald-300 hover:border-emerald-500',
      numColor: 'text-emerald-800',
      iconColor: 'text-emerald-700 bg-emerald-100',
      tagClass: 'bg-emerald-100 text-emerald-800 font-semibold',
    },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const isSelected = selectedRiskFilter === card.id;

          return (
            <div
              key={card.id}
              onClick={() => onFilterByRisk && onFilterByRisk(card.id)}
              className={`p-5 rounded-lg border-2 transition-all cursor-pointer shadow-xs ${card.bgClass} ${card.borderClass} ${
                isSelected ? 'ring-2 ring-blue-600 shadow-md' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {card.title}
                </span>
                <div className={`p-2 rounded-md ${card.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              {/* Large readable number */}
              <div className={`text-4xl font-extrabold tracking-tight ${card.numColor} mb-1 font-mono`}>
                {card.count}
              </div>

              {/* Subtitle */}
              <div className="text-xs text-slate-600 font-medium mb-3">
                {card.subtitle}
              </div>

              {/* Tag / Indicator */}
              <div className="pt-2 border-t border-slate-200/70">
                <span className={`inline-block text-[11px] px-2 py-0.5 rounded ${card.tagClass}`}>
                  {card.indicator}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
