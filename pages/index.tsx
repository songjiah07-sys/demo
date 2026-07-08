import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, LayoutDashboard, Sparkles, MessageCircle,
  Settings, ChevronLeft, ChevronRight, AlertTriangle, X, CheckCircle,
  Sun, Moon, RefreshCw, Loader2, Brain, TrendingUp, Users,
  DollarSign, Clock, Award, Activity, BarChart3, Download
} from 'lucide-react';

import { useHRData } from '@/hooks/useHRData';
import { parseExcelFile } from '@/utils/excelParser';
import { getColumnMapping } from '@/utils/columnMapper';
import { generateExecutiveInsights, generateBoardReport, getStoredApiKey } from '@/services/geminiService';
import { ColumnMapping } from '@/types/hr';

import KpiCard from '@/components/KpiCard';
import FilterPanel from '@/components/FilterPanel';
import {
  HiringTrendChart, TurnoverTrendChart, DepartmentHeadcountChart,
  GenderByDepartmentChart, GenderPieChart, StatusPieChart,
  PerformanceDonutChart, SalaryHistogram, AttritionHeatmap,
  OrgTreeMap, SalaryVsPerformanceScatter
} from '@/components/DashboardCharts';
import ChatInterface from '@/components/ChatInterface';
import SettingsPanel from '@/components/SettingsPanel';
import ExportActions from '@/components/ExportActions';

// ─── Toast Notification ────────────────────────────────────
interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            className={`glass-card rounded-xl px-4 py-3 flex items-start gap-3 border text-sm shadow-xl ${
              t.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10' :
              t.type === 'error'   ? 'border-rose-500/30 bg-rose-500/10' :
              t.type === 'warning' ? 'border-amber-500/30 bg-amber-500/10' :
              'border-primary/30 bg-primary/10'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {t.type === 'error'   && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
            {t.type === 'info'    && <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="text-muted-foreground hover:text-foreground ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Column Mapping Modal ───────────────────────────────────
function ColumnMappingModal({
  headers,
  mapping,
  setMapping,
  onConfirm,
  onClose
}: {
  headers: string[];
  mapping: ColumnMapping;
  setMapping: (m: ColumnMapping) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const fields = [
    { key: 'id', label: 'Employee ID' }, { key: 'name', label: 'Employee Name' },
    { key: 'gender', label: 'Gender' }, { key: 'age', label: 'Age' },
    { key: 'department', label: 'Department' }, { key: 'division', label: 'Division' },
    { key: 'businessUnit', label: 'Business Unit' }, { key: 'position', label: 'Position/Title' },
    { key: 'level', label: 'Level/Grade' }, { key: 'manager', label: 'Manager' },
    { key: 'joinDate', label: 'Join Date' }, { key: 'resignDate', label: 'Resign Date' },
    { key: 'employmentStatus', label: 'Employment Status' }, { key: 'salary', label: 'Salary' },
    { key: 'allowance', label: 'Allowance' }, { key: 'performanceRating', label: 'Performance Rating' },
    { key: 'trainingHours', label: 'Training Hours' }, { key: 'trainingCost', label: 'Training Cost' },
    { key: 'promotion', label: 'Promotion' }, { key: 'absence', label: 'Absence Days' },
    { key: 'leaveDays', label: 'Leave Days' }, { key: 'location', label: 'Location' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Column Mapping Configuration</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Map your spreadsheet columns to standard HR fields. AI has pre-filled suggestions — adjust as needed.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
          {fields.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">{label}</label>
              <select
                value={mapping[key] || ''}
                onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                className="w-full bg-accent/30 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Not Mapped --</option>
                {headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-border flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-accent transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Apply & Load Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Upload / Landing Screen ────────────────────────────────
function UploadScreen({
  onFileSelected,
  isDragging,
  setIsDragging,
  isProcessing
}: {
  onFileSelected: (f: File) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  isProcessing: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }, [onFileSelected, setIsDragging]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 text-xs font-semibold text-primary mb-6">
          <Sparkles className="w-3.5 h-3.5 fill-primary" />
          AI-Powered HR Analytics
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-br from-white via-white/90 to-white/60 bg-clip-text text-transparent">
          HR Analytics
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Dashboard AI
          </span>
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
          Upload your HR Excel spreadsheet and instantly generate an executive analytics dashboard with AI insights, KPI calculations, and interactive visualizations.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-lg relative z-10"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
      >
        <div className={`glass-card rounded-3xl border-2 border-dashed transition-all cursor-pointer p-14 flex flex-col items-center gap-4 ${
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.02]'
            : 'border-border hover:border-primary/50 hover:bg-primary/5'
        } ${isProcessing ? 'pointer-events-none' : ''}`}>
          <div className={`p-5 rounded-2xl transition-all ${isDragging ? 'bg-primary' : 'glass border border-border'}`}>
            {isProcessing
              ? <Loader2 className="w-10 h-10 text-primary animate-spin" />
              : <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-white' : 'text-primary'}`} />
            }
          </div>

          {isProcessing ? (
            <div className="text-center">
              <p className="font-bold text-base">Processing File...</p>
              <p className="text-xs text-muted-foreground">Parsing rows and detecting HR schema</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-bold text-base">{isDragging ? 'Release to upload' : 'Drag & Drop your Excel file'}</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
              <p className="text-[10px] text-muted-foreground/60 mt-3">Supports .xlsx and .xls formats</p>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
        />
      </motion.div>

      {/* Feature badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-3 justify-center mt-8 relative z-10"
      >
        {[
          { icon: Brain, label: 'AI Column Detection' },
          { icon: BarChart3, label: '11 Chart Types' },
          { icon: TrendingUp, label: '25+ HR KPIs' },
          { icon: Download, label: '5 Export Formats' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-border text-xs text-muted-foreground">
            <Icon className="w-3 h-3 text-primary" />
            {label}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────
type Tab = 'dashboard' | 'ai' | 'chat' | 'settings';

export default function Home() {
  const {
    rawRows, setRawRows, headers, setHeaders, sheetNames, setSheetNames,
    selectedSheet, setSelectedSheet, mapping, setMapping,
    filters, filterOptions, filteredRecords, metrics,
    dataAgeBounds, dataSalaryBounds, warnings,
    toggleFilter, setRangeFilter, setDateFilter, setSearchQuery,
    clearAllFilters, resetData
  } = useHRData();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [pendingMapping, setPendingMapping] = useState<ColumnMapping | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastIdCounter, setToastIdCounter] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [aiReport, setAiReport] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingBoardReport, setIsGeneratingBoardReport] = useState(false);
  const [boardReport, setBoardReport] = useState('');
  const [fileName, setFileName] = useState('');

  // Load API key from storage on mount
  useEffect(() => {
    setApiKey(getStoredApiKey());
  }, []);

  // Apply theme class to html element
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.add('light');
    } else {
      html.classList.remove('light');
    }
  }, [theme]);

  // Toast notification helpers
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = toastIdCounter + 1;
    setToastIdCounter(id);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, [toastIdCounter]);

  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  // Process the uploaded file
  const handleFileSelected = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      addToast('error', 'Invalid file type. Please upload a .xlsx or .xls Excel file.');
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const result = await parseExcelFile(file);

      if (result.error) {
        addToast('error', result.error);
        setIsProcessing(false);
        return;
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach(w => addToast('warning', w));
      }

      setRawRows(result.rawRows);
      setHeaders(result.headers);
      setSheetNames(result.sheetNames);
      setSelectedSheet(result.selectedSheet);

      addToast('info', `Loaded "${result.selectedSheet}" with ${result.rawRows.length} rows. Detecting columns...`);

      // Get column mapping
      const currentKey = getStoredApiKey();
      const { mapping: detectedMapping, suggestions } = await getColumnMapping(
        result.headers,
        result.rawRows,
        currentKey || undefined
      );

      const highConfidenceFields = suggestions.filter(s => s.confidence === 'high').length;
      const method = currentKey ? 'Gemini AI' : 'fuzzy rules';
      addToast('success', `Columns detected via ${method}: ${highConfidenceFields} high-confidence matches.`);

      setPendingMapping(detectedMapping);
      setShowMappingModal(true);
    } catch (err: any) {
      addToast('error', err.message || 'Unexpected error parsing the Excel file.');
    } finally {
      setIsProcessing(false);
    }
  }, [addToast, setRawRows, setHeaders, setSheetNames, setSelectedSheet]);

  const handleConfirmMapping = () => {
    if (pendingMapping) {
      setMapping(pendingMapping);
      setShowMappingModal(false);
      addToast('success', `Dashboard loaded! ${rawRows.length} records imported.`);
    }
  };

  const handleReset = () => {
    resetData();
    setAiReport('');
    setBoardReport('');
    setFileName('');
    setActiveTab('dashboard');
  };

  const handleGenerateInsights = async () => {
    if (!apiKey) {
      addToast('warning', 'Please configure your Gemini API Key in Settings first.');
      setActiveTab('settings');
      return;
    }
    setIsGeneratingReport(true);
    try {
      const report = await generateExecutiveInsights(metrics, apiKey);
      setAiReport(report);
      addToast('success', 'Executive Insights generated successfully!');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to generate AI insights.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleGenerateBoardReport = async () => {
    if (!apiKey) {
      addToast('warning', 'Please configure your Gemini API Key in Settings first.');
      setActiveTab('settings');
      return;
    }
    setIsGeneratingBoardReport(true);
    try {
      const report = await generateBoardReport(metrics, apiKey);
      setBoardReport(report);
      addToast('success', 'Board-ready Strategic Report generated!');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to generate board report.');
    } finally {
      setIsGeneratingBoardReport(false);
    }
  };

  const hasData = rawRows.length > 0 && mapping !== null;

  return (
    <>
      <Head>
        <title>HR Analytics Dashboard AI</title>
        <meta name="description" content="Upload HR Excel data and instantly generate executive analytics, KPIs, AI insights, and reports with Google Gemini." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen flex flex-col bg-background text-foreground">
        {/* ─── Top Navigation Bar ─────────────────────────── */}
        <header className="glass border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-none">HR Analytics Dashboard AI</h1>
              {fileName && (
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                  {fileName} · {filteredRecords.length.toLocaleString()} records
                </p>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-1.5">
            {([
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'ai', icon: Sparkles, label: 'AI Insights' },
              { id: 'chat', icon: MessageCircle, label: 'AI Chat' },
              { id: 'settings', icon: Settings, label: 'Settings' },
            ] as { id: Tab; icon: any; label: string }[]).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                disabled={!hasData && id !== 'settings'}
                onClick={() => setActiveTab(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}

            <div className="h-5 w-px bg-border mx-1" />

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {hasData && (
              <button
                onClick={handleReset}
                title="Upload New File"
                className="p-2 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </nav>
        </header>

        {/* ─── Main Content ───────────────────────────────── */}
        {!hasData ? (
          <UploadScreen
            onFileSelected={handleFileSelected}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            isProcessing={isProcessing}
          />
        ) : (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* ─── Sidebar Filter Panel ───────────── */}
            <AnimatePresence>
              {sidebarOpen && activeTab === 'dashboard' && (
                <motion.aside
                  key="sidebar"
                  initial={{ x: -320, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -320, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                  className="shrink-0 overflow-hidden"
                >
                  <FilterPanel
                    filters={filters}
                    filterOptions={filterOptions}
                    toggleFilter={toggleFilter}
                    setRangeFilter={setRangeFilter}
                    setDateFilter={setDateFilter}
                    setSearchQuery={setSearchQuery}
                    clearAllFilters={clearAllFilters}
                    dataAgeBounds={dataAgeBounds}
                    dataSalaryBounds={dataSalaryBounds}
                  />
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Sidebar Toggle Button */}
            {activeTab === 'dashboard' && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="shrink-0 w-5 bg-border/20 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all flex items-center justify-center"
                title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
              >
                {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}

            {/* ─── Main Dashboard Area ────────────── */}
            <main className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

                {/* ─── DASHBOARD TAB ──────────── */}
                {activeTab === 'dashboard' && (
                  <>
                    {/* Warnings Banner */}
                    {warnings.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-300 space-y-1">
                          {warnings.map((w, i) => <p key={i}>{w}</p>)}
                        </div>
                      </div>
                    )}

                    {/* Active Filters Summary */}
                    {(filters.departments.length > 0 || filters.genders.length > 0 || filters.locations.length > 0 || filters.employmentStatuses.length > 0 || filters.searchQuery) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground font-semibold">Active filters:</span>
                        {filters.departments.map(d => (
                          <span key={d} onClick={() => toggleFilter('departments', d)} className="cursor-pointer px-2.5 py-1 rounded-full glass border border-border hover:border-primary/40 flex items-center gap-1.5">
                            {d} <X className="w-2.5 h-2.5" />
                          </span>
                        ))}
                        {filters.genders.map(g => (
                          <span key={g} onClick={() => toggleFilter('genders', g)} className="cursor-pointer px-2.5 py-1 rounded-full glass border border-border hover:border-primary/40 flex items-center gap-1.5">
                            {g} <X className="w-2.5 h-2.5" />
                          </span>
                        ))}
                        {filters.locations.map(l => (
                          <span key={l} onClick={() => toggleFilter('locations', l)} className="cursor-pointer px-2.5 py-1 rounded-full glass border border-border hover:border-primary/40 flex items-center gap-1.5">
                            {l} <X className="w-2.5 h-2.5" />
                          </span>
                        ))}
                        {filters.searchQuery && (
                          <span onClick={() => setSearchQuery('')} className="cursor-pointer px-2.5 py-1 rounded-full glass border border-border hover:border-primary/40 flex items-center gap-1.5">
                            Search: "{filters.searchQuery}" <X className="w-2.5 h-2.5" />
                          </span>
                        )}
                        <button onClick={clearAllFilters} className="px-2.5 py-1 text-rose-400 hover:text-rose-300 font-semibold">Clear All</button>
                      </div>
                    )}

                    {/* ─── KPI Cards Grid ─────── */}
                    <div id="kpi-section">
                      <h2 className="text-base font-bold mb-4 text-foreground/80">Key Performance Indicators</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                        <KpiCard
                          title="Headcount"
                          value={metrics.headcount.toLocaleString()}
                          subtext={`${metrics.activeCount} active · ${metrics.resignedCount} resigned`}
                          icon={<Users className="w-4 h-4" />}
                        />
                        <KpiCard
                          title="Turnover Rate"
                          value={`${metrics.turnoverRate}%`}
                          subtext={`${metrics.resignedCount} resignations`}
                          icon={<TrendingUp className="w-4 h-4" />}
                          trend={{ value: metrics.turnoverRate, isPositive: false }}
                        />
                        <KpiCard
                          title="Retention Rate"
                          value={`${metrics.retentionRate}%`}
                          subtext={`${metrics.activeCount} active employees`}
                          icon={<Activity className="w-4 h-4" />}
                          trend={{ value: metrics.retentionRate, isPositive: true }}
                        />
                        <KpiCard
                          title="Avg Salary"
                          value={metrics.averageSalary ? `$${Math.round(metrics.averageSalary / 1000)}k` : 'N/A'}
                          subtext={`Median $${Math.round(metrics.medianSalary / 1000)}k`}
                          icon={<DollarSign className="w-4 h-4" />}
                        />
                        <KpiCard
                          title="Avg Age"
                          value={metrics.averageAge}
                          subtext={`${metrics.genderRatio.malePercentage}% male · ${metrics.genderRatio.femalePercentage}% female`}
                          icon={<Users className="w-4 h-4" />}
                        />
                        <KpiCard
                          title="Avg Tenure"
                          value={`${metrics.averageTenure}y`}
                          subtext={`Promotion rate: ${metrics.promotionRate}%`}
                          icon={<Clock className="w-4 h-4" />}
                        />
                      </div>

                      {/* Secondary KPI Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <KpiCard
                          title="Training Hrs/Emp"
                          value={metrics.averageTrainingHours}
                          subtext={`Total cost: $${metrics.totalTrainingCost.toLocaleString()}`}
                          icon={<Award className="w-4 h-4" />}
                        />
                        <KpiCard
                          title="Absenteeism"
                          value={`${metrics.absenteeismRate}d`}
                          subtext="Average absence days/employee"
                          icon={<Activity className="w-4 h-4" />}
                        />
                        <KpiCard
                          title="Promotion Rate"
                          value={`${metrics.promotionRate}%`}
                          subtext="Employees promoted"
                          icon={<TrendingUp className="w-4 h-4" />}
                          trend={{ value: metrics.promotionRate, isPositive: true }}
                        />
                        <KpiCard
                          title="Avg Leave Days"
                          value={metrics.averageLeaveDays}
                          subtext="Average leave days per employee"
                          icon={<Clock className="w-4 h-4" />}
                        />
                      </div>
                    </div>

                    {/* ─── Charts Grid ─────── */}
                    <div id="charts-section">
                      <h2 className="text-base font-bold mb-4 text-foreground/80">Analytics & Visualizations</h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <HiringTrendChart metrics={metrics} />
                        <TurnoverTrendChart metrics={metrics} />
                        <DepartmentHeadcountChart metrics={metrics} />
                        <GenderByDepartmentChart metrics={metrics} />
                        <GenderPieChart metrics={metrics} />
                        <StatusPieChart metrics={metrics} />
                        <PerformanceDonutChart metrics={metrics} />
                        <SalaryHistogram metrics={metrics} />
                        <AttritionHeatmap metrics={metrics} />
                        <OrgTreeMap metrics={metrics} />
                        <div className="lg:col-span-2">
                          <SalaryVsPerformanceScatter metrics={metrics} />
                        </div>
                      </div>
                    </div>

                    {/* ─── Export Actions ─────── */}
                    <ExportActions
                      metrics={metrics}
                      records={filteredRecords}
                      dashboardId="charts-section"
                      aiReportId="ai-report-content"
                      isAiReportAvailable={!!aiReport}
                    />
                  </>
                )}

                {/* ─── AI INSIGHTS TAB ──────────── */}
                {activeTab === 'ai' && (
                  <div className="space-y-6">
                    <div className="glass-card rounded-2xl p-6 border border-border">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            AI-Generated Executive Insights
                          </h2>
                          <p className="text-xs text-muted-foreground mt-1">
                            Google Gemini analyzes your HR metrics and generates actionable insights, SWOT analysis, and strategic recommendations.
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={handleGenerateInsights}
                            disabled={isGeneratingReport || !apiKey}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {isGeneratingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            {isGeneratingReport ? 'Generating...' : 'Generate Insights'}
                          </button>
                          <button
                            onClick={handleGenerateBoardReport}
                            disabled={isGeneratingBoardReport || !apiKey}
                            className="px-4 py-2 rounded-xl bg-accent border border-border text-xs font-bold hover:bg-accent/80 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {isGeneratingBoardReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                            {isGeneratingBoardReport ? 'Generating...' : 'Board Report'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {!apiKey && (
                      <div className="glass-card rounded-2xl p-8 border border-amber-500/30 text-center bg-amber-500/5">
                        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                        <h4 className="font-bold mb-1">Gemini API Key Required</h4>
                        <p className="text-xs text-muted-foreground mb-4">Configure your Gemini API key in Settings to generate AI insights.</p>
                        <button
                          onClick={() => setActiveTab('settings')}
                          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
                        >
                          Go to Settings
                        </button>
                      </div>
                    )}

                    {/* AI Report Output */}
                    {aiReport && (
                      <div id="ai-report-content" className="glass-card rounded-2xl p-8 border border-border space-y-2">
                        <div className="prose prose-invert max-w-none text-sm leading-relaxed custom-scrollbar">
                          {aiReport.split('\n').map((line, i) => {
                            if (line.startsWith('## ')) return <h3 key={i} className="text-base font-bold mt-5 mb-2 text-foreground">{line.slice(3)}</h3>;
                            if (line.startsWith('# ')) return <h2 key={i} className="text-xl font-extrabold mb-3 text-primary">{line.slice(2)}</h2>;
                            if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-bold mt-4 mb-1 text-foreground/90">{line.slice(4)}</h4>;
                            if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-5 list-disc my-0.5 text-foreground/80">{line.slice(2)}</li>;
                            if (line.trim() === '') return <div key={i} className="h-2" />;
                            if (line.startsWith('**')) {
                              const parts = line.split('**');
                              return <p key={i} className="my-1 text-foreground/85">{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
                            }
                            return <p key={i} className="my-1 text-foreground/85">{line}</p>;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Board Report */}
                    {boardReport && (
                      <div className="glass-card rounded-2xl p-8 border border-primary/20 space-y-2">
                        <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          Board-Ready Strategic HR Report
                        </h3>
                        <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                          {boardReport.split('\n').map((line, i) => {
                            if (line.startsWith('## ')) return <h3 key={i} className="text-base font-bold mt-5 mb-2 text-foreground">{line.slice(3)}</h3>;
                            if (line.startsWith('# ')) return <h2 key={i} className="text-xl font-extrabold mb-3 text-primary">{line.slice(2)}</h2>;
                            if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-5 list-disc my-0.5 text-foreground/80">{line.slice(2)}</li>;
                            if (line.trim() === '') return <div key={i} className="h-2" />;
                            return <p key={i} className="my-1 text-foreground/85">{line}</p>;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── CHAT TAB ──────────── */}
                {activeTab === 'chat' && (
                  <div className="space-y-6">
                    <div className="glass-card rounded-2xl p-5 border border-border">
                      <h2 className="text-base font-bold mb-1 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-primary" /> HR Analytics AI Chat
                      </h2>
                      <p className="text-xs text-muted-foreground">Ask natural language questions about your workforce data — powered by Google Gemini with full HR context.</p>
                    </div>
                    <ChatInterface metrics={metrics} apiKey={apiKey} />
                  </div>
                )}

                {/* ─── SETTINGS TAB ──────────── */}
                {activeTab === 'settings' && (
                  <div className="space-y-6 max-w-2xl">
                    <div className="glass-card rounded-2xl p-5 border border-border">
                      <h2 className="text-base font-bold mb-1 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-primary" /> Application Settings
                      </h2>
                      <p className="text-xs text-muted-foreground">Configure your Gemini API key, appearance, and other application settings.</p>
                    </div>
                    <SettingsPanel
                      theme={theme}
                      setTheme={setTheme}
                      onApiKeyChange={(newKey) => {
                        setApiKey(newKey);
                        if (newKey) addToast('success', 'API key saved — AI features are now enabled!');
                      }}
                    />
                  </div>
                )}
              </div>
            </main>
          </div>
        )}

        {/* ─── Modals ─────────────────────────────────────── */}
        {showMappingModal && pendingMapping && (
          <ColumnMappingModal
            headers={headers}
            mapping={pendingMapping}
            setMapping={setPendingMapping}
            onConfirm={handleConfirmMapping}
            onClose={() => setShowMappingModal(false)}
          />
        )}

        {/* ─── Toasts ─────────────────────────────────────── */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </>
  );
}
