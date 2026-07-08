import React, { useState } from 'react';
import { HRMetrics, EmployeeRecord } from '../types/hr';
import {
  exportToExcel,
  exportElementToPdf,
  exportElementToPng,
  exportToWord,
  exportToPptx
} from '../utils/exportService';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Presentation,
  FileImage,
  Loader2,
  FileDown
} from 'lucide-react';

interface ExportActionsProps {
  metrics: HRMetrics;
  records: EmployeeRecord[];
  dashboardId: string;
  aiReportId?: string;
  isAiReportAvailable: boolean;
}

export default function ExportActions({
  metrics,
  records,
  dashboardId,
  aiReportId,
  isAiReportAvailable
}: ExportActionsProps) {
  const [exportingType, setExportingType] = useState<string | null>(null);

  const handleExport = async (type: string, action: () => Promise<void> | void) => {
    setExportingType(type);
    try {
      await action();
    } catch (err) {
      console.error(`Failed to export ${type}:`, err);
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-border">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold mb-1">Export Executive Deliverables</h3>
          <p className="text-xs text-muted-foreground">Download the data, board slide decks, or print official report documents</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* EXCEL DATA */}
          <button
            disabled={exportingType !== null || records.length === 0}
            onClick={() => handleExport('excel', () => exportToExcel(records))}
            className="px-4 py-2 rounded-xl border border-border bg-accent/25 hover:bg-accent text-xs font-semibold text-foreground transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {exportingType === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
            Data (Excel)
          </button>

          {/* WORD REPORT */}
          <button
            disabled={exportingType !== null || records.length === 0}
            onClick={() => handleExport('word', () => exportToWord(metrics, records.length))}
            className="px-4 py-2 rounded-xl border border-border bg-accent/25 hover:bg-accent text-xs font-semibold text-foreground transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {exportingType === 'word' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-blue-400" />}
            Report (Word)
          </button>

          {/* PPTX PRESENTATION */}
          <button
            disabled={exportingType !== null || records.length === 0}
            onClick={() => handleExport('pptx', () => exportToPptx(metrics, records.length))}
            className="px-4 py-2 rounded-xl border border-border bg-accent/25 hover:bg-accent text-xs font-semibold text-foreground transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {exportingType === 'pptx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5 text-amber-400" />}
            Deck (PPTX)
          </button>

          {/* DASHBOARD PDF */}
          <button
            disabled={exportingType !== null || records.length === 0}
            onClick={() => handleExport('pdf_dash', () => exportElementToPdf(dashboardId))}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {exportingType === 'pdf_dash' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Dashboard (PDF)
          </button>

          {/* DASHBOARD IMAGE */}
          <button
            disabled={exportingType !== null || records.length === 0}
            onClick={() => handleExport('png_dash', () => exportElementToPng(dashboardId))}
            className="px-4 py-2 rounded-xl border border-border bg-accent/25 hover:bg-accent text-xs font-semibold text-foreground transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {exportingType === 'png_dash' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileImage className="w-3.5 h-3.5 text-pink-400" />}
            Snapshot (PNG)
          </button>

          {/* AI REPORT PDF */}
          {isAiReportAvailable && aiReportId && (
            <button
              disabled={exportingType !== null}
              onClick={() => handleExport('pdf_report', () => exportElementToPdf(aiReportId, 'HR_AI_Executive_Report.pdf'))}
              className="px-4 py-2 rounded-xl border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {exportingType === 'pdf_report' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              AI Report (PDF)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
