import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Clock,
  Lightbulb,
  Package,
  Plus,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { ExpiryStatus, FoodCategory, FoodItem, NavSection } from '../types/food';
import { formatDaysRemainingLabel, getDaysRemaining, getExpiryStatus } from '../utils/dateUtils';
import { generateConsumeFirstPlan } from '../utils/recommendationsEngine';
import { FoodCategoryIcon } from './FoodCategoryIcon';

export type StatusFilter = 'all' | Exclude<ExpiryStatus, 'no_expiry'>;

interface DashboardViewProps {
  items: FoodItem[];
  today: string;
  onNavigate: (section: NavSection) => void;
  onFilterInventory: (filter: StatusFilter) => void;
  onAddClick: () => void;
}

const ALL_CATEGORIES: FoodCategory[] = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Beverages',
  'Leftovers',
];

export function DashboardView({
  items,
  today,
  onNavigate,
  onFilterInventory,
  onAddClick,
}: DashboardViewProps) {
  const counts = items.reduce(
    (acc, item) => {
      const days = getDaysRemaining(item.expiryDate, today);
      const status = getExpiryStatus(days);
      acc.total += 1;
      if (status === 'expired') acc.expired += 1;
      else if (status === 'expiring_soon') acc.expiringSoon += 1;
      else acc.fresh += 1; // Includes fresh (> 3 days) and items without a set expiry date
      return acc;
    },
    { total: 0, fresh: 0, expiringSoon: 0, expired: 0 }
  );

  const categoryCounts = ALL_CATEGORIES.map((cat) => ({
    category: cat,
    count: items.filter((item) => item.category === cat).length,
  }));
  const maxCategoryCount = Math.max(1, ...categoryCounts.map((c) => c.count));

  const recommendations = generateConsumeFirstPlan(items, today);
  const urgentItems = recommendations.filter(
    (r) => r.status === 'expiring_soon' || r.status === 'expired'
  );

  // Donut chart geometry
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const freshLen = counts.total > 0 ? (counts.fresh / counts.total) * circumference : 0;
  const soonLen = counts.total > 0 ? (counts.expiringSoon / counts.total) * circumference : 0;
  const expiredLen = counts.total > 0 ? (counts.expired / counts.total) * circumference : 0;

  const kpiCards: {
    key: StatusFilter;
    label: string;
    count: number;
    caption: string;
    icon: typeof Package;
    iconBg: string;
    iconText: string;
    valueText: string;
    borderHover: string;
  }[] = [
    {
      key: 'all',
      label: 'Total Food Items',
      count: counts.total,
      caption: 'Saved in browser storage',
      icon: Package,
      iconBg: 'bg-cyan-400/12',
      iconText: 'text-cyan-300',
      valueText: 'text-cyan-200',
      borderHover: 'hover:border-cyan-400/60',
    },
    {
      key: 'fresh',
      label: 'Fresh / Unscheduled',
      count: counts.fresh,
      caption: 'Over 3 days or no expiry set',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-400/12',
      iconText: 'text-emerald-300',
      valueText: 'text-emerald-300',
      borderHover: 'hover:border-emerald-400/60',
    },
    {
      key: 'expiring_soon',
      label: 'Expiring Soon',
      count: counts.expiringSoon,
      caption: 'Within 3 days',
      icon: Clock,
      iconBg: 'bg-amber-400/12',
      iconText: 'text-amber-300',
      valueText: 'text-amber-300',
      borderHover: 'hover:border-amber-400/60',
    },
    {
      key: 'expired',
      label: 'Expired Items',
      count: counts.expired,
      caption: 'Past expiry date',
      icon: AlertOctagon,
      iconBg: 'bg-rose-500/15',
      iconText: 'text-rose-300',
      valueText: 'text-rose-300',
      borderHover: 'hover:border-rose-400/60',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* 4 KPI Summary Cards */}
      <section aria-label="Dashboard metrics" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.key}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              onClick={() => onFilterInventory(card.key)}
              className={`text-left bg-[#0D1121]/90 backdrop-blur-sm rounded-xl p-5 border border-slate-800 transition-all cursor-pointer ${card.borderHover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-slate-300">{card.label}</span>
                <span
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${card.iconBg} ${card.iconText}`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
              </div>
              <div className={`mt-3 text-3xl font-bold tracking-tight tabular-nums font-mono ${card.valueText}`}>
                {card.count}
              </div>
              <p className="mt-1 text-xs text-slate-400">{card.caption}</p>
            </motion.button>
          );
        })}
      </section>

      {items.length === 0 ? (
        <section className="relative bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-cyan-400/25 p-10 text-center overflow-hidden">
          <span className="pointer-events-none absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-cyan-400/60" />
          <span className="pointer-events-none absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-fuchsia-400/60" />
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 mb-3">
            <FoodCategoryIcon category="Produce" className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Your kitchen grid is empty</h2>
          <p className="mt-1.5 text-sm text-slate-400 max-w-md mx-auto">
            Add groceries you bought—enter their expiry date if you know it, or leave it blank—to unlock live charts, rule-based consumption order, and recipes.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onAddClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add First Food Item</span>
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Charts Row */}
          <section aria-label="Inventory charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Neon SVG Donut Chart */}
            <div className="relative bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-cyan-400/20 p-6">
              <span className="pointer-events-none absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400/60" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-fuchsia-400/60" />
              <div className="mb-5">
                <h2 className="text-base font-bold text-slate-100">Expiry Status Breakdown</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live distribution calculated against today&apos;s date
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative w-36 h-36 shrink-0">
                  <svg viewBox="0 0 144 144" className="w-full h-full -rotate-90" role="img" aria-label="Expiry status breakdown chart">
                    <circle
                      cx="72"
                      cy="72"
                      r={radius}
                      fill="none"
                      stroke="#182039"
                      strokeWidth="16"
                    />
                    {counts.fresh > 0 && (
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="16"
                        strokeDasharray={`${freshLen} ${circumference}`}
                        strokeDashoffset={0}
                        className="transition-all duration-500"
                      />
                    )}
                    {counts.expiringSoon > 0 && (
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        fill="none"
                        stroke="#FBBF24"
                        strokeWidth="16"
                        strokeDasharray={`${soonLen} ${circumference}`}
                        strokeDashoffset={-freshLen}
                        className="transition-all duration-500"
                      />
                    )}
                    {counts.expired > 0 && (
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        fill="none"
                        stroke="#FB7185"
                        strokeWidth="16"
                        strokeDasharray={`${expiredLen} ${circumference}`}
                        strokeDashoffset={-(freshLen + soonLen)}
                        className="transition-all duration-500"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold font-mono text-cyan-200 tabular-nums">
                      {counts.total}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">Total Items</span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-3">
                  {[
                    {
                      label: 'Fresh / Unscheduled',
                      count: counts.fresh,
                      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
                      filter: 'fresh' as StatusFilter,
                    },
                    {
                      label: 'Expiring Soon (0–3d)',
                      count: counts.expiringSoon,
                      dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]',
                      filter: 'expiring_soon' as StatusFilter,
                    },
                    {
                      label: 'Expired (< 0d)',
                      count: counts.expired,
                      dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]',
                      filter: 'expired' as StatusFilter,
                    },
                  ].map((row) => {
                    const pct = counts.total > 0 ? Math.round((row.count / counts.total) * 100) : 0;
                    return (
                      <button
                        key={row.label}
                        type="button"
                        onClick={() => onFilterInventory(row.filter)}
                        className="w-full flex items-center justify-between gap-3 py-1.5 px-2.5 -mx-2.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2.5 text-sm text-slate-300">
                          <span className={`w-3 h-3 rounded-sm shrink-0 ${row.dot}`} aria-hidden="true" />
                          <span>{row.label}</span>
                        </span>
                        <span className="text-sm font-mono font-semibold text-slate-100 tabular-nums whitespace-nowrap">
                          {row.count} <span className="text-xs font-normal text-slate-400">({pct}%)</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Category Neon Bar Chart */}
            <div className="relative bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-fuchsia-500/20 p-6">
              <span className="pointer-events-none absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-fuchsia-400/60" />
              <span className="pointer-events-none absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400/60" />
              <div className="mb-5">
                <h2 className="text-base font-bold text-slate-100">Items by Category</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Where your groceries are concentrated
                </p>
              </div>

              <div className="space-y-3">
                {categoryCounts.map(({ category, count }) => {
                  const widthPct = count > 0 ? Math.max(8, Math.round((count / maxCategoryCount) * 100)) : 0;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">{category}</span>
                        <span className="font-mono font-semibold text-cyan-300 tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#182039] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all duration-500"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Consume First & Quick Actions */}
          <section className="bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-slate-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-100">Needs Attention Next</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rule-based priority list highlighting items expiring within 3 days or past expiry
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('recommendations')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-fuchsia-300 bg-fuchsia-500/12 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>View Rule Recommendations</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('recipes')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ChefHat className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Find Recipes</span>
                </button>
              </div>
            </div>

            {urgentItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" aria-hidden="true" />
                  <p className="text-sm text-emerald-200">
                    No items expiring within 3 days. Your kitchen is in great shape!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('inventory')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:underline whitespace-nowrap cursor-pointer"
                >
                  <span>View Inventory</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {urgentItems.slice(0, 5).map(({ item, daysRemaining, status, actionTip }) => {
                  const isExpired = status === 'expired';
                  return (
                    <div
                      key={item.id}
                      className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5 ${
                            isExpired ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-400/12 text-amber-300'
                          }`}
                        >
                          <FoodCategoryIcon category={item.category} className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-slate-100 truncate">
                              {item.name}
                            </span>
                            <span className="text-xs font-mono text-cyan-300/80 tabular-nums">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{actionTip}</p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                          isExpired ? 'text-rose-300' : 'text-amber-300'
                        }`}
                      >
                        {isExpired ? (
                          <AlertOctagon className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{formatDaysRemainingLabel(daysRemaining)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </motion.div>
  );
}
