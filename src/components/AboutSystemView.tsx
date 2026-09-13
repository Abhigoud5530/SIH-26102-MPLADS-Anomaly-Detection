import React from 'react';
import {
  ShieldAlert,
  Brain,
  Scale,
  DollarSign,
  Users,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Database,
  Terminal,
} from 'lucide-react';

export const AboutSystemView: React.FC = () => {
  const pillars = [
    {
      title: 'Statistical Anomaly Detection',
      icon: Brain,
      description:
        'Employs unsupervised Isolation Forest machine learning algorithms to isolate multi-dimensional expenditure and timeline outliers without relying on pre-labeled bias.',
      tag: 'Machine Learning Outlier Engine',
    },
    {
      title: 'Peer-Group Comparison',
      icon: Scale,
      description:
        'Benchmarks each project against identical activity categories executed within similar geographical, administrative, and economic clusters to spot abnormal variance.',
      tag: 'Peer Variance Analysis',
    },
    {
      title: 'Financial & Expenditure Analysis',
      icon: DollarSign,
      description:
        'Audits relationships between recommended, sanctioned, and actual expenditure amounts, identifying sudden disbursement acceleration or under-utilization patterns.',
      tag: 'Fiscal Chronology',
    },
    {
      title: 'Vendor & Payment Pattern Analysis',
      icon: Users,
      description:
        'Examines contractor portfolio concentrations, disbursement timelines, and multi-contract allocations within individual parliamentary constituencies.',
      tag: 'Contractor Analytics',
    },
    {
      title: 'Project Similarity & Duplicate Detection',
      icon: Copy,
      description:
        'Uses text embeddings and semantic similarity matching to detect potentially duplicate or overlapping project proposals submitted in close proximity.',
      tag: 'NLP Semantic Matching',
    },
    {
      title: 'Explainable Rule-Based Indicators',
      icon: AlertTriangle,
      description:
        'Translates statistical insights into plain-language, audit-ready flags (e.g. "Sanction amount is 245.3% above peer average", "Payment occurred before sanction").',
      tag: 'Transparent Heuristics',
    },
    {
      title: 'Data Confidence Scoring',
      icon: CheckCircle2,
      description:
        'Computes a mathematical confidence score based on the completeness of milestone records, geocodes, and disbursement receipts so officers know data reliability.',
      tag: 'Data Reliability Index',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title Card */}
      <div className="bg-[#0f2544] text-white rounded-xl p-8 mb-8 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded bg-blue-900 border border-blue-600 text-blue-200">
            Smart India Hackathon 2024 &bull; MoSPI
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          About the MPLADS Risk Intelligence System
        </h1>
        <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-3xl">
          This system provides AI-assisted anomaly detection and investigation support for MPLADS projects. It acts as an early-warning analytical layer for district authorities, nodal departments, and central monitors to triage civil works requiring field verification.
        </p>
      </div>

      {/* MANDATORY DISCLAIMER */}
      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-6 mb-8 shadow-xs flex items-start gap-4">
        <div className="p-2.5 bg-amber-100 rounded-lg text-amber-900 flex-shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-950 mb-1">
            Important Regulatory &amp; Investigation Disclaimer
          </h2>
          <p className="text-sm font-medium text-amber-900 leading-relaxed">
            "Risk scores are indicators for investigation and do not establish fraud or wrongdoing."
          </p>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            This application is purely an investigation-decision support tool. Elevated risk scores highlight statistical divergence from peer cohorts or procedural chronology deviations. Definitive findings require on-site engineering verification and administrative inquiry by competent authorities.
          </p>
        </div>
      </div>

      {/* CORE METHODOLOGY PILLARS */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          Integrated Multi-Pillar Analytical Architecture
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          The system combines seven distinct analytical and machine learning capabilities to evaluate each MPLADS record objectively:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-md bg-slate-100 text-[#0f2544]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-700">
                      {p.tag}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-2 pl-11">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* INVESTIGATION TERMINOLOGY POLICY */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
        <h2 className="text-base font-bold text-slate-900 tracking-tight mb-2">
          Investigation-Support Terminology Standards
        </h2>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          In alignment with government audit ethics and natural justice standards, the system strictly utilizes non-accusatory, analytical terminology:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-4">
            <span className="font-bold text-emerald-900 uppercase tracking-wider block mb-2">
              Approved Analytical Language
            </span>
            <ul className="space-y-1.5 text-emerald-950 font-medium">
              <li>✔ "Requires Review"</li>
              <li>✔ "High Risk" / "Critical Review"</li>
              <li>✔ "Potential Anomaly"</li>
              <li>✔ "Investigation Indicator"</li>
              <li>✔ "Potential Duplicate"</li>
              <li>✔ "Unusual Amount" / "Peer Deviation"</li>
            </ul>
          </div>

          <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-4">
            <span className="font-bold text-rose-900 uppercase tracking-wider block mb-2">
              Prohibited Prejudicial Language
            </span>
            <ul className="space-y-1.5 text-rose-950 font-medium line-through">
              <li>✖ "Fraud Detected"</li>
              <li>✖ "Fraudulent Project"</li>
              <li>✖ "Corrupt MP / Vendor"</li>
              <li>✖ "Confirmed Scam"</li>
              <li>✖ "Guilty Contractor"</li>
            </ul>
          </div>
        </div>
      </div>

      {/* TECHNICAL BACKEND DETAILS */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-bold text-slate-900 tracking-tight mb-2 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-700" />
          <span>Backend Architecture &amp; Integration</span>
        </h2>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          The dashboard operates as a lightweight, accessible presentation layer coupled directly to the FastAPI analytical server running on <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-semibold">http://127.0.0.1:8000</code>. It consumes real JSON payloads without altering or inventing statistical figures.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-blue-700 font-bold">GET</span> /projects
            <p className="font-sans text-[11px] text-slate-500 mt-1">Retrieves all analyzed project records</p>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-blue-700 font-bold">GET</span> /projects/&#123;project_id&#125;
            <p className="font-sans text-[11px] text-slate-500 mt-1">Deep inspection &amp; component breakdown</p>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-blue-700 font-bold">GET</span> /high-risk
            <p className="font-sans text-[11px] text-slate-500 mt-1">Retrieves Critical and High risk docket</p>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-blue-700 font-bold">GET</span> /risk-summary
            <p className="font-sans text-[11px] text-slate-500 mt-1">Portfolio distribution counts</p>
          </div>
        </div>
      </div>
    </div>
  );
};
