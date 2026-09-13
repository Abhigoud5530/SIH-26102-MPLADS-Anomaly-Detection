import React, { useState } from 'react';
import {
  RefreshCw,
  ShieldCheck,
  Database,
  Settings2,
  AlertCircle,
  CheckCircle2,
  X,
  Server,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { DataSourceMode, ConnectionStatus } from '../types';
import {
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  DEFAULT_API_BASE_URL,
  checkBackendHealth,
} from '../services/api';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  dataSourceMode: DataSourceMode;
  onModeChange: (mode: DataSourceMode) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  dataSourceMode,
  onModeChange,
  onRefresh,
  isLoading = false,
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customUrl, setCustomUrl] = useState(getApiBaseUrl());
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [lastRefreshed] = useState<Date>(new Date());

  const handleOpenConfig = () => {
    setCustomUrl(getApiBaseUrl());
    setTestResult(null);
    setShowConfigModal(true);
  };

  const handleSaveConfig = () => {
    setApiBaseUrl(customUrl);
    setShowConfigModal(false);
    onRefresh();
  };

  const handleResetUrl = () => {
    resetApiBaseUrl();
    setCustomUrl(DEFAULT_API_BASE_URL);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      setApiBaseUrl(customUrl);
      const isOk = await checkBackendHealth();
      if (isOk) {
        setTestResult({ ok: true, message: 'FastAPI backend connection successful!' });
      } else {
        setTestResult({
          ok: false,
          message: 'Could not connect to FastAPI server. Check if the server is running on this URL.',
        });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <header className="bg-[#0b1b32] text-white border-b border-slate-700 shadow-md">
        {/* Top micro-bar for Government of India / MoSPI context */}
        <div className="bg-[#071324] text-xs text-slate-300 px-4 sm:px-8 py-1.5 flex flex-wrap items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
            <span>Government of India &bull; Ministry of Statistics &amp; Programme Implementation (MoSPI)</span>
            <span className="hidden md:inline text-slate-400">| Smart India Hackathon</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-300 font-medium">MPLADS e-Sakshi Analytics Portal</span>
            <span className="text-emerald-400 font-mono text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              SECURE PORTAL
            </span>
          </div>
        </div>

        {/* Main Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left: Insignia and title */}
            <div className="flex items-center gap-4">
              {/* Government Insignia */}
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-b from-[#162e54] to-[#0f213d] rounded-lg border-2 border-amber-400/70 p-1 flex items-center justify-center shadow-inner">
                <div className="w-full h-full rounded border border-amber-300/40 flex flex-col items-center justify-center bg-[#0b1b32] text-amber-300">
                  <span className="text-[10px] font-bold tracking-widest leading-none">सत्यमेव</span>
                  <span className="text-[9px] font-bold tracking-widest leading-none">जयते</span>
                  <span className="text-[11px] mt-0.5 font-bold tracking-tighter">MPLADS</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                    MPLADS Risk Intelligence
                  </h1>
                  <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-600">
                    Decision Support
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-0.5 flex items-center gap-1.5 font-medium">
                  <span>AI-Assisted Anomaly Detection &amp; Investigation Support System</span>
                </p>
              </div>
            </div>

            {/* Right: Status indicator, timestamp, refresh and config button */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Connection Status Button */}
              <button
                type="button"
                onClick={handleOpenConfig}
                title="Configure Backend API / Switch Dataset"
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-600 transition-colors cursor-pointer"
              >
                {dataSourceMode === 'live' ? (
                  <>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        connectionStatus === 'connected'
                          ? 'bg-emerald-400 ring-4 ring-emerald-950'
                          : connectionStatus === 'checking'
                          ? 'bg-amber-400 ring-4 ring-amber-950 animate-pulse'
                          : 'bg-rose-400 ring-4 ring-rose-950'
                      }`}
                    />
                    <span className="font-semibold">
                      {connectionStatus === 'connected'
                        ? 'Live FastAPI Connected'
                        : connectionStatus === 'checking'
                        ? 'Connecting...'
                        : 'Backend Unreachable'}
                    </span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-amber-300">Benchmark Mode (Active)</span>
                  </>
                )}
                <Settings2 className="w-3.5 h-3.5 ml-1 text-slate-400" />
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                id="header-refresh-btn"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-md font-semibold text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Analyzing...' : 'Refresh Data'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* BACKEND CONFIGURATION / DATA SOURCE MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#0b1b32] text-white p-5 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Backend &amp; Data Source Settings</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-slate-800">
              {/* Data Source Mode Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Operational Data Source Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onModeChange('live')}
                    className={`p-3.5 rounded-lg border-2 text-left transition-all cursor-pointer ${
                      dataSourceMode === 'live'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Server className="w-4 h-4 text-blue-700" />
                      <span className="text-sm">Live FastAPI</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Fetches directly from backend server APIs.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onModeChange('benchmark')}
                    className={`p-3.5 rounded-lg border-2 text-left transition-all cursor-pointer ${
                      dataSourceMode === 'benchmark'
                        ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="w-4 h-4 text-amber-700" />
                      <span className="text-sm">Benchmark Dataset</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Offline evaluation dataset (37 projects).
                    </p>
                  </button>
                </div>
              </div>

              {/* Live Backend Base URL */}
              {dataSourceMode === 'live' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="api-url-input" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      FastAPI Base URL
                    </label>
                    <button
                      type="button"
                      onClick={handleResetUrl}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset to 127.0.0.1:8000</span>
                    </button>
                  </div>
                  <input
                    id="api-url-input"
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8000"
                    className="w-full h-11 px-3.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    All application requests (/projects, /high-risk, /risk-summary) route through this endpoint.
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isTesting ? 'Testing Connection...' : 'Test Backend Connection'}
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`mt-3 p-3 rounded text-xs flex items-center gap-2 ${
                        testResult.ok
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-50 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {testResult.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-5 py-2 rounded-md bg-[#0f2544] hover:bg-[#1a3860] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save &amp; Reload Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
