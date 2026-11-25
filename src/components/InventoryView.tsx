import {
  AlertOctagon,
  CalendarPlus,
  CheckCircle2,
  Clock,
  HelpCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { FoodCategory, FoodItem } from '../types/food';
import {
  formatDateShort,
  formatDaysRemainingLabel,
  getDaysRemaining,
  getExpiryStatus,
} from '../utils/dateUtils';
import type { StatusFilter } from './DashboardView';
import { FoodCategoryIcon } from './FoodCategoryIcon';

export type SortOption = 'expiry_asc' | 'newest' | 'name_asc';

const CATEGORIES: ('All' | FoodCategory)[] = [
  'All',
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Beverages',
  'Leftovers',
];

interface InventoryViewProps {
  items: FoodItem[];
  today: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (f: StatusFilter) => void;
  categoryFilter: 'All' | FoodCategory;
  onCategoryFilterChange: (c: 'All' | FoodCategory) => void;
  sortBy: SortOption;
  onSortByChange: (s: SortOption) => void;
  onEditItem: (item: FoodItem, focusExpiry?: boolean) => void;
  onDeleteItem: (item: FoodItem) => void;
  onAddClick: () => void;
}

export function InventoryView({
  items,
  today,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sortBy,
  onSortByChange,
  onEditItem,
  onDeleteItem,
  onAddClick,
}: InventoryViewProps) {
  const enriched = items.map((item) => {
    const daysRemaining = getDaysRemaining(item.expiryDate, today);
    const status = getExpiryStatus(daysRemaining);
    return { item, daysRemaining, status };
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchesSearchAndCategory = enriched.filter(({ item }) => {
    if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
    if (normalizedQuery && !item.name.toLowerCase().includes(normalizedQuery)) return false;
    return true;
  });

  const sortEntries = (list: typeof enriched) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.item.name.localeCompare(b.item.name);
      }
      if (sortBy === 'newest') {
        return b.item.createdAt - a.item.createdAt;
      }
      const aDays = a.daysRemaining ?? Number.MAX_SAFE_INTEGER;
      const bDays = b.daysRemaining ?? Number.MAX_SAFE_INTEGER;
      return aDays - bDays || a.item.name.localeCompare(b.item.name);
    });
  };

  const expiredEntries = sortEntries(
    matchesSearchAndCategory.filter((e) => e.status === 'expired')
  );
  const activeEntries = sortEntries(
    matchesSearchAndCategory.filter((e) => {
      if (e.status === 'expired') return false;
      if (statusFilter === 'expiring_soon') return e.status === 'expiring_soon';
      if (statusFilter === 'fresh') return e.status === 'fresh' || e.status === 'no_expiry';
      return true;
    })
  );

  const showSeparateExpired =
    (statusFilter === 'all' || statusFilter === 'expired') && expiredEntries.length > 0;
  const showActiveList = statusFilter !== 'expired';

  const hasActiveFilters =
    searchQuery.trim().length > 0 || categoryFilter !== 'All' || statusFilter !== 'all';

  const renderItemRow = ({
    item,
    daysRemaining,
    status,
  }: (typeof enriched)[number]) => {
    const isExpired = status === 'expired';
    const isExpiringSoon = status === 'expiring_soon';
    const isNoExpiry = status === 'no_expiry';

    const rowStyle = isExpired
      ? 'bg-[#170C18] border-rose-500/45 hover:border-rose-400/80'
      : isExpiringSoon
      ? 'bg-[#17130D] border-amber-400/45 hover:border-amber-300/80'
      : 'bg-[#0D1121]/90 border-slate-800 hover:border-cyan-400/45';

    const iconBoxStyle = isExpired
      ? 'bg-rose-500/15 text-rose-300'
      : isExpiringSoon
      ? 'bg-amber-400/15 text-amber-300'
      : isNoExpiry
      ? 'bg-fuchsia-500/15 text-fuchsia-300'
      : 'bg-emerald-400/12 text-emerald-300';

    const statusTextStyle = isExpired
      ? 'text-rose-300'
      : isExpiringSoon
      ? 'text-amber-300'
      : isNoExpiry
      ? 'text-fuchsia-300'
      : 'text-emerald-300';

    const StatusIcon = isExpired
      ? AlertOctagon
      : isExpiringSoon
      ? Clock
      : isNoExpiry
      ? HelpCircle
      : CheckCircle2;

    return (
      <div
        key={item.id}
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${rowStyle}`}
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg shrink-0 mt-0.5 ${iconBoxStyle}`}
          >
            <FoodCategoryIcon category={item.category} className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h3 className="text-base font-semibold text-slate-100 truncate">{item.name}</h3>
              <span className="text-xs font-mono font-medium text-cyan-300 tabular-nums">
                {item.quantity} {item.unit}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
              <span>{item.category}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-mono">Bought {formatDateShort(item.purchaseDate)}</span>
              <span aria-hidden="true">·</span>
              {item.expiryDate ? (
                <span className="tabular-nums font-mono">
                  Expires {formatDateShort(item.expiryDate)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onEditItem(item, true)}
                  className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 underline underline-offset-2 cursor-pointer"
                >
                  <CalendarPlus className="w-3 h-3" aria-hidden="true" />
                  <span>Set expiry date</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-13 sm:pl-0">
          <div
            className={`inline-flex items-center gap-1.5 text-sm font-mono font-semibold tabular-nums whitespace-nowrap ${statusTextStyle}`}
          >
            <StatusIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{formatDaysRemainingLabel(daysRemaining)}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEditItem(item, false)}
              aria-label={`Edit ${item.name}`}
              title={`Edit ${item.name}`}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-400/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteItem(item)}
              aria-label={`Delete ${item.name}`}
              title={`Delete ${item.name}`}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Toolbar */}
      <div className="bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-cyan-400/20 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Food Inventory &amp; Expiry Tracker</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Emerald = fresh (&gt; 3d), Amber = expiring within 3 days, Crimson = expired, Fuchsia = no expiry date set.
            </p>
          </div>

          <button
            type="button"
            onClick={onAddClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-[0_0_16px_rgba(34,211,238,0.28)] transition-colors cursor-pointer whitespace-nowrap self-start md:self-auto"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Food Item</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Segmented Status Filter */}
          <div
            role="tablist"
            aria-label="Filter by expiry status"
            className="inline-flex items-center gap-1 p-1 bg-[#070A14] border border-slate-800 rounded-lg self-start overflow-x-auto max-w-full"
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'fresh', label: 'Fresh' },
                { id: 'expiring_soon', label: 'Expiring Soon' },
                { id: 'expired', label: 'Expired' },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onStatusFilterChange(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-300 hover:text-cyan-300'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 lg:max-w-xl">
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name..."
                aria-label="Search food items by name"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value as 'All' | FoodCategory)}
              aria-label="Filter by category"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortOption)}
              aria-label="Sort items"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <option value="expiry_asc">Sort: Soonest expiry</option>
              <option value="newest">Sort: Recently added</option>
              <option value="name_asc">Sort: Name (A–Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty Inventory State (zero presets) */}
      {items.length === 0 ? (
        <div className="bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-cyan-400/20 p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/25 mb-3">
            <FoodCategoryIcon category="Produce" className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Your food inventory is empty</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
            Add your own food items to start tracking. Enter an expiry date if you know it, or leave it blank and update later.
          </p>
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={onAddClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.28)] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add First Food Item</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Separate Expired Items Section */}
          {showSeparateExpired && (
            <div className="bg-rose-950/25 rounded-xl border border-rose-500/45 p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-rose-300">
                  <AlertOctagon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <h3 className="text-sm font-bold">
                    Expired Items ({expiredEntries.length})
                  </h3>
                </div>
                <span className="text-xs text-rose-300/80">
                  Inspect carefully for safety or remove from inventory
                </span>
              </div>
              <div className="space-y-2.5">{expiredEntries.map(renderItemRow)}</div>
            </div>
          )}

          {/* Active Items */}
          {showActiveList && (
            <div className="space-y-2.5">
              {activeEntries.length > 0 ? (
                <>
                  {showSeparateExpired && (
                    <h3 className="text-xs font-semibold text-slate-400 px-1 pt-1">
                      Active Items ({activeEntries.length})
                    </h3>
                  )}
                  {activeEntries.map(renderItemRow)}
                </>
              ) : (
                !showSeparateExpired && (
                  <div className="bg-[#0D1121]/90 rounded-xl border border-slate-800 p-8 text-center">
                    <p className="text-sm font-medium text-slate-200">
                      No food items match your current search or filters.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          onSearchChange('');
                          onCategoryFilterChange('All');
                          onStatusFilterChange('all');
                        }}
                        className="mt-3 px-4 py-2 text-xs font-semibold text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/25 rounded-lg transition-colors cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {statusFilter === 'expired' && expiredEntries.length === 0 && (
            <div className="bg-[#0D1121]/90 rounded-xl border border-slate-800 p-8 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-400/12 text-emerald-300 mb-2">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-slate-100">No expired food items</p>
              <p className="mt-1 text-xs text-slate-400">
                All tracked items with expiry dates are still within their freshness window.
              </p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
