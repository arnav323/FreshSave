import { useEffect } from 'react';
import { Download, Printer, X } from 'lucide-react';
import {
  formatINR,
  formatQty,
  type AnalyticsSummary,
} from '../utils/analyticsEngine';
import type {
  AdminPdfActivityRow,
  AdminPdfCategoryRow,
  CircleChartSlice,
  LineTrendPoint,
} from '../utils/adminChartsAndPdf';

interface AdminCircleChartProps {
  slices: CircleChartSlice[];
  variant?: 'dark' | 'light';
}

export function AdminCircleChart({ slices, variant = 'dark' }: AdminCircleChartProps) {
  const isLight = variant === 'light';
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  let cumulativeFraction = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 140 140" className="w-36 h-36 -rotate-90" aria-hidden="true">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={isLight ? '#e2e8f0' : '#182039'}
            strokeWidth="18"
          />
          {total > 0 &&
            slices.map((slice) => {
              if (slice.value <= 0) return null;
              const fraction = slice.value / total;
              const dashLen = fraction * circumference;
              const offset = -cumulativeFraction * circumference;
              cumulativeFraction += fraction;
              return (
                <circle
                  key={slice.id}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={slice.colorHex}
                  strokeWidth="18"
                  strokeDasharray={`${dashLen} ${circumference}`}
                  strokeDashoffset={offset}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={`text-xl font-bold font-mono tabular-nums ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            {total}
          </span>
          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            total
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {slices.map((slice) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <div key={slice.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: slice.colorHex }}
                  aria-hidden="true"
                />
                <span className={isLight ? 'text-slate-700 truncate' : 'text-slate-300 truncate'}>
                  {slice.label}
                </span>
              </span>
              <span
                className={`font-mono font-semibold tabular-nums shrink-0 ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                {slice.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AdminLineChartProps {
  points: LineTrendPoint[];
  variant?: 'dark' | 'light';
}

export function AdminLineChart({ points, variant = 'dark' }: AdminLineChartProps) {
  const isLight = variant === 'light';
  const width = 460;
  const height = 190;
  const padL = 34;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  if (points.length === 0) {
    return (
      <div
        className={`h-48 rounded-xl border flex items-center justify-center text-xs ${
          isLight
            ? 'bg-slate-50 border-slate-200 text-slate-500'
            : 'bg-[#070A14] border-slate-800 text-slate-400'
        }`}
      >
        No date-based activity points recorded yet. Add or log groceries to see trend lines.
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...points.map((p) => Math.max(p.added, p.consumed, p.wasted))
  );

  const getX = (idx: number) =>
    points.length === 1 ? padL + plotW / 2 : padL + (idx / (points.length - 1)) * plotW;
  const getY = (val: number) => padT + plotH - (val / maxVal) * plotH;

  const buildPath = (key: 'added' | 'consumed' | 'wasted') =>
    points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(p[key]).toFixed(1)}`)
      .join(' ');

  const lines: Array<{
    key: 'added' | 'consumed' | 'wasted';
    label: string;
    color: string;
  }> = [
    { key: 'added', label: 'Added', color: '#06b6d4' },
    { key: 'consumed', label: 'Consumed', color: '#10b981' },
    { key: 'wasted', label: 'Wasted', color: '#f43f5e' },
  ];

  const labelStep = points.length > 6 ? 2 : 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {lines.map((line) => (
          <span key={line.key} className="inline-flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 rounded-full inline-block"
              style={{ backgroundColor: line.color }}
              aria-hidden="true"
            />
            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>{line.label}</span>
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full h-48 rounded-lg border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#070A14] border-slate-800'
        }`}
        role="img"
        aria-label="Line chart of daily groceries added, consumed, and wasted"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padT + plotH - ratio * plotH;
          const tick = Math.round(maxVal * ratio);
          return (
            <g key={ratio}>
              <line
                x1={padL}
                y1={y}
                x2={padL + plotW}
                y2={y}
                stroke={isLight ? '#e2e8f0' : '#1e293b'}
                strokeWidth="1"
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill={isLight ? '#64748b' : '#94a3b8'}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {points.map((p, idx) => {
          if (idx % labelStep !== 0 && idx !== points.length - 1) return null;
          return (
            <text
              key={p.dateIso}
              x={getX(idx)}
              y={padT + plotH + 16}
              textAnchor="middle"
              fontSize="9"
              fill={isLight ? '#475569' : '#94a3b8'}
            >
              {p.label}
            </text>
          );
        })}

        {lines.map((line) => (
          <g key={line.key}>
            <path
              d={buildPath(line.key)}
              fill="none"
              stroke={line.color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, idx) => (
              <circle
                key={`${line.key}-${p.dateIso}`}
                cx={getX(idx)}
                cy={getY(p[line.key])}
                r="3.2"
                fill={line.color}
              >
                <title>{`${p.dateIso} · ${line.label}: ${p[line.key]}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

interface AdminPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadPdf: () => void;
  downloadingPdf: boolean;
  today: string;
  totalGroceriesCount: number;
  activeGroceriesCount: number;
  freshActiveCount: number;
  expiringSoonActiveCount: number;
  expiredActiveCount: number;
  noExpiryActiveCount: number;
  summary: AnalyticsSummary;
  categoryBreakdown: AdminPdfCategoryRow[];
  circleSlices: CircleChartSlice[];
  linePoints: LineTrendPoint[];
  recentActivities: AdminPdfActivityRow[];
}

export function AdminPdfPreviewModal({
  isOpen,
  onClose,
  onDownloadPdf,
  downloadingPdf,
  today,
  totalGroceriesCount,
  activeGroceriesCount,
  expiredActiveCount,
  summary,
  categoryBreakdown,
  circleSlices,
  linePoints,
  recentActivities,
}: AdminPdfPreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#04050A]/85 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex flex-col items-center"
      role="dialog"
      aria-modal="true"
      aria-label="PDF Print Preview"
    >
      {/* Top Preview Toolbar (hidden when printing) */}
      <div className="no-print w-full max-w-4xl bg-[#0D1121] border border-cyan-400/35 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_30px_rgba(34,211,238,0.2)] sticky top-2 z-10">
        <div>
          <p className="text-sm font-bold text-slate-100">PDF Print Preview</p>
          <p className="text-xs text-slate-400">
            Preview how your FreshSave report will look when printed or exported as PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cyan-200 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/35 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{downloadingPdf ? 'Exporting...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close PDF preview"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Printable White A4 Sheet Preview */}
      <div className="print-surface w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 p-6 sm:p-10 space-y-6">
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-cyan-700" style={{ fontFamily: 'sans-serif' }}>
              FreshSave Local Admin Summary Report
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Generated: {new Date().toLocaleString()} · Source: Browser localStorage ({today})
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">A4 Print Layout</span>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Groceries', val: String(totalGroceriesCount) },
            { label: 'Active Groceries', val: String(activeGroceriesCount) },
            { label: 'Consumed Items', val: String(summary.consumedCount) },
            { label: 'Expired / Wasted', val: String(expiredActiveCount + summary.wastedCount) },
            { label: 'Money Saved', val: formatINR(summary.totalMoneySaved) },
          ].map((k) => (
            <div key={k.label} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[11px] text-slate-500">{k.label}</p>
              <p className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {k.val}
              </p>
            </div>
          ))}
        </div>

        {/* Charts inside PDF Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700" style={{ fontFamily: 'sans-serif' }}>
              Inventory &amp; Outcome Circle Chart
            </h3>
            <AdminCircleChart slices={circleSlices} variant="light" />
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700" style={{ fontFamily: 'sans-serif' }}>
              Activity Trend Line Chart
            </h3>
            <AdminLineChart points={linePoints} variant="light" />
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700" style={{ fontFamily: 'sans-serif' }}>
            Savings &amp; Financial Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded border border-slate-200">
              <span className="text-slate-500 block">Total Spending</span>
              <strong className="font-mono text-slate-900">{formatINR(summary.totalSpendingRecorded)}</strong>
            </div>
            <div className="p-2.5 rounded border border-slate-200">
              <span className="text-slate-500 block">Waste Prevented</span>
              <strong className="font-mono text-emerald-700">{formatINR(summary.foodWastePreventedValue)}</strong>
            </div>
            <div className="p-2.5 rounded border border-slate-200">
              <span className="text-slate-500 block">Active Value</span>
              <strong className="font-mono text-cyan-700">{formatINR(summary.currentInventoryValue)}</strong>
            </div>
            <div className="p-2.5 rounded border border-slate-200">
              <span className="text-slate-500 block">Wasted Loss</span>
              <strong className="font-mono text-rose-700">{formatINR(summary.totalFoodWastedValue)}</strong>
            </div>
          </div>
        </div>

        {/* Category Breakdown Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700" style={{ fontFamily: 'sans-serif' }}>
            Category Breakdown
          </h3>
          <table className="w-full text-left border-collapse text-xs border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Active</th>
                <th className="py-2 px-3">Consumed</th>
                <th className="py-2 px-3">Wasted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categoryBreakdown.map((c) => (
                <tr key={c.category}>
                  <td className="py-1.5 px-3 font-medium text-slate-800">{c.category}</td>
                  <td className="py-1.5 px-3 font-mono">{c.activeCount}</td>
                  <td className="py-1.5 px-3 font-mono text-emerald-700">{c.consumedCount}</td>
                  <td className="py-1.5 px-3 font-mono text-rose-700">{c.wastedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Activity Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700" style={{ fontFamily: 'sans-serif' }}>
            Recent Activity Snapshot
          </h3>
          {recentActivities.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No local FreshSave activity recorded yet.</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Grocery</th>
                  <th className="py-2 px-3">Qty</th>
                  <th className="py-2 px-3">Details</th>
                  <th className="py-2 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentActivities.slice(0, 12).map((act, idx) => (
                  <tr key={`${act.groceryName}-${idx}`}>
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-700">
                      {act.kind.toUpperCase()}
                    </td>
                    <td className="py-1.5 px-3 font-medium text-slate-900">{act.groceryName}</td>
                    <td className="py-1.5 px-3 font-mono">
                      {formatQty(act.quantity)} {act.unit}
                    </td>
                    <td className="py-1.5 px-3 text-slate-600">{act.detailText}</td>
                    <td className="py-1.5 px-3 font-mono text-slate-500">
                      {new Date(act.timestampIso).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
