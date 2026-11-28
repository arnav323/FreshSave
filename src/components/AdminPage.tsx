import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Eye,
  IndianRupee,
  Leaf,
  LineChart as LineChartIcon,
  Package,
  PieChart as PieChartIcon,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Utensils,
  XCircle,
} from 'lucide-react';
import type {
  EnvFactorConfig,
  FoodCategory,
  FoodItem,
  FoodTransaction,
  PurchaseRecord,
  WasteGoalsConfig,
} from '../types/food';
import { computeAnalyticsSummary, formatINR, formatQty } from '../utils/analyticsEngine';
import {
  buildAdminCircleSlices,
  buildAdminLineSeries,
  generateAdminReportPdf,
  type AdminPdfActivityRow,
} from '../utils/adminChartsAndPdf';
import {
  formatDateShort,
  formatDaysRemainingLabel,
  getDaysRemaining,
  getExpiryStatus,
  getTodayISO,
} from '../utils/dateUtils';
import {
  loadEnvFactors,
  loadGoalsConfig,
  loadInventory,
  loadPurchaseRecords,
  loadTransactions,
} from '../utils/storage';
import {
  AdminCircleChart,
  AdminLineChart,
  AdminPdfPreviewModal,
} from './AdminCharts';

const CATEGORIES: FoodCategory[] = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Beverages',
  'Leftovers',
];

const FRESHSAVE_STORAGE_KEYS = new Set([
  'freshsave_local_inventory_v2',
  'freshsave_transactions_v1',
  'freshsave_purchase_records_v1',
  'freshsave_env_factors_v1',
  'freshsave_goals_v1',
]);

type LocalActivityKind = 'added' | 'consumed' | 'wasted';

interface DerivedLocalActivity {
  id: string;
  kind: LocalActivityKind;
  groceryName: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  expiryDate: string | null;
  expirySource?: 'manual' | 'estimated';
  monetaryValue: number | null;
  wasApproachingExpiry?: boolean;
  wasteReason?: string;
  reasonNote?: string;
  timestampMs: number;
  timestampIso: string;
}

interface LocalStorageSnapshot {
  items: FoodItem[];
  transactions: FoodTransaction[];
  purchaseRecords: PurchaseRecord[];
  envFactors: EnvFactorConfig;
  goalsConfig: WasteGoalsConfig;
  loadedAt: string;
}

interface AdminPageProps {
  onNavigateHome: () => void;
}

function readSnapshotFromLocalStorage(): LocalStorageSnapshot {
  return {
    items: loadInventory(),
    transactions: loadTransactions(),
    purchaseRecords: loadPurchaseRecords(),
    envFactors: loadEnvFactors(),
    goalsConfig: loadGoalsConfig(),
    loadedAt: new Date().toISOString(),
  };
}

export function AdminPage({ onNavigateHome }: AdminPageProps) {
  const [snapshot, setSnapshot] = useState<LocalStorageSnapshot>(() =>
    readSnapshotFromLocalStorage()
  );
  const [activityFilter, setActivityFilter] = useState<'all' | LocalActivityKind>('all');
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const today = getTodayISO();

  const reloadFromStorage = useCallback((showFeedback = false) => {
    setSnapshot(readSnapshotFromLocalStorage());
    if (showFeedback) {
      setRefreshNotice('Reloaded latest FreshSave data from browser localStorage.');
    }
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || FRESHSAVE_STORAGE_KEYS.has(event.key)) {
        reloadFromStorage(false);
      }
    };

    const handleFocus = () => {
      reloadFromStorage(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadFromStorage(false);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reloadFromStorage]);

  useEffect(() => {
    if (!refreshNotice) return;
    const timer = window.setTimeout(() => setRefreshNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [refreshNotice]);

  const dashboardData = useMemo(() => {
    const { items, transactions, purchaseRecords, envFactors } = snapshot;

    const summary = computeAnalyticsSummary(
      items,
      transactions,
      purchaseRecords,
      envFactors,
      'all_time',
      today
    );

    const distinctGroceryIds = new Set<string>();
    for (const item of items) distinctGroceryIds.add(item.id);
    for (const rec of purchaseRecords) distinctGroceryIds.add(rec.groceryId);
    for (const tx of transactions) distinctGroceryIds.add(tx.groceryId);

    let freshActiveCount = 0;
    let expiringSoonActiveCount = 0;
    let expiredActiveCount = 0;
    let noExpiryActiveCount = 0;

    const categoryMap = new Map<
      FoodCategory,
      {
        category: FoodCategory;
        activeCount: number;
        activeValue: number;
        expiredActiveCount: number;
        consumedCount: number;
        consumedValue: number;
        wastedCount: number;
        wastedValue: number;
      }
    >();

    for (const cat of CATEGORIES) {
      categoryMap.set(cat, {
        category: cat,
        activeCount: 0,
        activeValue: 0,
        expiredActiveCount: 0,
        consumedCount: 0,
        consumedValue: 0,
        wastedCount: 0,
        wastedValue: 0,
      });
    }

    for (const item of items) {
      const days = getDaysRemaining(item.expiryDate, today);
      const status = getExpiryStatus(days);
      if (status === 'fresh') freshActiveCount += 1;
      else if (status === 'expiring_soon') expiringSoonActiveCount += 1;
      else if (status === 'expired') expiredActiveCount += 1;
      else noExpiryActiveCount += 1;

      const entry = categoryMap.get(item.category);
      if (entry) {
        entry.activeCount += 1;
        if (status === 'expired') entry.expiredActiveCount += 1;
        if (typeof item.pricePerUnit === 'number' && Number.isFinite(item.pricePerUnit)) {
          entry.activeValue += item.quantity * item.pricePerUnit;
        }
      }
    }

    for (const tx of transactions) {
      const entry = categoryMap.get(tx.category);
      if (!entry) continue;
      const val = tx.estimatedMonetaryValue ?? 0;
      if (tx.transactionType === 'consumed') {
        entry.consumedCount += 1;
        entry.consumedValue += val;
      } else {
        entry.wastedCount += 1;
        entry.wastedValue += val;
      }
    }

    const categoryBreakdown = Array.from(categoryMap.values()).map((c) => ({
      ...c,
      activeValue: Math.round(c.activeValue * 100) / 100,
      consumedValue: Math.round(c.consumedValue * 100) / 100,
      wastedValue: Math.round(c.wastedValue * 100) / 100,
    }));

    const activities: DerivedLocalActivity[] = [];

    for (const tx of transactions) {
      const parsedMs = Date.parse(tx.dateTime);
      activities.push({
        id: `tx-${tx.transactionId}`,
        kind: tx.transactionType === 'consumed' ? 'consumed' : 'wasted',
        groceryName: tx.groceryName,
        category: tx.category,
        quantity: tx.quantity,
        unit: tx.unit,
        expiryDate: null,
        monetaryValue: tx.estimatedMonetaryValue,
        wasApproachingExpiry: tx.wasApproachingExpiry,
        wasteReason: tx.reason,
        reasonNote: tx.reasonNote,
        timestampMs: Number.isFinite(parsedMs) ? parsedMs : 0,
        timestampIso: tx.dateTime,
      });
    }

    for (const item of items) {
      const createdMs = typeof item.createdAt === 'number' ? item.createdAt : Date.now();
      activities.push({
        id: `item-${item.id}`,
        kind: 'added',
        groceryName: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate,
        expirySource: item.expirySource,
        monetaryValue: item.purchasePrice ?? null,
        timestampMs: createdMs,
        timestampIso: new Date(createdMs).toISOString(),
      });
    }

    activities.sort((a, b) => b.timestampMs - a.timestampMs);

    const circleSlices = buildAdminCircleSlices({
      freshActiveCount,
      expiringSoonActiveCount,
      expiredActiveCount,
      noExpiryActiveCount,
      consumedCount: summary.consumedCount,
      wastedCount: summary.wastedCount,
    });

    const linePoints = buildAdminLineSeries(items, transactions);

    return {
      summary,
      totalGroceriesCount: distinctGroceryIds.size,
      activeGroceriesCount: items.length,
      freshActiveCount,
      expiringSoonActiveCount,
      expiredActiveCount,
      noExpiryActiveCount,
      categoryBreakdown,
      activities,
      circleSlices,
      linePoints,
    };
  }, [snapshot, today]);

  const {
    summary,
    totalGroceriesCount,
    activeGroceriesCount,
    freshActiveCount,
    expiringSoonActiveCount,
    expiredActiveCount,
    noExpiryActiveCount,
    categoryBreakdown,
    activities,
    circleSlices,
    linePoints,
  } = dashboardData;

  const pdfActivityRows: AdminPdfActivityRow[] = useMemo(
    () =>
      activities.map((act) => ({
        kind: act.kind,
        groceryName: act.groceryName,
        category: act.category,
        quantity: act.quantity,
        unit: act.unit,
        timestampIso: act.timestampIso,
        detailText:
          act.kind === 'consumed'
            ? act.monetaryValue !== null
              ? `+${formatINR(act.monetaryValue)} saved`
              : 'Consumed'
            : act.kind === 'wasted'
            ? act.monetaryValue !== null
              ? `-${formatINR(act.monetaryValue)} loss`
              : act.wasteReason || 'Wasted'
            : act.expiryDate
            ? `Exp: ${act.expiryDate}`
            : 'No expiry',
      })),
    [activities]
  );

  const filteredActivities =
    activityFilter === 'all'
      ? activities
      : activities.filter((a) => a.kind === activityFilter);

  const maxCategoryActivity = Math.max(
    1,
    ...categoryBreakdown.map((c) => Math.max(c.activeCount, c.consumedCount, c.wastedCount))
  );

  const maxFinancialBar = Math.max(
    1,
    summary.totalSpendingRecorded,
    summary.totalMoneySaved,
    summary.estimatedValueConsumed,
    summary.currentInventoryValue,
    summary.totalFoodWastedValue
  );

  const handleDownloadPdf = () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const doc = generateAdminReportPdf({
        today,
        totalGroceriesCount,
        activeGroceriesCount,
        freshActiveCount,
        expiringSoonActiveCount,
        expiredActiveCount,
        noExpiryActiveCount,
        summary,
        categoryBreakdown: categoryBreakdown.map((c) => ({
          category: c.category,
          activeCount: c.activeCount,
          consumedCount: c.consumedCount,
          wastedCount: c.wastedCount,
        })),
        circleSlices,
        linePoints,
        recentActivities: pdfActivityRows,
      });
      doc.save(`freshsave-local-admin-report-${today}.pdf`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <>
      <div
        className={`min-h-screen cyber-backdrop text-slate-100 flex flex-col ${
          showPdfPreview ? 'no-print' : ''
        }`}
      >
        {/* Top Header */}
        <header className="no-print border-b border-cyan-400/20 bg-[#090C18]/95 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 via-emerald-400 to-fuchsia-500 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.4)] shrink-0">
                <Leaf className="w-4 h-4" aria-hidden="true" />
              </span>
              <div>
                <span className="block font-display text-sm font-bold tracking-wider text-slate-100 leading-none">
                  FRESHSAVE ADMIN
                </span>
                <span className="block text-[11px] text-cyan-300/80 mt-1 leading-none">
                  Local Storage Overview &amp; Live Activity Monitor
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => reloadFromStorage(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cyan-200 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-cyan-300 bg-[#0D1121] border border-slate-700 hover:border-cyan-400/40 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Back to FreshSave</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Live Sync Banner */}
          <div className="bg-[#0D1121]/90 rounded-xl border border-cyan-400/25 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-slate-100">
                FreshSave Local Admin Dashboard
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Reading directly from browser localStorage · Auto-syncs across tabs · Last loaded{' '}
                {new Date(snapshot.loadedAt).toLocaleTimeString()}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                reloadFromStorage(false);
                setShowPdfPreview(true);
              }}
              className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shadow-[0_0_16px_rgba(34,211,238,0.25)]"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export / Print PDF</span>
            </button>
          </div>

          {refreshNotice && (
            <div
              role="status"
              className="no-print p-3 rounded-xl bg-emerald-500/12 border border-emerald-400/40 text-xs text-emerald-200"
            >
              {refreshNotice}
            </div>
          )}

          {/* Primary KPI Cards */}
          <section aria-label="Local FreshSave KPIs" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                label: 'Total Groceries',
                value: String(totalGroceriesCount),
                sub: `${snapshot.purchaseRecords.length} with recorded price`,
                icon: ShoppingBag,
                tone: 'text-cyan-300',
                border: 'border-cyan-400/30',
              },
              {
                label: 'Active Groceries',
                value: String(activeGroceriesCount),
                sub: `${freshActiveCount} fresh · ${expiringSoonActiveCount} expiring soon`,
                icon: Package,
                tone: 'text-sky-300',
                border: 'border-sky-400/30',
              },
              {
                label: 'Consumed Items',
                value: String(summary.consumedCount),
                sub: `${summary.consumedBeforeExpiryCount} before expiry`,
                icon: Utensils,
                tone: 'text-emerald-300',
                border: 'border-emerald-400/30',
              },
              {
                label: 'Expired / Wasted',
                value: String(expiredActiveCount + summary.wastedCount),
                sub: `${expiredActiveCount} active expired · ${summary.wastedCount} logged wasted`,
                icon: XCircle,
                tone: 'text-rose-300',
                border: 'border-rose-500/30',
              },
              {
                label: 'Savings Tracked',
                value: formatINR(summary.totalMoneySaved),
                sub: `${formatINR(summary.foodWastePreventedValue)} waste prevented`,
                icon: IndianRupee,
                tone: 'text-amber-300',
                border: 'border-amber-400/30',
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className={`bg-[#0D1121]/90 rounded-xl p-4 border ${kpi.border} space-y-2`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-slate-300">{kpi.label}</span>
                    <Icon className={`w-4 h-4 shrink-0 ${kpi.tone}`} aria-hidden="true" />
                  </div>
                  <p className={`text-2xl font-bold font-mono tabular-nums ${kpi.tone}`}>
                    {kpi.value}
                  </p>
                  <p className="text-[11px] text-slate-400">{kpi.sub}</p>
                </div>
              );
            })}
          </section>

          {/* Visual Circle & Line Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <PieChartIcon className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                  <h2 className="text-base font-bold text-slate-100">
                    Inventory &amp; Outcome Circle Chart
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">Live split</span>
              </div>
              <AdminCircleChart slices={circleSlices} variant="dark" />
            </section>

            <section className="bg-[#0D1121]/90 rounded-xl border border-fuchsia-500/20 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <LineChartIcon className="w-4 h-4 text-fuchsia-300" aria-hidden="true" />
                  <h2 className="text-base font-bold text-slate-100">
                    Activity Trend Line Chart
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">By date</span>
              </div>
              <AdminLineChart points={linePoints} variant="dark" />
            </section>
          </div>

          {/* Financial & Inventory Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-300" aria-hidden="true" />
                  <h2 className="text-base font-bold text-slate-100">
                    Savings &amp; Financial Overview
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Waste Rate:{' '}
                  <strong className="text-amber-300">
                    {summary.wasteRatePercent !== null ? `${summary.wasteRatePercent}%` : 'N/A'}
                  </strong>
                </span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: 'Total Recorded Grocery Spending',
                    val: summary.totalSpendingRecorded,
                    bar: 'bg-cyan-400',
                    tone: 'text-cyan-200',
                  },
                  {
                    label: 'Money Saved (Consumed Before Expiry)',
                    val: summary.totalMoneySaved,
                    bar: 'bg-emerald-400',
                    tone: 'text-emerald-300',
                  },
                  {
                    label: 'Waste Prevented (Near-Expiry Consumed)',
                    val: summary.foodWastePreventedValue,
                    bar: 'bg-teal-400',
                    tone: 'text-teal-300',
                  },
                  {
                    label: 'Current Active Inventory Value',
                    val: summary.currentInventoryValue,
                    bar: 'bg-sky-400',
                    tone: 'text-sky-300',
                  },
                  {
                    label: 'Food Wasted Loss',
                    val: summary.totalFoodWastedValue,
                    bar: 'bg-rose-400',
                    tone: 'text-rose-300',
                  },
                ].map((row) => {
                  const pct = Math.round((row.val / maxFinancialBar) * 100);
                  return (
                    <div key={row.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{row.label}</span>
                        <span className={`font-mono font-semibold tabular-nums ${row.tone}`}>
                          {formatINR(row.val)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#182039] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.bar} transition-all`}
                          style={{ width: `${row.val > 0 ? Math.max(3, pct) : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-[#0D1121]/90 rounded-xl border border-fuchsia-500/20 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-fuchsia-300" aria-hidden="true" />
                <h2 className="text-base font-bold text-slate-100">
                  Active Inventory Freshness &amp; Quantities
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'Fresh (> 3 days)',
                    val: freshActiveCount,
                    tone: 'text-emerald-300',
                    border: 'border-emerald-400/25',
                  },
                  {
                    label: 'Expiring Soon (0–3 days)',
                    val: expiringSoonActiveCount,
                    tone: 'text-amber-300',
                    border: 'border-amber-400/25',
                  },
                  {
                    label: 'Expired Active',
                    val: expiredActiveCount,
                    tone: 'text-rose-300',
                    border: 'border-rose-500/25',
                  },
                  {
                    label: 'No Expiry Date',
                    val: noExpiryActiveCount,
                    tone: 'text-cyan-300',
                    border: 'border-cyan-400/25',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`p-3.5 rounded-xl bg-[#070A14] border ${stat.border}`}
                  >
                    <p className="text-xs text-slate-400">{stat.label}</p>
                    <p className={`mt-1 text-xl font-bold font-mono tabular-nums ${stat.tone}`}>
                      {stat.val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-[#070A14] border border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-300">
                  Total Consumed Quantities by Unit
                </p>
                {summary.unitBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-500">No consumed quantities recorded yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {summary.unitBreakdown.map((u) => (
                      <span
                        key={u.unit}
                        className="px-2.5 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/30 text-xs font-mono text-emerald-200"
                      >
                        {formatQty(u.totalQuantity)} {u.unit} ({u.count})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Category Breakdown & Active Inventory */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                <h2 className="text-base font-bold text-slate-100">Category Breakdown</h2>
              </div>

              <div className="space-y-3">
                {categoryBreakdown.map((cat) => {
                  const activePct = Math.round((cat.activeCount / maxCategoryActivity) * 100);
                  const consumedPct = Math.round((cat.consumedCount / maxCategoryActivity) * 100);
                  const wastedPct = Math.round((cat.wastedCount / maxCategoryActivity) * 100);
                  return (
                    <div
                      key={cat.category}
                      className="p-3 rounded-lg bg-[#070A14] border border-slate-800 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-200">{cat.category}</span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          Active <strong className="text-cyan-300">{cat.activeCount}</strong> ·
                          Consumed <strong className="text-emerald-300">{cat.consumedCount}</strong> ·
                          Wasted <strong className="text-rose-300">{cat.wastedCount}</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-1.5 rounded-full bg-[#182039] overflow-hidden" title="Active">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${cat.activeCount > 0 ? Math.max(5, activePct) : 0}%` }}
                          />
                        </div>
                        <div className="h-1.5 rounded-full bg-[#182039] overflow-hidden" title="Consumed">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${cat.consumedCount > 0 ? Math.max(5, consumedPct) : 0}%` }}
                          />
                        </div>
                        <div className="h-1.5 rounded-full bg-[#182039] overflow-hidden" title="Wasted">
                          <div
                            className="h-full bg-rose-400 rounded-full"
                            style={{ width: `${cat.wastedCount > 0 ? Math.max(5, wastedPct) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" aria-hidden="true" />
                  <h2 className="text-base font-bold text-slate-100">
                    Active Inventory ({snapshot.items.length})
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Today: {formatDateShort(today)}
                </span>
              </div>

              {snapshot.items.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#070A14] border border-slate-800 text-center text-xs text-slate-400">
                  No active groceries in localStorage yet. Add items in FreshSave and they will appear here automatically.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#070A14] text-slate-400 border-b border-slate-800 sticky top-0">
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Qty</th>
                        <th className="py-2.5 px-3">Expiry Status</th>
                        <th className="py-2.5 px-3">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {snapshot.items.map((item) => {
                        const days = getDaysRemaining(item.expiryDate, today);
                        const status = getExpiryStatus(days);
                        const statusTone =
                          status === 'expired'
                            ? 'text-rose-300'
                            : status === 'expiring_soon'
                            ? 'text-amber-300'
                            : status === 'fresh'
                            ? 'text-emerald-300'
                            : 'text-slate-400';
                        const remVal =
                          typeof item.pricePerUnit === 'number'
                            ? item.quantity * item.pricePerUnit
                            : null;
                        return (
                          <tr key={item.id}>
                            <td className="py-2.5 px-3 font-semibold text-slate-100">{item.name}</td>
                            <td className="py-2.5 px-3 text-slate-300">{item.category}</td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                              {formatQty(item.quantity)} {item.unit}
                            </td>
                            <td className={`py-2.5 px-3 font-mono ${statusTone}`}>
                              {formatDaysRemainingLabel(days)}
                              {item.expirySource === 'estimated' ? ' (Est.)' : ''}
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-cyan-300">
                              {remVal !== null ? formatINR(remVal) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Monthly Trends */}
          {summary.monthlyTrends.length > 0 && (
            <section className="bg-[#0D1121]/90 rounded-xl border border-fuchsia-500/20 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-fuchsia-300" aria-hidden="true" />
                <h2 className="text-base font-bold text-slate-100">Monthly Consumed vs. Wasted</h2>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#070A14] text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Consumed Value</th>
                      <th className="py-2.5 px-3">Wasted Items</th>
                      <th className="py-2.5 px-3">Wasted Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {summary.monthlyTrends.map((m) => (
                      <tr key={m.monthKey}>
                        <td className="py-2.5 px-3 font-mono text-cyan-300">{m.label}</td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-emerald-300">
                          {formatINR(m.consumedValue)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                          {m.wastedCount}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-rose-300">
                          {formatINR(m.wastedValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Recent Activity Feed */}
          <section className="bg-[#0D1121]/90 rounded-xl border border-cyan-400/25 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    Recent Activity ({activities.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live feed from FreshSave inventory additions, consumptions, and waste logs in localStorage.
                  </p>
                </div>
              </div>

              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value as 'all' | LocalActivityKind)}
                aria-label="Filter recent activities"
                className="no-print px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">All Activities ({activities.length})</option>
                <option value="added">Added to Inventory</option>
                <option value="consumed">Consumed</option>
                <option value="wasted">Wasted</option>
              </select>
            </div>

            {filteredActivities.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#070A14] border border-slate-800 text-center text-xs text-slate-400">
                No FreshSave activity recorded in localStorage yet. Add groceries, mark items as consumed, or log waste to see activity here.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#070A14] text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Grocery</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Quantity</th>
                      <th className="py-2.5 px-3">Details / Impact</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredActivities.slice(0, 100).map((act) => {
                      const badgeClass =
                        act.kind === 'consumed'
                          ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40'
                          : act.kind === 'wasted'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                          : 'bg-cyan-400/15 text-cyan-300 border-cyan-400/40';
                      return (
                        <tr key={act.id} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${badgeClass}`}
                            >
                              {act.kind.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-100">
                            {act.groceryName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                            {act.category}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200 whitespace-nowrap">
                            {formatQty(act.quantity)} {act.unit}
                          </td>
                          <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                            {act.kind === 'consumed' ? (
                              <span className="text-emerald-300">
                                {act.monetaryValue !== null ? `+${formatINR(act.monetaryValue)} saved` : 'Consumed'}
                                {act.wasApproachingExpiry ? ' · Waste prevented' : ''}
                              </span>
                            ) : act.kind === 'wasted' ? (
                              <span className="text-rose-300">
                                {act.monetaryValue !== null ? `-${formatINR(act.monetaryValue)} loss` : 'Wasted'}
                                {act.wasteReason ? ` · ${act.wasteReason}` : ''}
                              </span>
                            ) : (
                              <span className="text-cyan-300">
                                {act.expiryDate ? `Exp: ${act.expiryDate}` : 'No expiry'}
                                {act.expirySource === 'estimated' ? ' (Est.)' : ''}
                                {act.monetaryValue !== null ? ` · ${formatINR(act.monetaryValue)}` : ''}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(act.timestampIso).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Printable PDF Preview Modal */}
      <AdminPdfPreviewModal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        onDownloadPdf={handleDownloadPdf}
        downloadingPdf={downloadingPdf}
        today={today}
        totalGroceriesCount={totalGroceriesCount}
        activeGroceriesCount={activeGroceriesCount}
        freshActiveCount={freshActiveCount}
        expiringSoonActiveCount={expiringSoonActiveCount}
        expiredActiveCount={expiredActiveCount}
        noExpiryActiveCount={noExpiryActiveCount}
        summary={summary}
        categoryBreakdown={categoryBreakdown.map((c) => ({
          category: c.category,
          activeCount: c.activeCount,
          consumedCount: c.consumedCount,
          wastedCount: c.wastedCount,
        }))}
        circleSlices={circleSlices}
        linePoints={linePoints}
        recentActivities={pdfActivityRows}
      />
    </>
  );
}
