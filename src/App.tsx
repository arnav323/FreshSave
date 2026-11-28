import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { AnalyticsView } from './components/AnalyticsView';
import { ConsumeModal } from './components/ConsumeModal';
import { DashboardView, type StatusFilter } from './components/DashboardView';
import { FoodItemModal, type FoodItemFormValues } from './components/FoodItemModal';
import { InventoryView, type SortOption } from './components/InventoryView';
import { OpeningSplash } from './components/OpeningSplash';
import { RecipeFinderView } from './components/RecipeFinderView';
import { RecommendationsView } from './components/RecommendationsView';
import { Sidebar } from './components/Sidebar';
import { StorageGuideView } from './components/StorageGuideView';
import { WasteModal } from './components/WasteModal';
import type {
  EnvFactorConfig,
  FoodCategory,
  FoodItem,
  FoodTransaction,
  NavSection,
  PurchaseRecord,
  WasteGoalsConfig,
  WasteReason,
} from './types/food';
import { computeAnalyticsSummary, formatINR, formatQty } from './utils/analyticsEngine';
import { formatDateShort, getDaysRemaining, getExpiryStatus, getTodayISO } from './utils/dateUtils';
import {
  loadEnvFactors,
  loadGoalsConfig,
  loadInventory,
  loadPurchaseRecords,
  loadTransactions,
  saveEnvFactors,
  saveGoalsConfig,
  saveInventory,
  savePurchaseRecords,
  saveTransactions,
} from './utils/storage';

const SECTION_TITLES: Record<NavSection, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Smart Food Dashboard',
    subtitle: 'Monitor your kitchen freshness, spot expiring foods early, and track inventory breakdown.',
  },
  inventory: {
    title: 'Food Inventory',
    subtitle: 'Add, search, filter, and log groceries consumed or wasted—expiry dates & prices are optional.',
  },
  analytics: {
    title: 'Waste & Savings Analytics',
    subtitle: 'Track money saved, food waste losses, environmental impact, and weekly/monthly reports locally.',
  },
  recommendations: {
    title: 'Smart Food Recommendations',
    subtitle: 'Rule-based priority order, storage tips, and recipes calculated locally in your browser.',
  },
  recipes: {
    title: 'Recipe Finder',
    subtitle: 'Match ingredients you already have against our built-in recipe database.',
  },
  storage: {
    title: 'Storage Tips',
    subtitle: 'Practical food-preservation habits to extend freshness and prevent household waste.',
  },
};

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [items, setItems] = useState<FoodItem[]>(() => loadInventory());
  const [transactions, setTransactions] = useState<FoodTransaction[]>(() => loadTransactions());
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>(() =>
    loadPurchaseRecords()
  );
  const [envFactors, setEnvFactors] = useState<EnvFactorConfig>(() => loadEnvFactors());
  const [goalsConfig, setGoalsConfig] = useState<WasteGoalsConfig>(() => loadGoalsConfig());

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<'All' | FoodCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('expiry_asc');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [focusExpiryOnOpen, setFocusExpiryOnOpen] = useState(false);
  const [consumingItem, setConsumingItem] = useState<FoodItem | null>(null);
  const [wastingItem, setWastingItem] = useState<FoodItem | null>(null);

  const [lastDeleted, setLastDeleted] = useState<FoodItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const lastTxGuardRef = useRef<{ key: string; at: number } | null>(null);

  const today = getTodayISO();

  useEffect(() => {
    saveInventory(items);
  }, [items]);

  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    savePurchaseRecords(purchaseRecords);
  }, [purchaseRecords]);

  useEffect(() => {
    saveEnvFactors(envFactors);
  }, [envFactors]);

  useEffect(() => {
    saveGoalsConfig(goalsConfig);
  }, [goalsConfig]);

  useEffect(() => {
    if (!lastDeleted) return;
    const timer = window.setTimeout(() => setLastDeleted(null), 6000);
    return () => window.clearTimeout(timer);
  }, [lastDeleted]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleCloseSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  const counts = items.reduce(
    (acc, item) => {
      const days = getDaysRemaining(item.expiryDate, today);
      const status = getExpiryStatus(days);
      acc.total += 1;
      if (status === 'expired') acc.expired += 1;
      else if (status === 'expiring_soon') acc.expiringSoon += 1;
      else acc.fresh += 1;
      return acc;
    },
    { total: 0, fresh: 0, expiringSoon: 0, expired: 0 }
  );

  const allTimeSummary = useMemo(
    () =>
      computeAnalyticsSummary(
        items,
        transactions,
        purchaseRecords,
        envFactors,
        'all_time',
        today
      ),
    [items, transactions, purchaseRecords, envFactors, today]
  );

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFocusExpiryOnOpen(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: FoodItem, focusExpiry = false) => {
    setEditingItem(item);
    setFocusExpiryOnOpen(focusExpiry);
    setModalOpen(true);
  };

  const syncPurchaseRecord = (itemId: string, values: FoodItemFormValues) => {
    setPurchaseRecords((prev) => {
      const filtered = prev.filter((r) => r.groceryId !== itemId);
      if (values.purchasePrice === null || values.purchasePrice === undefined) {
        return filtered;
      }
      const nextRecord: PurchaseRecord = {
        groceryId: itemId,
        groceryName: values.name,
        category: values.category,
        purchaseDate: values.purchaseDate,
        quantityPurchased: values.initialQuantity,
        unit: values.unit,
        totalPurchaseCost: values.purchasePrice,
        pricePerUnit: values.pricePerUnit ?? 0,
      };
      return [nextRecord, ...filtered];
    });
  };

  const handleSaveItem = (values: FoodItemFormValues, existingId?: string) => {
    if (existingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === existingId
            ? {
                ...item,
                ...values,
              }
            : item
        )
      );
      syncPurchaseRecord(existingId, values);
      setNotice(`Updated "${values.name}".`);
    } else {
      const newId = createId('item');
      const newItem: FoodItem = {
        id: newId,
        ...values,
        createdAt: Date.now(),
      };
      setItems((prev) => [newItem, ...prev]);
      syncPurchaseRecord(newId, values);
      setNotice(`Added "${values.name}" to inventory.`);
    }
    setModalOpen(false);
    setEditingItem(null);
    setFocusExpiryOnOpen(false);
  };

  const handleDeleteItem = (item: FoodItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setLastDeleted(item);
  };

  const handleUndoDelete = () => {
    if (!lastDeleted) return;
    setItems((prev) => [lastDeleted, ...prev]);
    setLastDeleted(null);
  };

  const applyInventoryDeduction = (itemId: string, deductedQty: number) => {
    setItems((prev) =>
      prev.flatMap((entry) => {
        if (entry.id !== itemId) return [entry];
        const remaining = Math.round((entry.quantity - deductedQty) * 100) / 100;
        if (remaining <= 0.0001) {
          return [];
        }
        return [{ ...entry, quantity: remaining }];
      })
    );
  };

  const handleConfirmConsume = (item: FoodItem, consumedQty: number) => {
    const guardKey = `consumed:${item.id}`;
    const now = Date.now();
    if (
      lastTxGuardRef.current &&
      lastTxGuardRef.current.key === guardKey &&
      now - lastTxGuardRef.current.at < 1500
    ) {
      return;
    }
    lastTxGuardRef.current = { key: guardKey, at: now };

    const safeQty = Math.min(item.quantity, Math.max(0.01, consumedQty));
    const daysRemaining = getDaysRemaining(item.expiryDate, today);
    const wasApproachingExpiry =
      daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;

    const unitPrice =
      typeof item.pricePerUnit === 'number' && Number.isFinite(item.pricePerUnit)
        ? item.pricePerUnit
        : null;
    const estValue =
      unitPrice !== null ? Math.round(safeQty * unitPrice * 100) / 100 : null;

    const tx: FoodTransaction = {
      transactionId: createId('tx'),
      groceryId: item.id,
      groceryName: item.name,
      category: item.category,
      transactionType: 'consumed',
      quantity: safeQty,
      unit: item.unit,
      recordedPurchasePrice: unitPrice,
      estimatedMonetaryValue: estValue,
      dateTime: new Date().toISOString(),
      dateISO: today,
      daysRemainingAtEvent: daysRemaining,
      wasApproachingExpiry,
    };

    setTransactions((prev) => [tx, ...prev]);
    applyInventoryDeduction(item.id, safeQty);
    setConsumingItem(null);

    const savedSuffix =
      estValue !== null && (daysRemaining === null || daysRemaining >= 0)
        ? ` (${formatINR(estValue)} saved)`
        : '';
    setNotice(`Logged ${formatQty(safeQty)} ${item.unit} of "${item.name}" consumed${savedSuffix}.`);
  };

  const handleConfirmWaste = (
    item: FoodItem,
    wastedQty: number,
    reason: WasteReason,
    reasonNote?: string
  ) => {
    const guardKey = `wasted:${item.id}`;
    const now = Date.now();
    if (
      lastTxGuardRef.current &&
      lastTxGuardRef.current.key === guardKey &&
      now - lastTxGuardRef.current.at < 1500
    ) {
      return;
    }
    lastTxGuardRef.current = { key: guardKey, at: now };

    const safeQty = Math.min(item.quantity, Math.max(0.01, wastedQty));
    const daysRemaining = getDaysRemaining(item.expiryDate, today);

    const unitPrice =
      typeof item.pricePerUnit === 'number' && Number.isFinite(item.pricePerUnit)
        ? item.pricePerUnit
        : null;
    const estValue =
      unitPrice !== null ? Math.round(safeQty * unitPrice * 100) / 100 : null;

    const tx: FoodTransaction = {
      transactionId: createId('tx'),
      groceryId: item.id,
      groceryName: item.name,
      category: item.category,
      transactionType: 'wasted',
      quantity: safeQty,
      unit: item.unit,
      recordedPurchasePrice: unitPrice,
      estimatedMonetaryValue: estValue,
      dateTime: new Date().toISOString(),
      dateISO: today,
      daysRemainingAtEvent: daysRemaining,
      reason,
      reasonNote,
    };

    setTransactions((prev) => [tx, ...prev]);
    applyInventoryDeduction(item.id, safeQty);
    setWastingItem(null);

    const lossSuffix = estValue !== null ? ` (${formatINR(estValue)} loss recorded)` : '';
    setNotice(`Logged ${formatQty(safeQty)} ${item.unit} of "${item.name}" wasted${lossSuffix}.`);
  };

  const handleClearHistory = () => {
    setTransactions([]);
    setNotice('Cleared consumption and waste history.');
  };

  const handleFilterInventoryFromDashboard = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setActiveSection('inventory');
  };

  const headerInfo = SECTION_TITLES[activeSection];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row cyber-backdrop text-slate-100">
      <AnimatePresence>
        {showSplash && <OpeningSplash onComplete={handleCloseSplash} />}
      </AnimatePresence>

      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onAddClick={handleOpenAdd}
        onReplayIntro={() => setShowSplash(true)}
        counts={{
          total: counts.total,
          expiringSoon: counts.expiringSoon,
          expired: counts.expired,
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-cyan-400/15">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                {headerInfo.title}
              </h1>
              <p className="mt-1 text-sm text-slate-400">{headerInfo.subtitle}</p>
            </div>
            <p className="text-xs font-mono font-medium text-cyan-300 tabular-nums shrink-0">
              Today: {formatDateShort(today)}
            </p>
          </div>

          {/* Active Section View */}
          {activeSection === 'dashboard' && (
            <DashboardView
              items={items}
              today={today}
              analyticsPreview={{
                moneySaved: allTimeSummary.totalMoneySaved,
                wastedValue: allTimeSummary.totalFoodWastedValue,
                transactionsCount: transactions.length,
              }}
              onNavigate={setActiveSection}
              onFilterInventory={handleFilterInventoryFromDashboard}
              onAddClick={handleOpenAdd}
            />
          )}

          {activeSection === 'inventory' && (
            <InventoryView
              items={items}
              today={today}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              onEditItem={handleOpenEdit}
              onDeleteItem={handleDeleteItem}
              onConsumeItem={(item) => setConsumingItem(item)}
              onWasteItem={(item) => setWastingItem(item)}
              onAddClick={handleOpenAdd}
            />
          )}

          {activeSection === 'analytics' && (
            <AnalyticsView
              items={items}
              transactions={transactions}
              purchaseRecords={purchaseRecords}
              envFactors={envFactors}
              onUpdateEnvFactors={(next) => {
                setEnvFactors(next);
                setNotice('Saved environmental estimation factors.');
              }}
              goalsConfig={goalsConfig}
              onUpdateGoalsConfig={(next) => {
                setGoalsConfig(next);
                setNotice('Updated waste reduction goals.');
              }}
              onClearHistory={handleClearHistory}
              today={today}
            />
          )}

          {activeSection === 'recommendations' && (
            <RecommendationsView
              items={items}
              today={today}
              onNavigate={setActiveSection}
              onAddClick={handleOpenAdd}
            />
          )}

          {activeSection === 'recipes' && (
            <RecipeFinderView items={items} today={today} />
          )}

          {activeSection === 'storage' && <StorageGuideView />}
        </main>

        <footer className="no-print border-t border-cyan-400/15 bg-[#090C18]/80 py-4 mt-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <span>FreshSave · Smart Food Expiry &amp; Waste Predictor</span>
            <span>Works 100% locally in your browser · No API key required</span>
          </div>
        </footer>
      </div>

      {/* Add / Edit Food Modal */}
      <FoodItemModal
        isOpen={modalOpen}
        editingItem={editingItem}
        focusExpiryOnOpen={focusExpiryOnOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
          setFocusExpiryOnOpen(false);
        }}
        onSave={handleSaveItem}
      />

      {/* Mark as Consumed Modal */}
      <ConsumeModal
        item={consumingItem}
        today={today}
        onClose={() => setConsumingItem(null)}
        onConfirm={handleConfirmConsume}
      />

      {/* Mark as Wasted Modal */}
      <WasteModal
        item={wastingItem}
        today={today}
        onClose={() => setWastingItem(null)}
        onConfirm={handleConfirmWaste}
      />

      {/* Undo Delete Toast */}
      {lastDeleted && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 right-5 z-40 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#11162B] border border-cyan-400/35 text-slate-100 text-sm shadow-[0_0_24px_rgba(34,211,238,0.2)]"
        >
          <span>Removed &ldquo;{lastDeleted.name}&rdquo;</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Action Notice Toast */}
      {notice && !lastDeleted && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 right-5 z-40 px-4 py-3 rounded-xl bg-cyan-400 text-slate-950 font-semibold text-sm shadow-[0_0_24px_rgba(34,211,238,0.3)]"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
