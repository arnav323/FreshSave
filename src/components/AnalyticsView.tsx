import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Download,
  Flame,
  IndianRupee,
  Leaf,
  Lightbulb,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  TrendingDown,
  Utensils,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import type {
  DateFilterRange,
  EnvFactorConfig,
  FoodCategory,
  FoodItem,
  FoodTransaction,
  PurchaseRecord,
  WasteGoalsConfig,
} from '../types/food';
import {
  buildReportData,
  computeAnalyticsSummary,
  computeEnvironmentalImpact,
  evaluateGoalsAndAchievements,
  formatINR,
  formatQty,
  generateReportCSV,
  generateWasteInsights,
} from '../utils/analyticsEngine';
import { formatDateShort } from '../utils/dateUtils';
import { DEFAULT_ENV_FACTORS, DEFAULT_GOALS_CONFIG } from '../utils/storage';

interface AnalyticsViewProps {
  items: FoodItem[];
  transactions: FoodTransaction[];
  purchaseRecords: PurchaseRecord[];
  envFactors: EnvFactorConfig;
  onUpdateEnvFactors: (next: EnvFactorConfig) => void;
  goalsConfig: WasteGoalsConfig;
  onUpdateGoalsConfig: (next: WasteGoalsConfig) => void;
  onClearHistory: () => void;
  today: string;
}

const DATE_RANGES: { id: DateFilterRange; label: string }[] = [
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_30_days', label: 'Last 30 days' },
  { id: 'last_3_months', label: 'Last 3 months' },
  { id: 'all_time', label: 'All time' },
];

const FOOD_CATEGORIES: ('All' | FoodCategory)[] = [
  'All',
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Beverages',
  'Leftovers',
];

function useAnimatedValue(target: number, durationMs = 450): number {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplay(target);
      return;
    }

    const startVal = display;
    if (Math.abs(target - startVal) < 0.01) {
      setDisplay(target);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(startVal + (target - startVal) * eased);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return display;
}

export function AnalyticsView({
  items,
  transactions,
  purchaseRecords,
  envFactors,
  onUpdateEnvFactors,
  goalsConfig,
  onUpdateGoalsConfig,
  onClearHistory,
  today,
}: AnalyticsViewProps) {
  const [dateRange, setDateRange] = useState<DateFilterRange>('all_time');
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<
    'consumed' | 'wasted' | 'remaining' | null
  >(null);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  // History Table Filters
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'consumed' | 'wasted'>('all');
  const [txCategoryFilter, setTxCategoryFilter] = useState<'All' | FoodCategory>('All');
  const [txSort, setTxSort] = useState<'newest' | 'value_desc' | 'qty_desc'>('newest');
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  // Environmental factors editor
  const [showFactorEditor, setShowFactorEditor] = useState(false);
  const [draftEnv, setDraftEnv] = useState<EnvFactorConfig>(envFactors);

  // Goals editor
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [draftGoals, setDraftGoals] = useState<WasteGoalsConfig>(goalsConfig);

  // Report selector
  const [reportPeriod, setReportPeriod] = useState<'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    setDraftEnv(envFactors);
  }, [envFactors]);

  useEffect(() => {
    setDraftGoals(goalsConfig);
  }, [goalsConfig]);

  const summary = useMemo(
    () =>
      computeAnalyticsSummary(
        items,
        transactions,
        purchaseRecords,
        envFactors,
        dateRange,
        today
      ),
    [items, transactions, purchaseRecords, envFactors, dateRange, today]
  );

  const envImpact = useMemo(
    () => computeEnvironmentalImpact(transactions, envFactors, dateRange, today),
    [transactions, envFactors, dateRange, today]
  );

  const insights = useMemo(
    () => generateWasteInsights(items, transactions, today),
    [items, transactions, today]
  );

  const goalsEval = useMemo(
    () => evaluateGoalsAndAchievements(transactions, items, envFactors, goalsConfig, today),
    [transactions, items, envFactors, goalsConfig, today]
  );

  const reportData = useMemo(
    () =>
      buildReportData(reportPeriod, items, transactions, purchaseRecords, envFactors, today),
    [reportPeriod, items, transactions, purchaseRecords, envFactors, today]
  );

  const animatedMoneySaved = useAnimatedValue(summary.totalMoneySaved);
  const animatedFoodWasted = useAnimatedValue(summary.totalFoodWastedValue);
  const animatedWastePrevented = useAnimatedValue(summary.foodWastePreventedValue);
  const animatedConsumedCount = useAnimatedValue(summary.consumedCount);

  // Filtered History Rows
  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (txTypeFilter !== 'all' && tx.transactionType !== txTypeFilter) return false;
        if (txCategoryFilter !== 'All' && tx.category !== txCategoryFilter) return false;
        if (q && !tx.groceryName.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (txSort === 'value_desc') {
          return (b.estimatedMonetaryValue ?? -1) - (a.estimatedMonetaryValue ?? -1);
        }
        if (txSort === 'qty_desc') {
          return b.quantity - a.quantity;
        }
        return b.dateTime.localeCompare(a.dateTime);
      });
  }, [transactions, txSearch, txTypeFilter, txCategoryFilter, txSort]);

  const handleExportCSV = () => {
    const csv = generateReportCSV(reportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `freshsave-${reportPeriod}-report-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Chart A Donut math
  const donutTotal =
    summary.estimatedValueConsumed + summary.totalFoodWastedValue + summary.currentInventoryValue;
  const donutRadius = 56;
  const donutCirc = 2 * Math.PI * donutRadius;
  const consumedLen = donutTotal > 0 ? (summary.estimatedValueConsumed / donutTotal) * donutCirc : 0;
  const wastedLen = donutTotal > 0 ? (summary.totalFoodWastedValue / donutTotal) * donutCirc : 0;
  const remainingLen = donutTotal > 0 ? (summary.currentInventoryValue / donutTotal) * donutCirc : 0;

  const activeDonutLabel =
    hoveredDonutSegment === 'consumed'
      ? { title: 'Consumed', val: formatINR(summary.estimatedValueConsumed), color: 'text-emerald-300' }
      : hoveredDonutSegment === 'wasted'
      ? { title: 'Wasted', val: formatINR(summary.totalFoodWastedValue), color: 'text-rose-300' }
      : hoveredDonutSegment === 'remaining'
      ? { title: 'Inventory', val: formatINR(summary.currentInventoryValue), color: 'text-cyan-300' }
      : { title: 'Total Value', val: formatINR(donutTotal), color: 'text-slate-100' };

  // Chart B Line Chart math
  const maxTrendValue = Math.max(
    10,
    ...summary.monthlyTrends.map((m) => Math.max(m.wastedValue, m.consumedValue))
  );
  const svgW = 460;
  const svgH = 180;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const trendPoints = summary.monthlyTrends.map((pt, idx) => {
    const x =
      summary.monthlyTrends.length > 1
        ? padL + (idx / (summary.monthlyTrends.length - 1)) * plotW
        : padL + plotW / 2;
    const yWasted = padT + plotH - (pt.wastedValue / maxTrendValue) * plotH;
    const yConsumed = padT + plotH - (pt.consumedValue / maxTrendValue) * plotH;
    return { ...pt, x, yWasted, yConsumed };
  });

  const wastedLinePath = trendPoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yWasted.toFixed(1)}`)
    .join(' ');
  const consumedLinePath = trendPoints
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yConsumed.toFixed(1)}`)
    .join(' ');

  // Chart C Spending vs Waste math
  const maxSpendBar = Math.max(
    1,
    summary.totalSpendingRecorded,
    summary.estimatedValueConsumed,
    summary.estimatedWasteLoss
  );

  // Chart D Waste by Category math
  const maxCategoryWaste = Math.max(
    1,
    ...summary.wasteByCategory.map((c) => c.wastedValue)
  );
  const maxCategoryWasteCount = Math.max(
    1,
    ...summary.wasteByCategory.map((c) => c.wastedCount)
  );

  const unitSummaryText =
    summary.unitBreakdown.length > 0
      ? summary.unitBreakdown
          .slice(0, 4)
          .map((u) => `${formatQty(u.totalQuantity)} ${u.unit}`)
          .join(' · ')
      : 'No consumed groceries logged yet';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Date Filter Bar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            Analytics Timeframe
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Every metric below is calculated live from your real logged inventory and transactions.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter analytics by date range"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#070A14] border border-slate-800 rounded-lg"
        >
          {DATE_RANGES.map((r) => {
            const active = dateRange === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDateRange(r.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-300 hover:text-cyan-300'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. TOP 4 PROMINENT KPI CARDS */}
      <section aria-label="Waste and savings overview" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* TOTAL MONEY SAVED */}
        <div className="relative bg-[#0D1121]/90 rounded-xl p-5 border border-emerald-400/35 shadow-[0_0_24px_rgba(52,211,153,0.08)]">
          <span className="pointer-events-none absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400/70" />
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-300">
              TOTAL MONEY SAVED
            </span>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-400/12 text-emerald-300 shrink-0">
              <IndianRupee className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-emerald-300 tabular-nums">
            {formatINR(animatedMoneySaved)}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Value of food consumed before expiry ({summary.consumedBeforeExpiryCount} log
            {summary.consumedBeforeExpiryCount === 1 ? '' : 's'}).
          </p>
        </div>

        {/* FOOD WASTED */}
        <div className="relative bg-[#0D1121]/90 rounded-xl p-5 border border-rose-500/35 shadow-[0_0_24px_rgba(244,63,94,0.08)]">
          <span className="pointer-events-none absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-rose-400/70" />
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-bold tracking-wider uppercase text-rose-300">
              FOOD WASTED
            </span>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-rose-500/15 text-rose-300 shrink-0">
              <XCircle className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-rose-300 tabular-nums">
            {formatINR(animatedFoodWasted)}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Explicitly marked as wasted ({summary.wastedCount} log
            {summary.wastedCount === 1 ? '' : 's'}).
          </p>
        </div>

        {/* FOOD WASTE PREVENTED */}
        <div className="relative bg-[#0D1121]/90 rounded-xl p-5 border border-amber-400/35 shadow-[0_0_24px_rgba(251,191,36,0.08)]">
          <span className="pointer-events-none absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400/70" />
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-bold tracking-wider uppercase text-amber-300">
              FOOD WASTE PREVENTED
            </span>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-400/12 text-amber-300 shrink-0">
              <ShieldAlert className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-amber-300 tabular-nums">
            {formatINR(animatedWastePrevented)}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Approaching-expiry subset (0–3d) of Money Saved ({summary.approachingExpiryConsumedCount}{' '}
            rescued).
          </p>
        </div>

        {/* TOTAL FOOD CONSUMED */}
        <div className="relative bg-[#0D1121]/90 rounded-xl p-5 border border-cyan-400/35 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
          <span className="pointer-events-none absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400/70" />
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-bold tracking-wider uppercase text-cyan-300">
              TOTAL FOOD CONSUMED
            </span>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-400/12 text-cyan-300 shrink-0">
              <Utensils className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 text-3xl font-bold font-mono text-cyan-200 tabular-nums">
            {Math.round(animatedConsumedCount)}{' '}
            <span className="text-sm font-normal text-slate-400">
              event{Math.round(animatedConsumedCount) === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-400 font-mono truncate" title={unitSummaryText}>
            {unitSummaryText}
          </p>
        </div>
      </section>

      {/* Consumed Category Breakdown Strip (only shown if there is consumed activity) */}
      {summary.categoryConsumedBreakdown.length > 0 && (
        <div className="bg-[#0D1121]/90 rounded-xl border border-slate-800 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-bold text-slate-100">Consumed by Category</h2>
            <span className="text-xs text-slate-400">
              Breakdown across logged consumptions in selected timeframe
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {summary.categoryConsumedBreakdown.map((entry) => (
              <div
                key={entry.category}
                className="p-3 rounded-lg bg-[#070A14] border border-slate-800"
              >
                <p className="text-xs font-medium text-slate-300 truncate">{entry.category}</p>
                <p className="mt-1 text-sm font-mono font-bold text-cyan-300 tabular-nums">
                  {entry.count} log{entry.count === 1 ? '' : 's'}
                </p>
                <p className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {formatINR(entry.estimatedValue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. FINANCIAL ANALYTICS SECTION */}
      <section className="bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-100">Financial Analytics (₹ INR)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Spending, consumption value, waste losses, and remaining inventory value at risk.
            </p>
          </div>
          {summary.wasteRatePercent !== null && (
            <div className="text-xs font-mono text-slate-300 tabular-nums">
              Waste rate:{' '}
              <span
                className={
                  summary.wasteRatePercent <= goalsConfig.targetMaxWastePercent
                    ? 'text-emerald-300 font-bold'
                    : 'text-rose-300 font-bold'
                }
              >
                {summary.wasteRatePercent}%
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[
            {
              label: 'Total Grocery Spending Recorded',
              value: formatINR(summary.totalSpendingRecorded),
              sub: 'From priced groceries purchased in timeframe',
              tone: 'text-cyan-200',
            },
            {
              label: 'Estimated Value Consumed',
              value: formatINR(summary.estimatedValueConsumed),
              sub:
                summary.unpricedConsumedCount > 0
                  ? `Excludes ${summary.unpricedConsumedCount} unpriced log(s)`
                  : 'All consumed events in timeframe',
              tone: 'text-emerald-300',
            },
            {
              label: 'Estimated Financial Loss from Waste',
              value: formatINR(summary.estimatedWasteLoss),
              sub:
                summary.unpricedWastedCount > 0
                  ? `Excludes ${summary.unpricedWastedCount} unpriced waste log(s)`
                  : 'Sum of explicitly logged wasted items',
              tone: 'text-rose-300',
            },
            {
              label: 'Money Saved Before Expiry',
              value: formatINR(summary.totalMoneySaved),
              sub: `Includes ${formatINR(summary.foodWastePreventedValue)} from approaching-expiry rescues`,
              tone: 'text-emerald-300',
            },
            {
              label: 'Current Active Inventory Value',
              value: formatINR(summary.currentInventoryValue),
              sub: `${summary.pricedActiveItemsCount} priced active item(s) remaining`,
              tone: 'text-slate-100',
            },
            {
              label: 'Potential Value at Risk (<= 3d or Expired)',
              value: formatINR(summary.potentialValueAtRisk),
              sub: `${summary.atRiskItemsCount} active item(s) needing urgent attention`,
              tone: 'text-amber-300',
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="p-4 rounded-xl bg-[#070A14] border border-slate-800 space-y-1"
            >
              <p className="text-xs font-medium text-slate-400">{metric.label}</p>
              <p className={`text-xl font-bold font-mono tabular-nums ${metric.tone}`}>
                {metric.value}
              </p>
              <p className="text-[11px] text-slate-500">{metric.sub}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
          Calculation note: Monetary values use proportional unit pricing (Total Purchase Cost ÷ Quantity Purchased).
          Historical logs keep a snapshot of the recorded unit price even if items are later deleted or edited.
          Food Waste Prevented is tracked as a high-urgency subset of Money Saved and is never double-counted.
        </p>
      </section>

      {/* 3. FOUR INTERACTIVE CYBERPUNK CHARTS */}
      <section aria-label="Waste and savings charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART A: Food Waste Breakdown Donut */}
        <div className="relative bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-6">
          <span className="pointer-events-none absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400/60" />
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-100">Food Waste Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Consumed vs. Wasted vs. Remaining Active Inventory (₹ Value)
            </p>
          </div>

          {donutTotal === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
              Record purchase prices and log consumption or waste to visualize value breakdown.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-36 h-36 shrink-0">
                <svg viewBox="0 0 144 144" className="w-full h-full -rotate-90" role="img" aria-label="Food waste value breakdown donut chart">
                  <circle cx="72" cy="72" r={donutRadius} fill="none" stroke="#182039" strokeWidth="16" />
                  {consumedLen > 0 && (
                    <circle
                      cx="72"
                      cy="72"
                      r={donutRadius}
                      fill="none"
                      stroke="#34D399"
                      strokeWidth={hoveredDonutSegment === 'consumed' ? '19' : '16'}
                      strokeDasharray={`${consumedLen} ${donutCirc}`}
                      strokeDashoffset={0}
                      onMouseEnter={() => setHoveredDonutSegment('consumed')}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                      className="transition-all duration-300 cursor-pointer"
                    />
                  )}
                  {wastedLen > 0 && (
                    <circle
                      cx="72"
                      cy="72"
                      r={donutRadius}
                      fill="none"
                      stroke="#FB7185"
                      strokeWidth={hoveredDonutSegment === 'wasted' ? '19' : '16'}
                      strokeDasharray={`${wastedLen} ${donutCirc}`}
                      strokeDashoffset={-consumedLen}
                      onMouseEnter={() => setHoveredDonutSegment('wasted')}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                      className="transition-all duration-300 cursor-pointer"
                    />
                  )}
                  {remainingLen > 0 && (
                    <circle
                      cx="72"
                      cy="72"
                      r={donutRadius}
                      fill="none"
                      stroke="#22D3EE"
                      strokeWidth={hoveredDonutSegment === 'remaining' ? '19' : '16'}
                      strokeDasharray={`${remainingLen} ${donutCirc}`}
                      strokeDashoffset={-(consumedLen + wastedLen)}
                      onMouseEnter={() => setHoveredDonutSegment('remaining')}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                      className="transition-all duration-300 cursor-pointer"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                  <span className={`text-sm font-bold font-mono tabular-nums ${activeDonutLabel.color}`}>
                    {activeDonutLabel.val}
                  </span>
                  <span className="text-[10px] text-slate-400">{activeDonutLabel.title}</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-2.5">
                {[
                  {
                    id: 'consumed' as const,
                    label: 'Consumed Value',
                    val: summary.estimatedValueConsumed,
                    dot: 'bg-emerald-400',
                  },
                  {
                    id: 'wasted' as const,
                    label: 'Wasted Value',
                    val: summary.totalFoodWastedValue,
                    dot: 'bg-rose-400',
                  },
                  {
                    id: 'remaining' as const,
                    label: 'Remaining Inventory',
                    val: summary.currentInventoryValue,
                    dot: 'bg-cyan-400',
                  },
                ].map((seg) => {
                  const pct = donutTotal > 0 ? Math.round((seg.val / donutTotal) * 100) : 0;
                  return (
                    <div
                      key={seg.id}
                      onMouseEnter={() => setHoveredDonutSegment(seg.id)}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#070A14] border border-slate-800/80 hover:border-cyan-400/35 transition-colors cursor-default"
                    >
                      <span className="flex items-center gap-2 text-xs text-slate-300">
                        <span className={`w-2.5 h-2.5 rounded-sm ${seg.dot}`} aria-hidden="true" />
                        <span>{seg.label}</span>
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-100 tabular-nums">
                        {formatINR(seg.val)}{' '}
                        <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CHART B: Monthly Waste Trends Line Chart */}
        <div className="relative bg-[#0D1121]/90 rounded-xl border border-fuchsia-500/20 p-6">
          <span className="pointer-events-none absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-fuchsia-400/60" />
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100">Monthly Waste Trends</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                6-month view comparing consumed vs. wasted value (₹)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-0.5 bg-emerald-400" />
                Consumed
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose-300">
                <span className="w-2.5 h-0.5 bg-rose-400" />
                Wasted
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-44 min-w-[320px]"
              role="img"
              aria-label="Monthly waste and consumption trend chart"
            >
              {[0, 0.5, 1].map((frac) => {
                const y = padT + plotH * (1 - frac);
                return (
                  <g key={frac}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={svgW - padR}
                      y2={y}
                      stroke="#1E293B"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padL - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-500 text-[9px] font-mono"
                    >
                      {Math.round(maxTrendValue * frac)}
                    </text>
                  </g>
                );
              })}

              <path
                d={consumedLinePath}
                fill="none"
                stroke="#34D399"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={wastedLinePath}
                fill="none"
                stroke="#FB7185"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {trendPoints.map((pt, idx) => (
                <g
                  key={pt.monthKey}
                  onMouseEnter={() => setHoveredTrendIdx(idx)}
                  onMouseLeave={() => setHoveredTrendIdx(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={pt.x - 24}
                    y={padT}
                    width="48"
                    height={plotH}
                    fill="transparent"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.yConsumed}
                    r={hoveredTrendIdx === idx ? 5 : 3.2}
                    fill="#34D399"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.yWasted}
                    r={hoveredTrendIdx === idx ? 5.5 : 3.5}
                    fill="#FB7185"
                  />
                  <text
                    x={pt.x}
                    y={svgH - 8}
                    textAnchor="middle"
                    className={`text-[10px] font-mono ${
                      hoveredTrendIdx === idx ? 'fill-cyan-300 font-bold' : 'fill-slate-400'
                    }`}
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="mt-2 min-h-[20px] text-xs font-mono text-slate-300">
            {hoveredTrendIdx !== null ? (
              <span>
                {trendPoints[hoveredTrendIdx].label}: Consumed{' '}
                <strong className="text-emerald-300">
                  {formatINR(trendPoints[hoveredTrendIdx].consumedValue)}
                </strong>{' '}
                · Wasted{' '}
                <strong className="text-rose-300">
                  {formatINR(trendPoints[hoveredTrendIdx].wastedValue)}
                </strong>{' '}
                ({trendPoints[hoveredTrendIdx].wastedKg} kg est.,{' '}
                {trendPoints[hoveredTrendIdx].wastedCount} event
                {trendPoints[hoveredTrendIdx].wastedCount === 1 ? '' : 's'})
              </span>
            ) : (
              <span className="text-slate-500">Hover any month point for exact ₹ and kg details.</span>
            )}
          </div>
        </div>

        {/* CHART C: Spending vs Waste */}
        <div className="relative bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-6">
          <span className="pointer-events-none absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400/60" />
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-100">Spending vs. Waste</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparing total spending recorded against consumed and wasted value
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                label: 'Total Spending Recorded',
                value: summary.totalSpendingRecorded,
                bar: 'from-cyan-400 to-sky-500',
                text: 'text-cyan-300',
              },
              {
                label: 'Value Consumed',
                value: summary.estimatedValueConsumed,
                bar: 'from-emerald-400 to-teal-500',
                text: 'text-emerald-300',
              },
              {
                label: 'Value Wasted',
                value: summary.estimatedWasteLoss,
                bar: 'from-rose-500 to-amber-500',
                text: 'text-rose-300',
              },
            ].map((row) => {
              const widthPct =
                row.value > 0 ? Math.max(4, Math.round((row.value / maxSpendBar) * 100)) : 0;
              return (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{row.label}</span>
                    <span className={`font-mono font-bold tabular-nums ${row.text}`}>
                      {formatINR(row.value)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[#182039] overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${row.bar} transition-all duration-500`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART D: Waste by Category */}
        <div className="relative bg-[#0D1121]/90 rounded-xl border border-fuchsia-500/20 p-6">
          <span className="pointer-events-none absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-fuchsia-400/60" />
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-100">Waste by Category</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Vegetables, Fruits, Dairy, Meat, Grains, and Other
            </p>
          </div>

          <div className="space-y-3">
            {summary.wasteByCategory.map((entry) => {
              const useValueMetric = summary.totalFoodWastedValue > 0;
              const widthPct = useValueMetric
                ? entry.wastedValue > 0
                  ? Math.max(6, Math.round((entry.wastedValue / maxCategoryWaste) * 100))
                  : 0
                : entry.wastedCount > 0
                ? Math.max(6, Math.round((entry.wastedCount / maxCategoryWasteCount) * 100))
                : 0;
              return (
                <div key={entry.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{entry.category}</span>
                    <span className="font-mono text-slate-300 tabular-nums">
                      <strong className="text-rose-300">{formatINR(entry.wastedValue)}</strong>
                      <span className="text-slate-500">
                        {' '}
                        · {entry.wastedCount} log{entry.wastedCount === 1 ? '' : 's'}
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#182039] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. ENVIRONMENTAL IMPACT TRACKER */}
      <section className="bg-[#0D1121]/90 rounded-xl border border-emerald-400/25 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-400/12 text-emerald-300 shrink-0">
              <Leaf className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100">Environmental Impact Tracker</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Estimates based on configurable unit weights and category CO₂e factors (not exact lab measurements).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFactorEditor((v) => !v)}
            className="no-print inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/25 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{showFactorEditor ? 'Hide Factors' : 'Configure Factors'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-[#070A14] border border-slate-800">
            <p className="text-xs text-slate-400">Est. Food Saved Before Expiry</p>
            <p className="mt-1 text-2xl font-bold font-mono text-emerald-300 tabular-nums">
              {envImpact.kgSavedBeforeExpiry} kg
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {envImpact.kgPreventedUrgent} kg from approaching-expiry items
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#070A14] border border-slate-800">
            <p className="text-xs text-slate-400">Est. Food Wasted</p>
            <p className="mt-1 text-2xl font-bold font-mono text-rose-300 tabular-nums">
              {envImpact.kgWasted} kg
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Est. {envImpact.co2WastedKg} kg CO₂e footprint lost
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#070A14] border border-slate-800">
            <p className="text-xs text-slate-400">Est. CO₂e Emissions Avoided</p>
            <p className="mt-1 text-2xl font-bold font-mono text-cyan-300 tabular-nums">
              {envImpact.co2AvoidedKg} kg
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Category CO₂e estimate saved</p>
          </div>
          <div className="p-4 rounded-xl bg-[#070A14] border border-slate-800">
            <p className="text-xs text-slate-400">This Month&apos;s Impact</p>
            <p className="mt-1 text-2xl font-bold font-mono text-slate-100 tabular-nums">
              {envImpact.monthlyKgSaved} kg
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {envImpact.monthlyCo2AvoidedKg} kg CO₂e avoided · {envImpact.monthlyKgWasted} kg wasted
            </p>
          </div>
        </div>

        {showFactorEditor && (
          <div className="no-print p-4 rounded-xl bg-[#070A14] border border-cyan-400/25 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-cyan-300">
                CO₂e Emissions per kg of Food by Category (kg CO₂e / kg)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftEnv(DEFAULT_ENV_FACTORS);
                    onUpdateEnvFactors(DEFAULT_ENV_FACTORS);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Reset Defaults</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateEnvFactors(draftEnv);
                    setShowFactorEditor(false);
                  }}
                  className="px-3 py-1 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded cursor-pointer"
                >
                  Save Factors
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {(Object.keys(draftEnv.co2PerKgByCategory) as FoodCategory[]).map((cat) => (
                <div key={cat}>
                  <label className="block text-[11px] text-slate-400 mb-1 truncate">{cat}</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={draftEnv.co2PerKgByCategory[cat]}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!Number.isFinite(val) || val < 0) return;
                      setDraftEnv((prev) => ({
                        ...prev,
                        co2PerKgByCategory: { ...prev.co2PerKgByCategory, [cat]: val },
                      }));
                    }}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-700 bg-[#0D1121] text-slate-100"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 5. SMART WASTE INSIGHTS */}
      <section className="bg-[#0D1121]/90 rounded-xl border border-fuchsia-500/25 p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-fuchsia-500/12 text-fuchsia-300 shrink-0">
            <Lightbulb className="w-4 h-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-100">Smart Waste Insights</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rule-based patterns computed locally from your actual purchase, consumption, and waste records.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((ins) => {
            const borderTone =
              ins.tone === 'emerald'
                ? 'border-emerald-400/35 bg-emerald-500/6'
                : ins.tone === 'rose'
                ? 'border-rose-500/35 bg-rose-500/6'
                : ins.tone === 'amber'
                ? 'border-amber-400/35 bg-amber-500/6'
                : 'border-cyan-400/35 bg-cyan-500/6';
            const titleTone =
              ins.tone === 'emerald'
                ? 'text-emerald-300'
                : ins.tone === 'rose'
                ? 'text-rose-300'
                : ins.tone === 'amber'
                ? 'text-amber-300'
                : 'text-cyan-300';
            return (
              <div key={ins.id} className={`p-4 rounded-xl border ${borderTone}`}>
                <p className={`text-sm font-bold ${titleTone}`}>{ins.title}</p>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">{ins.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. GAMIFICATION & GOALS */}
      <section className="bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-400/12 text-amber-300 shrink-0">
              <Award className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100">Waste Reduction Goals &amp; Streaks</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real milestones and customizable monthly goals backed strictly by your logged activity.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGoalEditor((v) => !v)}
            className="no-print inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/25 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{showGoalEditor ? 'Close Goal Settings' : 'Edit Goals'}</span>
          </button>
        </div>

        {showGoalEditor && (
          <div className="no-print p-4 rounded-xl bg-[#070A14] border border-cyan-400/25 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Max Waste Rate (%)</label>
              <input
                type="number"
                min="1"
                max="99"
                value={draftGoals.targetMaxWastePercent}
                onChange={(e) =>
                  setDraftGoals((p) => ({
                    ...p,
                    targetMaxWastePercent: Math.max(1, Number(e.target.value) || 20),
                  }))
                }
                className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-700 bg-[#0D1121] text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Monthly Waste Cap (₹)</label>
              <input
                type="number"
                min="10"
                step="10"
                value={draftGoals.monthlyWasteBudgetInr}
                onChange={(e) =>
                  setDraftGoals((p) => ({
                    ...p,
                    monthlyWasteBudgetInr: Math.max(10, Number(e.target.value) || 200),
                  }))
                }
                className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-700 bg-[#0D1121] text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Expiring Items to Rescue</label>
              <input
                type="number"
                min="1"
                value={draftGoals.targetExpiringConsumedCount}
                onChange={(e) =>
                  setDraftGoals((p) => ({
                    ...p,
                    targetExpiringConsumedCount: Math.max(1, Number(e.target.value) || 5),
                  }))
                }
                className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-700 bg-[#0D1121] text-slate-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftGoals(DEFAULT_GOALS_CONFIG);
                  onUpdateGoalsConfig(DEFAULT_GOALS_CONFIG);
                }}
                className="px-3 py-2 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateGoalsConfig(draftGoals);
                  setShowGoalEditor(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Streak + Weekly Performance + Goal Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#070A14] border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400">Zero-Waste Streak</p>
              <p className="mt-1 text-3xl font-bold font-mono text-amber-300 tabular-nums">
                {goalsEval.wasteFreeStreakDays}{' '}
                <span className="text-sm font-normal text-slate-400">
                  day{goalsEval.wasteFreeStreakDays === 1 ? '' : 's'}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                This week: {goalsEval.weeklyConsumedCount} consumed · {goalsEval.weeklyWastedCount}{' '}
                wasted ({formatINR(goalsEval.weeklySavedInr)} saved)
              </p>
            </div>
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-400/12 text-amber-300 shrink-0">
              <Flame className="w-5 h-5" aria-hidden="true" />
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#070A14] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">
                Monthly Waste Budget (&lt; {formatINR(goalsConfig.monthlyWasteBudgetInr)})
              </span>
              <span className="font-mono text-slate-200 tabular-nums">
                {formatINR(goalsEval.monthlyWasteInr)} / {formatINR(goalsConfig.monthlyWasteBudgetInr)}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#182039] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  goalsEval.monthlyWasteInr <= goalsConfig.monthlyWasteBudgetInr
                    ? 'bg-emerald-400'
                    : 'bg-rose-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((goalsEval.monthlyWasteInr / goalsConfig.monthlyWasteBudgetInr) * 100)
                  )}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {goalsEval.monthlyWastePercent !== null
                ? `Current monthly waste rate: ${goalsEval.monthlyWastePercent}% (target < ${goalsConfig.targetMaxWastePercent}%)`
                : 'Log consumption or waste this month to track waste %.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#070A14] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">
                Expiring Items Rescued This Month
              </span>
              <span className="font-mono text-cyan-300 tabular-nums">
                {goalsEval.expiringConsumedThisMonth} / {goalsConfig.targetExpiringConsumedCount}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#182039] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (goalsEval.expiringConsumedThisMonth /
                        goalsConfig.targetExpiringConsumedCount) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Items consumed with 0–3 days remaining before expiry
            </p>
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {goalsEval.badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                badge.unlocked
                  ? 'bg-emerald-500/8 border-emerald-400/35'
                  : 'bg-[#070A14] border-slate-800 opacity-75'
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`text-xs font-bold ${
                    badge.unlocked ? 'text-emerald-300' : 'text-slate-300'
                  }`}
                >
                  {badge.title}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">{badge.description}</p>
                <p className="mt-1.5 text-[11px] font-mono text-cyan-300 tabular-nums">
                  {badge.progressText}
                </p>
              </div>
              <CheckCircle2
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  badge.unlocked ? 'text-emerald-400' : 'text-slate-600'
                }`}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 7. WEEKLY & MONTHLY REPORTS (EXPORT CSV + PRINT) */}
      <section className="print-surface bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-400/12 text-cyan-300 shrink-0">
              <BarChart3 className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100">{reportData.periodLabel}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {formatDateShort(reportData.startDateISO)} – {formatDateShort(reportData.endDateISO)}
              </p>
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 bg-[#070A14] border border-slate-800 rounded-lg">
              {(['weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReportPeriod(p)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md capitalize cursor-pointer ${
                    reportPeriod === p
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-300 hover:text-cyan-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-[#070A14] hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Spending', val: formatINR(reportData.totalSpendingRecorded) },
            { label: 'Saved', val: formatINR(reportData.moneySavedBeforeExpiry) },
            { label: 'Prevented', val: formatINR(reportData.foodWastePreventedValue) },
            { label: 'Wasted', val: formatINR(reportData.totalWastedValue) },
            { label: 'Food Saved', val: `${reportData.kgSaved} kg` },
            { label: 'CO₂e Avoided', val: `${reportData.co2AvoidedKg} kg` },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-lg bg-[#070A14] border border-slate-800">
              <p className="text-[11px] text-slate-400">{stat.label}</p>
              <p className="mt-1 text-sm font-mono font-bold text-slate-100 tabular-nums">
                {stat.val}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. CONSUMPTION & WASTE HISTORY TABLE */}
      <section className="bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Consumption &amp; Waste History ({transactions.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable local event log preserving price snapshots even if items are deleted from inventory.
            </p>
          </div>

          {transactions.length > 0 && (
            <div className="no-print">
              {confirmClearHistory ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-300">Clear all logs?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearHistory();
                      setConfirmClearHistory(false);
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded cursor-pointer"
                  >
                    Yes, Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearHistory(false)}
                    className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearHistory(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-lg cursor-pointer"
                >
                  <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Clear History</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search & Filter Row */}
        <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder="Search history by item..."
              aria-label="Search transaction history"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <select
            value={txTypeFilter}
            onChange={(e) => setTxTypeFilter(e.target.value as 'all' | 'consumed' | 'wasted')}
            aria-label="Filter by action type"
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="all">All Actions (Consumed &amp; Wasted)</option>
            <option value="consumed">Consumed Only</option>
            <option value="wasted">Wasted Only</option>
          </select>

          <select
            value={txCategoryFilter}
            onChange={(e) => setTxCategoryFilter(e.target.value as 'All' | FoodCategory)}
            aria-label="Filter history by category"
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            {FOOD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          <select
            value={txSort}
            onChange={(e) => setTxSort(e.target.value as 'newest' | 'value_desc' | 'qty_desc')}
            aria-label="Sort history"
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="newest">Sort: Most Recent</option>
            <option value="value_desc">Sort: Highest ₹ Value</option>
            <option value="qty_desc">Sort: Highest Quantity</option>
          </select>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#070A14] border border-slate-800 text-center text-xs text-slate-400">
            {transactions.length === 0
              ? 'No consumption or waste activity logged yet. Mark items in your Food Inventory as Consumed or Wasted to build your real history.'
              : 'No history records match your current filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#070A14] text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-3.5 font-semibold">Date</th>
                  <th className="py-3 px-3.5 font-semibold">Grocery</th>
                  <th className="py-3 px-3.5 font-semibold">Action</th>
                  <th className="py-3 px-3.5 font-semibold">Quantity</th>
                  <th className="py-3 px-3.5 font-semibold">Est. Value</th>
                  <th className="py-3 px-3.5 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredTransactions.map((tx) => {
                  const isConsumed = tx.transactionType === 'consumed';
                  return (
                    <tr key={tx.transactionId} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3.5 font-mono text-slate-300 tabular-nums whitespace-nowrap">
                        {formatDateShort(tx.dateISO)}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-slate-100">{tx.groceryName}</span>
                        <span className="block text-[11px] text-slate-400">{tx.category}</span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            isConsumed ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {isConsumed ? 'Consumed' : 'Wasted'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-cyan-200 tabular-nums whitespace-nowrap">
                        {formatQty(tx.quantity)} {tx.unit}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums whitespace-nowrap">
                        {tx.estimatedMonetaryValue !== null ? (
                          <span className={isConsumed ? 'text-emerald-300' : 'text-rose-300'}>
                            {formatINR(tx.estimatedMonetaryValue)}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-sans">Price not recorded</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-400">
                        {isConsumed ? (
                          tx.wasApproachingExpiry ? (
                            <span className="text-amber-300">Approaching expiry rescue</span>
                          ) : tx.daysRemainingAtEvent !== null && tx.daysRemainingAtEvent < 0 ? (
                            <span className="text-slate-400">Consumed past expiry</span>
                          ) : (
                            <span>Used before expiry</span>
                          )
                        ) : (
                          <span>
                            {tx.reason ?? 'Wasted'}
                            {tx.reasonNote ? ` · ${tx.reasonNote}` : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </motion.div>
  );
}
