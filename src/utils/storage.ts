import type {
  EnvFactorConfig,
  FoodCategory,
  FoodItem,
  FoodTransaction,
  PurchaseRecord,
  WasteGoalsConfig,
  WasteReason,
} from '../types/food';
import { parseLocalISODate } from './dateUtils';

const STORAGE_KEY = 'freshsave_local_inventory_v2';
const PURGED_PRESETS_KEY = 'freshsave_purged_presets_v2';
const TRANSACTIONS_KEY = 'freshsave_transactions_v1';
const PURCHASES_KEY = 'freshsave_purchase_records_v1';
const ENV_FACTORS_KEY = 'freshsave_env_factors_v1';
const GOALS_KEY = 'freshsave_goals_v1';

const VALID_CATEGORIES: FoodCategory[] = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Beverages',
  'Leftovers',
];

const VALID_WASTE_REASONS: WasteReason[] = [
  'Spoiled',
  'Expired',
  'Forgotten',
  'Over-purchased',
  'Other',
];

export const DEFAULT_ENV_FACTORS: EnvFactorConfig = {
  co2PerKgByCategory: {
    Produce: 1.6,
    'Dairy & Eggs': 3.5,
    'Meat & Seafood': 12.0,
    Bakery: 1.4,
    Pantry: 1.5,
    Beverages: 1.2,
    Leftovers: 3.0,
  },
  unitWeightKg: {
    kg: 1.0,
    g: 0.001,
    L: 1.0,
    ml: 0.001,
    pcs: 0.15,
    bag: 0.4,
    pack: 0.4,
    carton: 1.0,
    bottle: 0.75,
    jar: 0.35,
    loaf: 0.5,
    cups: 0.2,
    bunch: 0.25,
    serving: 0.3,
  },
};

export const DEFAULT_GOALS_CONFIG: WasteGoalsConfig = {
  monthlyWasteBudgetInr: 200,
  targetExpiringConsumedCount: 5,
  targetMaxWastePercent: 20,
};

function isValidFoodItem(raw: unknown): raw is FoodItem {
  if (!raw || typeof raw !== 'object') return false;
  const item = raw as Record<string, unknown>;
  const validExpiry =
    item.expiryDate === null ||
    (typeof item.expiryDate === 'string' && parseLocalISODate(item.expiryDate) !== null);

  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0 &&
    typeof item.quantity === 'number' &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0 &&
    typeof item.unit === 'string' &&
    item.unit.trim().length > 0 &&
    typeof item.category === 'string' &&
    VALID_CATEGORIES.includes(item.category as FoodCategory) &&
    typeof item.purchaseDate === 'string' &&
    parseLocalISODate(item.purchaseDate) !== null &&
    validExpiry &&
    typeof item.createdAt === 'number'
  );
}

function normalizeFoodItem(item: FoodItem): FoodItem {
  const initialQuantity =
    typeof item.initialQuantity === 'number' &&
    Number.isFinite(item.initialQuantity) &&
    item.initialQuantity > 0
      ? item.initialQuantity
      : item.quantity;

  const purchasePrice =
    typeof item.purchasePrice === 'number' &&
    Number.isFinite(item.purchasePrice) &&
    item.purchasePrice >= 0
      ? Math.round(item.purchasePrice * 100) / 100
      : null;

  let pricePerUnit: number | null = null;
  if (purchasePrice !== null && initialQuantity > 0) {
    pricePerUnit = Math.round((purchasePrice / initialQuantity) * 10000) / 10000;
  } else if (
    typeof item.pricePerUnit === 'number' &&
    Number.isFinite(item.pricePerUnit) &&
    item.pricePerUnit >= 0
  ) {
    pricePerUnit = item.pricePerUnit;
  }

  const expirySource =
    item.expiryDate === null
      ? undefined
      : item.expirySource === 'estimated' || item.expirySource === 'manual'
      ? item.expirySource
      : 'manual';

  return {
    ...item,
    expirySource,
    initialQuantity,
    purchasePrice,
    pricePerUnit,
  };
}

export function loadInventory(): FoodItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(PURGED_PRESETS_KEY, '1');
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let items = parsed.filter(isValidFoodItem).map(normalizeFoodItem);

    if (!localStorage.getItem(PURGED_PRESETS_KEY)) {
      items = items.filter(
        (item) => !item.id.startsWith('sample-') && !item.id.startsWith('starter-')
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(PURGED_PRESETS_KEY, '1');
    }

    return items;
  } catch {
    return [];
  }
}

export function saveInventory(items: FoodItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(PURGED_PRESETS_KEY, '1');
  } catch {
    // Ignore storage quota or private-mode errors gracefully
  }
}

function isValidTransaction(raw: unknown): raw is FoodTransaction {
  if (!raw || typeof raw !== 'object') return false;
  const tx = raw as Record<string, unknown>;
  const validType = tx.transactionType === 'consumed' || tx.transactionType === 'wasted';
  const validPrice =
    tx.recordedPurchasePrice === null ||
    (typeof tx.recordedPurchasePrice === 'number' && Number.isFinite(tx.recordedPurchasePrice));
  const validValue =
    tx.estimatedMonetaryValue === null ||
    (typeof tx.estimatedMonetaryValue === 'number' && Number.isFinite(tx.estimatedMonetaryValue));
  const validReason =
    tx.reason === undefined || VALID_WASTE_REASONS.includes(tx.reason as WasteReason);

  return (
    typeof tx.transactionId === 'string' &&
    tx.transactionId.length > 0 &&
    typeof tx.groceryId === 'string' &&
    typeof tx.groceryName === 'string' &&
    typeof tx.category === 'string' &&
    VALID_CATEGORIES.includes(tx.category as FoodCategory) &&
    validType &&
    typeof tx.quantity === 'number' &&
    Number.isFinite(tx.quantity) &&
    tx.quantity > 0 &&
    typeof tx.unit === 'string' &&
    validPrice &&
    validValue &&
    typeof tx.dateTime === 'string' &&
    typeof tx.dateISO === 'string' &&
    parseLocalISODate(tx.dateISO) !== null &&
    validReason
  );
}

export function loadTransactions(): FoodTransaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTransaction);
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: FoodTransaction[]): void {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch {
    // Ignore storage errors gracefully
  }
}

function isValidPurchaseRecord(raw: unknown): raw is PurchaseRecord {
  if (!raw || typeof raw !== 'object') return false;
  const rec = raw as Record<string, unknown>;
  return (
    typeof rec.groceryId === 'string' &&
    rec.groceryId.length > 0 &&
    typeof rec.groceryName === 'string' &&
    typeof rec.category === 'string' &&
    VALID_CATEGORIES.includes(rec.category as FoodCategory) &&
    typeof rec.purchaseDate === 'string' &&
    parseLocalISODate(rec.purchaseDate) !== null &&
    typeof rec.quantityPurchased === 'number' &&
    Number.isFinite(rec.quantityPurchased) &&
    rec.quantityPurchased > 0 &&
    typeof rec.unit === 'string' &&
    typeof rec.totalPurchaseCost === 'number' &&
    Number.isFinite(rec.totalPurchaseCost) &&
    rec.totalPurchaseCost >= 0 &&
    typeof rec.pricePerUnit === 'number' &&
    Number.isFinite(rec.pricePerUnit) &&
    rec.pricePerUnit >= 0
  );
}

export function loadPurchaseRecords(): PurchaseRecord[] {
  try {
    const raw = localStorage.getItem(PURCHASES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPurchaseRecord);
  } catch {
    return [];
  }
}

export function savePurchaseRecords(records: PurchaseRecord[]): void {
  try {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage errors gracefully
  }
}

export function loadEnvFactors(): EnvFactorConfig {
  try {
    const raw = localStorage.getItem(ENV_FACTORS_KEY);
    if (!raw) return DEFAULT_ENV_FACTORS;
    const parsed = JSON.parse(raw) as Partial<EnvFactorConfig>;
    return {
      co2PerKgByCategory: {
        ...DEFAULT_ENV_FACTORS.co2PerKgByCategory,
        ...(parsed.co2PerKgByCategory ?? {}),
      },
      unitWeightKg: {
        ...DEFAULT_ENV_FACTORS.unitWeightKg,
        ...(parsed.unitWeightKg ?? {}),
      },
    };
  } catch {
    return DEFAULT_ENV_FACTORS;
  }
}

export function saveEnvFactors(config: EnvFactorConfig): void {
  try {
    localStorage.setItem(ENV_FACTORS_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors gracefully
  }
}

export function loadGoalsConfig(): WasteGoalsConfig {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return DEFAULT_GOALS_CONFIG;
    const parsed = JSON.parse(raw) as Partial<WasteGoalsConfig>;
    return {
      monthlyWasteBudgetInr:
        typeof parsed.monthlyWasteBudgetInr === 'number' && parsed.monthlyWasteBudgetInr > 0
          ? parsed.monthlyWasteBudgetInr
          : DEFAULT_GOALS_CONFIG.monthlyWasteBudgetInr,
      targetExpiringConsumedCount:
        typeof parsed.targetExpiringConsumedCount === 'number' &&
        parsed.targetExpiringConsumedCount > 0
          ? parsed.targetExpiringConsumedCount
          : DEFAULT_GOALS_CONFIG.targetExpiringConsumedCount,
      targetMaxWastePercent:
        typeof parsed.targetMaxWastePercent === 'number' && parsed.targetMaxWastePercent > 0
          ? parsed.targetMaxWastePercent
          : DEFAULT_GOALS_CONFIG.targetMaxWastePercent,
    };
  } catch {
    return DEFAULT_GOALS_CONFIG;
  }
}

export function saveGoalsConfig(config: WasteGoalsConfig): void {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors gracefully
  }
}
