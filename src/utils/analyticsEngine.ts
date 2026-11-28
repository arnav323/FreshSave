import type {
  DateFilterRange,
  EnvFactorConfig,
  FoodCategory,
  FoodItem,
  FoodTransaction,
  PurchaseRecord,
  WasteGoalsConfig,
  WasteReason,
} from '../types/food';
import { addDaysISO, getDaysRemaining, parseLocalISODate } from './dateUtils';

export type WasteChartCategory =
  | 'Vegetables'
  | 'Fruits'
  | 'Dairy'
  | 'Meat'
  | 'Grains'
  | 'Other';

export const WASTE_CHART_CATEGORIES: WasteChartCategory[] = [
  'Vegetables',
  'Fruits',
  'Dairy',
  'Meat',
  'Grains',
  'Other',
];

const FRUIT_KEYWORDS = [
  'apple',
  'banana',
  'berry',
  'berries',
  'strawberr',
  'blueberr',
  'raspberr',
  'blackberr',
  'orange',
  'mango',
  'grape',
  'melon',
  'watermelon',
  'papaya',
  'pineapple',
  'peach',
  'pear',
  'plum',
  'kiwi',
  'lemon',
  'lime',
  'avocado',
  'cherry',
  'cherries',
  'pomegranate',
  'guava',
  'lychee',
  'fig',
  'apricot',
  'coconut',
  'fruit',
  'orange',
  'tangerine',
  'mandarin',
  'grapefruit',
];

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return '₹0';
  }
  const rounded = Math.round(amount * 100) / 100;
  const hasDecimals = Math.abs(rounded - Math.round(rounded)) > 0.001;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rounded);
}

export function formatQty(qty: number): string {
  const rounded = Math.round(qty * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
}

export function mapToWasteChartCategory(
  category: FoodCategory,
  itemName: string
): WasteChartCategory {
  if (category === 'Produce') {
    const lower = itemName.toLowerCase();
    if (FRUIT_KEYWORDS.some((kw) => lower.includes(kw))) {
      return 'Fruits';
    }
    return 'Vegetables';
  }
  if (category === 'Dairy & Eggs') return 'Dairy';
  if (category === 'Meat & Seafood') return 'Meat';
  if (category === 'Bakery' || category === 'Pantry') return 'Grains';
  return 'Other';
}

export function getStartOfWeekISO(todayIso: string): string {
  const date = parseLocalISODate(todayIso) ?? new Date();
  const day = date.getDay(); // 0 = Sun, 1 = Mon
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDaysISO(todayIso, diffToMonday);
}

export function getStartOfMonthISO(todayIso: string): string {
  return `${todayIso.slice(0, 7)}-01`;
}

export function isDateInRange(
  dateIso: string,
  range: DateFilterRange,
  todayIso: string
): boolean {
  if (range === 'all_time') return true;
  if (range === 'this_week') {
    const start = getStartOfWeekISO(todayIso);
    return dateIso >= start && dateIso <= todayIso;
  }
  if (range === 'this_month') {
    const start = getStartOfMonthISO(todayIso);
    return dateIso >= start && dateIso <= todayIso;
  }
  if (range === 'last_30_days') {
    const start = addDaysISO(todayIso, -29);
    return dateIso >= start && dateIso <= todayIso;
  }
  if (range === 'last_3_months') {
    const start = addDaysISO(todayIso, -89);
    return dateIso >= start && dateIso <= todayIso;
  }
  return true;
}

export function estimateWeightKg(
  quantity: number,
  unit: string,
  envFactors: EnvFactorConfig
): number {
  const factor = envFactors.unitWeightKg[unit] ?? 0.25;
  return Math.max(0, quantity * factor);
}

export interface UnitBreakdownEntry {
  unit: string;
  totalQuantity: number;
  count: number;
}

export interface CategoryConsumedEntry {
  category: FoodCategory;
  count: number;
  totalQuantity: number;
  estimatedValue: number;
}

export interface MonthlyTrendPoint {
  monthKey: string;
  label: string;
  wastedValue: number;
  wastedKg: number;
  wastedCount: number;
  consumedValue: number;
}

export interface CategoryWasteEntry {
  category: WasteChartCategory;
  wastedValue: number;
  wastedCount: number;
  wastedKg: number;
}

export interface AnalyticsSummary {
  totalMoneySaved: number;
  totalFoodWastedValue: number;
  foodWastePreventedValue: number;
  consumedCount: number;
  consumedBeforeExpiryCount: number;
  approachingExpiryConsumedCount: number;
  wastedCount: number;
  unpricedConsumedCount: number;
  unpricedWastedCount: number;
  unitBreakdown: UnitBreakdownEntry[];
  categoryConsumedBreakdown: CategoryConsumedEntry[];
  totalSpendingRecorded: number;
  estimatedValueConsumed: number;
  estimatedWasteLoss: number;
  currentInventoryValue: number;
  pricedActiveItemsCount: number;
  potentialValueAtRisk: number;
  atRiskItemsCount: number;
  wasteRatePercent: number | null;
  monthlyTrends: MonthlyTrendPoint[];
  wasteByCategory: CategoryWasteEntry[];
}

export function computeAnalyticsSummary(
  items: FoodItem[],
  transactions: FoodTransaction[],
  purchaseRecords: PurchaseRecord[],
  envFactors: EnvFactorConfig,
  range: DateFilterRange,
  todayIso: string
): AnalyticsSummary {
  const filteredTx = transactions.filter((tx) => isDateInRange(tx.dateISO, range, todayIso));
  const consumedTx = filteredTx.filter((tx) => tx.transactionType === 'consumed');
  const wastedTx = filteredTx.filter((tx) => tx.transactionType === 'wasted');

  let totalMoneySaved = 0;
  let estimatedValueConsumed = 0;
  let foodWastePreventedValue = 0;
  let consumedBeforeExpiryCount = 0;
  let approachingExpiryConsumedCount = 0;
  let unpricedConsumedCount = 0;

  const unitMap = new Map<string, { totalQuantity: number; count: number }>();
  const catConsumedMap = new Map<
    FoodCategory,
    { count: number; totalQuantity: number; estimatedValue: number }
  >();

  for (const tx of consumedTx) {
    const val = tx.estimatedMonetaryValue ?? 0;
    estimatedValueConsumed += val;

    if (tx.estimatedMonetaryValue === null) {
      unpricedConsumedCount += 1;
    }

    const wasNotExpired = tx.daysRemainingAtEvent === null || tx.daysRemainingAtEvent >= 0;
    if (wasNotExpired) {
      consumedBeforeExpiryCount += 1;
      totalMoneySaved += val;
    }

    if (tx.wasApproachingExpiry) {
      approachingExpiryConsumedCount += 1;
      foodWastePreventedValue += val;
    }

    const uPrev = unitMap.get(tx.unit) ?? { totalQuantity: 0, count: 0 };
    uPrev.totalQuantity += tx.quantity;
    uPrev.count += 1;
    unitMap.set(tx.unit, uPrev);

    const cPrev = catConsumedMap.get(tx.category) ?? {
      count: 0,
      totalQuantity: 0,
      estimatedValue: 0,
    };
    cPrev.count += 1;
    cPrev.totalQuantity += tx.quantity;
    cPrev.estimatedValue += val;
    catConsumedMap.set(tx.category, cPrev);
  }

  let totalFoodWastedValue = 0;
  let unpricedWastedCount = 0;

  const wasteCategoryMap = new Map<
    WasteChartCategory,
    { wastedValue: number; wastedCount: number; wastedKg: number }
  >();
  for (const cat of WASTE_CHART_CATEGORIES) {
    wasteCategoryMap.set(cat, { wastedValue: 0, wastedCount: 0, wastedKg: 0 });
  }

  for (const tx of wastedTx) {
    const val = tx.estimatedMonetaryValue ?? 0;
    totalFoodWastedValue += val;
    if (tx.estimatedMonetaryValue === null) {
      unpricedWastedCount += 1;
    }

    const chartCat = mapToWasteChartCategory(tx.category, tx.groceryName);
    const prev = wasteCategoryMap.get(chartCat)!;
    prev.wastedValue += val;
    prev.wastedCount += 1;
    prev.wastedKg += estimateWeightKg(tx.quantity, tx.unit, envFactors);
  }

  // Total spending recorded from purchaseRecords + fallback for any priced inventory item without a record
  const recordedIds = new Set(purchaseRecords.map((r) => r.groceryId));
  let totalSpendingRecorded = 0;
  for (const rec of purchaseRecords) {
    if (isDateInRange(rec.purchaseDate, range, todayIso)) {
      totalSpendingRecorded += rec.totalPurchaseCost;
    }
  }
  for (const item of items) {
    if (
      !recordedIds.has(item.id) &&
      typeof item.purchasePrice === 'number' &&
      item.purchasePrice > 0 &&
      isDateInRange(item.purchaseDate, range, todayIso)
    ) {
      totalSpendingRecorded += item.purchasePrice;
    }
  }

  // Current active inventory value & value at risk
  let currentInventoryValue = 0;
  let pricedActiveItemsCount = 0;
  let potentialValueAtRisk = 0;
  let atRiskItemsCount = 0;

  for (const item of items) {
    const itemValue =
      typeof item.pricePerUnit === 'number' ? item.quantity * item.pricePerUnit : null;
    if (itemValue !== null) {
      currentInventoryValue += itemValue;
      pricedActiveItemsCount += 1;
    }
    const days = getDaysRemaining(item.expiryDate, todayIso);
    if (days !== null && days <= 3) {
      atRiskItemsCount += 1;
      if (itemValue !== null) {
        potentialValueAtRisk += itemValue;
      }
    }
  }

  // Monthly Waste Trends (Last 6 calendar months ending at todayIso's month)
  const todayDate = parseLocalISODate(todayIso) ?? new Date();
  const monthlyTrends: MonthlyTrendPoint[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - offset, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthlyTrends.push({
      monthKey,
      label,
      wastedValue: 0,
      wastedKg: 0,
      wastedCount: 0,
      consumedValue: 0,
    });
  }
  const monthLookup = new Map(monthlyTrends.map((m) => [m.monthKey, m]));
  for (const tx of transactions) {
    const mKey = tx.dateISO.slice(0, 7);
    const bucket = monthLookup.get(mKey);
    if (!bucket) continue;
    const val = tx.estimatedMonetaryValue ?? 0;
    if (tx.transactionType === 'wasted') {
      bucket.wastedValue += val;
      bucket.wastedCount += 1;
      bucket.wastedKg += estimateWeightKg(tx.quantity, tx.unit, envFactors);
    } else {
      bucket.consumedValue += val;
    }
  }

  const totalHandledValue = estimatedValueConsumed + totalFoodWastedValue;
  const totalHandledCount = consumedTx.length + wastedTx.length;
  let wasteRatePercent: number | null = null;
  if (totalHandledValue > 0) {
    wasteRatePercent = Math.round((totalFoodWastedValue / totalHandledValue) * 1000) / 10;
  } else if (totalHandledCount > 0) {
    wasteRatePercent = Math.round((wastedTx.length / totalHandledCount) * 1000) / 10;
  }

  const unitBreakdown: UnitBreakdownEntry[] = Array.from(unitMap.entries())
    .map(([unit, stats]) => ({
      unit,
      totalQuantity: Math.round(stats.totalQuantity * 100) / 100,
      count: stats.count,
    }))
    .sort((a, b) => b.count - a.count || b.totalQuantity - a.totalQuantity);

  const categoryConsumedBreakdown: CategoryConsumedEntry[] = Array.from(catConsumedMap.entries())
    .map(([category, stats]) => ({
      category,
      count: stats.count,
      totalQuantity: Math.round(stats.totalQuantity * 100) / 100,
      estimatedValue: Math.round(stats.estimatedValue * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  const wasteByCategory: CategoryWasteEntry[] = WASTE_CHART_CATEGORIES.map((category) => {
    const data = wasteCategoryMap.get(category)!;
    return {
      category,
      wastedValue: Math.round(data.wastedValue * 100) / 100,
      wastedCount: data.wastedCount,
      wastedKg: Math.round(data.wastedKg * 100) / 100,
    };
  });

  return {
    totalMoneySaved: Math.round(totalMoneySaved * 100) / 100,
    totalFoodWastedValue: Math.round(totalFoodWastedValue * 100) / 100,
    foodWastePreventedValue: Math.round(foodWastePreventedValue * 100) / 100,
    consumedCount: consumedTx.length,
    consumedBeforeExpiryCount,
    approachingExpiryConsumedCount,
    wastedCount: wastedTx.length,
    unpricedConsumedCount,
    unpricedWastedCount,
    unitBreakdown,
    categoryConsumedBreakdown,
    totalSpendingRecorded: Math.round(totalSpendingRecorded * 100) / 100,
    estimatedValueConsumed: Math.round(estimatedValueConsumed * 100) / 100,
    estimatedWasteLoss: Math.round(totalFoodWastedValue * 100) / 100,
    currentInventoryValue: Math.round(currentInventoryValue * 100) / 100,
    pricedActiveItemsCount,
    potentialValueAtRisk: Math.round(potentialValueAtRisk * 100) / 100,
    atRiskItemsCount,
    wasteRatePercent,
    monthlyTrends: monthlyTrends.map((m) => ({
      ...m,
      wastedValue: Math.round(m.wastedValue * 100) / 100,
      wastedKg: Math.round(m.wastedKg * 100) / 100,
      consumedValue: Math.round(m.consumedValue * 100) / 100,
    })),
    wasteByCategory,
  };
}

export interface EnvironmentalImpactSummary {
  kgSavedBeforeExpiry: number;
  kgPreventedUrgent: number;
  kgWasted: number;
  co2AvoidedKg: number;
  co2WastedKg: number;
  monthlyKgSaved: number;
  monthlyKgWasted: number;
  monthlyCo2AvoidedKg: number;
}

export function computeEnvironmentalImpact(
  transactions: FoodTransaction[],
  envFactors: EnvFactorConfig,
  range: DateFilterRange,
  todayIso: string
): EnvironmentalImpactSummary {
  const filtered = transactions.filter((tx) => isDateInRange(tx.dateISO, range, todayIso));
  const currentMonthPrefix = todayIso.slice(0, 7);

  let kgSavedBeforeExpiry = 0;
  let kgPreventedUrgent = 0;
  let kgWasted = 0;
  let co2AvoidedKg = 0;
  let co2WastedKg = 0;

  for (const tx of filtered) {
    const kg = estimateWeightKg(tx.quantity, tx.unit, envFactors);
    const co2Factor = envFactors.co2PerKgByCategory[tx.category] ?? 2.0;
    if (tx.transactionType === 'consumed') {
      const beforeExpiry = tx.daysRemainingAtEvent === null || tx.daysRemainingAtEvent >= 0;
      if (beforeExpiry) {
        kgSavedBeforeExpiry += kg;
        co2AvoidedKg += kg * co2Factor;
      }
      if (tx.wasApproachingExpiry) {
        kgPreventedUrgent += kg;
      }
    } else {
      kgWasted += kg;
      co2WastedKg += kg * co2Factor;
    }
  }

  let monthlyKgSaved = 0;
  let monthlyKgWasted = 0;
  let monthlyCo2AvoidedKg = 0;

  for (const tx of transactions) {
    if (!tx.dateISO.startsWith(currentMonthPrefix)) continue;
    const kg = estimateWeightKg(tx.quantity, tx.unit, envFactors);
    const co2Factor = envFactors.co2PerKgByCategory[tx.category] ?? 2.0;
    if (tx.transactionType === 'consumed') {
      const beforeExpiry = tx.daysRemainingAtEvent === null || tx.daysRemainingAtEvent >= 0;
      if (beforeExpiry) {
        monthlyKgSaved += kg;
        monthlyCo2AvoidedKg += kg * co2Factor;
      }
    } else {
      monthlyKgWasted += kg;
    }
  }

  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    kgSavedBeforeExpiry: r(kgSavedBeforeExpiry),
    kgPreventedUrgent: r(kgPreventedUrgent),
    kgWasted: r(kgWasted),
    co2AvoidedKg: r(co2AvoidedKg),
    co2WastedKg: r(co2WastedKg),
    monthlyKgSaved: r(monthlyKgSaved),
    monthlyKgWasted: r(monthlyKgWasted),
    monthlyCo2AvoidedKg: r(monthlyCo2AvoidedKg),
  };
}

export interface WasteInsight {
  id: string;
  tone: 'cyan' | 'emerald' | 'amber' | 'rose';
  title: string;
  detail: string;
}

export function generateWasteInsights(
  items: FoodItem[],
  transactions: FoodTransaction[],
  todayIso: string
): WasteInsight[] {
  const insights: WasteInsight[] = [];
  const currentMonth = todayIso.slice(0, 7);
  const todayDate = parseLocalISODate(todayIso) ?? new Date();
  const prevDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthWaste = transactions.filter(
    (tx) => tx.transactionType === 'wasted' && tx.dateISO.startsWith(currentMonth)
  );
  const prevMonthWaste = transactions.filter(
    (tx) => tx.transactionType === 'wasted' && tx.dateISO.startsWith(prevMonth)
  );
  const thisMonthConsumed = transactions.filter(
    (tx) => tx.transactionType === 'consumed' && tx.dateISO.startsWith(currentMonth)
  );

  // 1. Highest waste category this month
  if (thisMonthWaste.length > 0) {
    const catStats = new Map<WasteChartCategory, { count: number; value: number }>();
    for (const tx of thisMonthWaste) {
      const cat = mapToWasteChartCategory(tx.category, tx.groceryName);
      const prev = catStats.get(cat) ?? { count: 0, value: 0 };
      prev.count += 1;
      prev.value += tx.estimatedMonetaryValue ?? 0;
      catStats.set(cat, prev);
    }
    const top = Array.from(catStats.entries()).sort(
      (a, b) => b[1].value - a[1].value || b[1].count - a[1].count
    )[0];
    if (top) {
      const [cat, stats] = top;
      const pct = Math.round((stats.count / thisMonthWaste.length) * 100);
      insights.push({
        id: 'top-waste-cat',
        tone: 'amber',
        title: `${cat} accounted for ${pct}% of waste events this month`,
        detail:
          stats.value > 0
            ? `${stats.count} waste log(s) totaling ${formatINR(stats.value)} in ${cat}. Buying smaller batches of ${cat.toLowerCase()} could cut losses.`
            : `${stats.count} waste log(s) recorded in ${cat} this month.`,
      });
    }
  }

  // 2. Frequently wasted / over-purchased food item
  const allWaste = transactions.filter((tx) => tx.transactionType === 'wasted');
  if (allWaste.length > 0) {
    const itemMap = new Map<string, { name: string; count: number; overPurchased: number; loss: number }>();
    for (const tx of allWaste) {
      const key = tx.groceryName.trim().toLowerCase();
      const prev = itemMap.get(key) ?? {
        name: tx.groceryName,
        count: 0,
        overPurchased: 0,
        loss: 0,
      };
      prev.count += 1;
      if (tx.reason === 'Over-purchased') prev.overPurchased += 1;
      prev.loss += tx.estimatedMonetaryValue ?? 0;
      itemMap.set(key, prev);
    }
    const repeated = Array.from(itemMap.values())
      .filter((entry) => entry.count >= 2 || entry.overPurchased >= 1)
      .sort((a, b) => b.count - a.count || b.loss - a.loss)[0];
    if (repeated) {
      insights.push({
        id: 'frequent-waste-item',
        tone: 'rose',
        title: `${repeated.name} appears repeatedly in waste logs`,
        detail:
          repeated.overPurchased > 0
            ? `Marked wasted ${repeated.count} time(s) including over-purchased flags${repeated.loss > 0 ? ` (${formatINR(repeated.loss)} lost)` : ''}. Consider halving your next purchase.`
            : `Logged as wasted ${repeated.count} time(s)${repeated.loss > 0 ? ` (${formatINR(repeated.loss)} lost)` : ''}.`,
      });
    }
  }

  // 3. Month-over-month waste comparison
  if (prevMonthWaste.length > 0) {
    const thisVal = thisMonthWaste.reduce((s, t) => s + (t.estimatedMonetaryValue ?? 0), 0);
    const prevVal = prevMonthWaste.reduce((s, t) => s + (t.estimatedMonetaryValue ?? 0), 0);
    if (prevVal > 0 && (thisVal > 0 || thisMonthConsumed.length > 0)) {
      const diffPct = Math.round(((thisVal - prevVal) / prevVal) * 100);
      if (diffPct < 0) {
        insights.push({
          id: 'mom-improved',
          tone: 'emerald',
          title: `Food waste value dropped ${Math.abs(diffPct)}% vs last month`,
          detail: `This month's waste loss (${formatINR(thisVal)}) is lower than last month (${formatINR(prevVal)}).`,
        });
      } else if (diffPct > 0) {
        insights.push({
          id: 'mom-increased',
          tone: 'rose',
          title: `Food waste value is up ${diffPct}% vs last month`,
          detail: `This month's waste loss reached ${formatINR(thisVal)} compared to ${formatINR(prevVal)} last month.`,
        });
      }
    }
  }

  // 4. Money saved / prevented highlight
  const totalSaved = transactions
    .filter(
      (tx) =>
        tx.transactionType === 'consumed' &&
        (tx.daysRemainingAtEvent === null || tx.daysRemainingAtEvent >= 0)
    )
    .reduce((sum, tx) => sum + (tx.estimatedMonetaryValue ?? 0), 0);

  if (totalSaved > 0) {
    insights.push({
      id: 'money-saved-highlight',
      tone: 'emerald',
      title: `You saved ${formatINR(totalSaved)} by consuming groceries on time`,
      detail: `Calculated strictly from your logged consumptions before expiry across ${transactions.filter((t) => t.transactionType === 'consumed').length} logged event(s).`,
    });
  }

  // 5. Active inventory at risk
  let atRiskValue = 0;
  let atRiskCount = 0;
  for (const item of items) {
    const days = getDaysRemaining(item.expiryDate, todayIso);
    if (days !== null && days >= 0 && days <= 3) {
      atRiskCount += 1;
      if (typeof item.pricePerUnit === 'number') {
        atRiskValue += item.quantity * item.pricePerUnit;
      }
    }
  }
  if (atRiskCount > 0) {
    insights.push({
      id: 'at-risk-alert',
      tone: 'cyan',
      title: `${atRiskCount} item(s) expiring within 3 days`,
      detail:
        atRiskValue > 0
          ? `Prioritize consuming these items soon to protect ${formatINR(atRiskValue)} in current grocery value.`
          : `Check Smart Recommendations or Recipe Finder to use these approaching-expiry items before they spoil.`,
    });
  }

  // 6. Top waste reason driver
  if (allWaste.length >= 2) {
    const reasonCounts = new Map<WasteReason, number>();
    for (const tx of allWaste) {
      if (tx.reason) {
        reasonCounts.set(tx.reason, (reasonCounts.get(tx.reason) ?? 0) + 1);
      }
    }
    const topReason = Array.from(reasonCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topReason) {
      insights.push({
        id: 'top-reason',
        tone: 'amber',
        title: `Most common waste reason: ${topReason[0]}`,
        detail: `${topReason[1]} of ${allWaste.length} waste event(s) were logged as "${topReason[0]}".`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: 'insufficient-data',
      tone: 'cyan',
      title: 'Keep tracking your groceries to unlock personalized waste insights.',
      detail:
        'Add groceries with optional purchase prices and log consumptions or waste events to see real trends here.',
    });
  }

  return insights;
}

export interface PeriodReportData {
  periodLabel: string;
  startDateISO: string;
  endDateISO: string;
  totalSpendingRecorded: number;
  moneySavedBeforeExpiry: number;
  foodWastePreventedValue: number;
  totalWastedValue: number;
  consumedEvents: number;
  wastedEvents: number;
  kgSaved: number;
  kgWasted: number;
  co2AvoidedKg: number;
  transactions: FoodTransaction[];
}

export function buildReportData(
  period: 'weekly' | 'monthly',
  items: FoodItem[],
  transactions: FoodTransaction[],
  purchaseRecords: PurchaseRecord[],
  envFactors: EnvFactorConfig,
  todayIso: string
): PeriodReportData {
  const startDateISO =
    period === 'weekly' ? getStartOfWeekISO(todayIso) : getStartOfMonthISO(todayIso);
  const range: DateFilterRange = period === 'weekly' ? 'this_week' : 'this_month';

  const summary = computeAnalyticsSummary(
    items,
    transactions,
    purchaseRecords,
    envFactors,
    range,
    todayIso
  );
  const env = computeEnvironmentalImpact(transactions, envFactors, range, todayIso);
  const periodTx = transactions
    .filter((tx) => tx.dateISO >= startDateISO && tx.dateISO <= todayIso)
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime));

  return {
    periodLabel: period === 'weekly' ? 'Weekly Waste & Savings Report' : 'Monthly Waste & Savings Report',
    startDateISO,
    endDateISO: todayIso,
    totalSpendingRecorded: summary.totalSpendingRecorded,
    moneySavedBeforeExpiry: summary.totalMoneySaved,
    foodWastePreventedValue: summary.foodWastePreventedValue,
    totalWastedValue: summary.totalFoodWastedValue,
    consumedEvents: summary.consumedCount,
    wastedEvents: summary.wastedCount,
    kgSaved: env.kgSavedBeforeExpiry,
    kgWasted: env.kgWasted,
    co2AvoidedKg: env.co2AvoidedKg,
    transactions: periodTx,
  };
}

function escapeCSVCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateReportCSV(report: PeriodReportData): string {
  const lines: string[] = [];
  lines.push(`Report,${escapeCSVCell(report.periodLabel)}`);
  lines.push(`Date Range,${escapeCSVCell(`${report.startDateISO} to ${report.endDateISO}`)}`);
  lines.push(`Total Spending Recorded (INR),${report.totalSpendingRecorded.toFixed(2)}`);
  lines.push(`Money Saved Before Expiry (INR),${report.moneySavedBeforeExpiry.toFixed(2)}`);
  lines.push(`Food Waste Prevented Subset (INR),${report.foodWastePreventedValue.toFixed(2)}`);
  lines.push(`Food Wasted Loss (INR),${report.totalWastedValue.toFixed(2)}`);
  lines.push(`Consumed Events,${report.consumedEvents}`);
  lines.push(`Wasted Events,${report.wastedEvents}`);
  lines.push(`Estimated Food Saved (kg),${report.kgSaved.toFixed(2)}`);
  lines.push(`Estimated Food Wasted (kg),${report.kgWasted.toFixed(2)}`);
  lines.push(`Estimated CO2e Avoided (kg),${report.co2AvoidedKg.toFixed(2)}`);
  lines.push('');
  lines.push(
    [
      'Date',
      'Grocery Name',
      'Category',
      'Action',
      'Quantity',
      'Unit',
      'Unit Price (INR)',
      'Estimated Value (INR)',
      'Approaching Expiry',
      'Waste Reason',
      'Note',
    ].join(',')
  );

  for (const tx of report.transactions) {
    lines.push(
      [
        escapeCSVCell(tx.dateISO),
        escapeCSVCell(tx.groceryName),
        escapeCSVCell(tx.category),
        escapeCSVCell(tx.transactionType),
        escapeCSVCell(tx.quantity),
        escapeCSVCell(tx.unit),
        escapeCSVCell(tx.recordedPurchasePrice !== null ? tx.recordedPurchasePrice.toFixed(2) : 'Not recorded'),
        escapeCSVCell(tx.estimatedMonetaryValue !== null ? tx.estimatedMonetaryValue.toFixed(2) : 'Not recorded'),
        escapeCSVCell(tx.wasApproachingExpiry ? 'Yes' : 'No'),
        escapeCSVCell(tx.reason ?? ''),
        escapeCSVCell(tx.reasonNote ?? ''),
      ].join(',')
    );
  }

  return lines.join('\r\n');
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressText: string;
}

export interface GoalsEvaluation {
  wasteFreeStreakDays: number;
  monthlyWastePercent: number | null;
  monthlyWasteInr: number;
  expiringConsumedThisMonth: number;
  weeklyConsumedCount: number;
  weeklyWastedCount: number;
  weeklySavedInr: number;
  weeklyWastedInr: number;
  badges: AchievementBadge[];
}

export function evaluateGoalsAndAchievements(
  transactions: FoodTransaction[],
  items: FoodItem[],
  envFactors: EnvFactorConfig,
  goalsConfig: WasteGoalsConfig,
  todayIso: string
): GoalsEvaluation {
  const currentMonth = todayIso.slice(0, 7);
  const weekStart = getStartOfWeekISO(todayIso);

  const monthTx = transactions.filter((tx) => tx.dateISO.startsWith(currentMonth));
  const monthConsumed = monthTx.filter((tx) => tx.transactionType === 'consumed');
  const monthWasted = monthTx.filter((tx) => tx.transactionType === 'wasted');

  const monthConsumedVal = monthConsumed.reduce((s, t) => s + (t.estimatedMonetaryValue ?? 0), 0);
  const monthlyWasteInr = Math.round(
    monthWasted.reduce((s, t) => s + (t.estimatedMonetaryValue ?? 0), 0) * 100
  ) / 100;

  let monthlyWastePercent: number | null = null;
  if (monthConsumedVal + monthlyWasteInr > 0) {
    monthlyWastePercent =
      Math.round((monthlyWasteInr / (monthConsumedVal + monthlyWasteInr)) * 1000) / 10;
  } else if (monthConsumed.length + monthWasted.length > 0) {
    monthlyWastePercent =
      Math.round((monthWasted.length / (monthConsumed.length + monthWasted.length)) * 1000) / 10;
  }

  const expiringConsumedThisMonth = monthConsumed.filter((tx) => tx.wasApproachingExpiry).length;

  const weekTx = transactions.filter((tx) => tx.dateISO >= weekStart && tx.dateISO <= todayIso);
  const weeklyConsumedCount = weekTx.filter((tx) => tx.transactionType === 'consumed').length;
  const weeklyWastedCount = weekTx.filter((tx) => tx.transactionType === 'wasted').length;
  const weeklySavedInr =
    Math.round(
      weekTx
        .filter(
          (tx) =>
            tx.transactionType === 'consumed' &&
            (tx.daysRemainingAtEvent === null || tx.daysRemainingAtEvent >= 0)
        )
        .reduce((s, t) => s + (t.estimatedMonetaryValue ?? 0), 0) * 100
    ) / 100;
  const weeklyWastedInr =
    Math.round(
      weekTx
        .filter((tx) => tx.transactionType === 'wasted')
        .reduce((s, t) => s + (t.estimatedMonetaryValue ?? 0), 0) * 100
    ) / 100;

  // Waste-free streak: consecutive calendar days up to today with zero waste events, starting from first activity date
  const activityDates: string[] = [
    ...transactions.map((t) => t.dateISO),
    ...items.map((i) => i.purchaseDate),
  ].filter((d) => d <= todayIso);

  let wasteFreeStreakDays = 0;
  if (activityDates.length > 0) {
    const earliestDate = activityDates.reduce((min, d) => (d < min ? d : min), activityDates[0]);
    const wasteDates = transactions
      .filter((t) => t.transactionType === 'wasted' && t.dateISO <= todayIso)
      .map((t) => t.dateISO);
    const latestWasteDate =
      wasteDates.length > 0
        ? wasteDates.reduce((max, d) => (d > max ? d : max), wasteDates[0])
        : null;

    const todayParsed = parseLocalISODate(todayIso);
    const refDateStr = latestWasteDate ?? earliestDate;
    const refParsed = parseLocalISODate(refDateStr);
    if (todayParsed && refParsed) {
      const diffDays = Math.max(
        0,
        Math.round((todayParsed.getTime() - refParsed.getTime()) / (24 * 60 * 60 * 1000))
      );
      wasteFreeStreakDays = latestWasteDate ? diffDays : diffDays + 1;
    }
  }

  // Real achievement badges
  const allConsumed = transactions.filter((t) => t.transactionType === 'consumed');
  const totalApproachingRescued = allConsumed.filter((t) => t.wasApproachingExpiry).length;
  const totalSavedAllTime = allConsumed
    .filter((t) => t.daysRemainingAtEvent === null || t.daysRemainingAtEvent >= 0)
    .reduce((s, t) => s + (t.estimatedMonetaryValue ?? 0), 0);
  const totalKgSaved = allConsumed
    .filter((t) => t.daysRemainingAtEvent === null || t.daysRemainingAtEvent >= 0)
    .reduce((s, t) => s + estimateWeightKg(t.quantity, t.unit, envFactors), 0);

  const badges: AchievementBadge[] = [
    {
      id: 'first-rescue',
      title: 'Expiry Rescuer',
      description: 'Consume an item that is approaching expiry (0–3 days left)',
      unlocked: totalApproachingRescued >= 1,
      progressText: `${Math.min(1, totalApproachingRescued)} / 1 item`,
    },
    {
      id: 'zero-waste-week',
      title: 'Zero-Waste Week',
      description: 'Maintain 7 consecutive days with zero food waste logged',
      unlocked: wasteFreeStreakDays >= 7 && transactions.length > 0,
      progressText: `${Math.min(7, wasteFreeStreakDays)} / 7 days`,
    },
    {
      id: 'saving-target',
      title: 'Savings Guardian',
      description: 'Save ₹250 or more by consuming food before expiry',
      unlocked: totalSavedAllTime >= 250,
      progressText: `${formatINR(Math.min(250, totalSavedAllTime))} / ₹250`,
    },
    {
      id: 'rescue-streak',
      title: 'Monthly Rescue Target',
      description: `Consume ${goalsConfig.targetExpiringConsumedCount} expiring items this month`,
      unlocked: expiringConsumedThisMonth >= goalsConfig.targetExpiringConsumedCount,
      progressText: `${Math.min(
        goalsConfig.targetExpiringConsumedCount,
        expiringConsumedThisMonth
      )} / ${goalsConfig.targetExpiringConsumedCount} items`,
    },
    {
      id: 'eco-impact',
      title: '2 kg Saved',
      description: 'Consume 2 kg or more of food before expiry',
      unlocked: totalKgSaved >= 2,
      progressText: `${Math.min(2, Math.round(totalKgSaved * 100) / 100)} / 2 kg`,
    },
    {
      id: 'consistent-tracker',
      title: 'Active Tracker',
      description: 'Log at least 5 consumption or waste actions',
      unlocked: transactions.length >= 5,
      progressText: `${Math.min(5, transactions.length)} / 5 logs`,
    },
  ];

  return {
    wasteFreeStreakDays,
    monthlyWastePercent,
    monthlyWasteInr,
    expiringConsumedThisMonth,
    weeklyConsumedCount,
    weeklyWastedCount,
    weeklySavedInr,
    weeklyWastedInr,
    badges,
  };
}
