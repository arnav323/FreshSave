import type { FoodCategory, FoodItem } from '../types/food';
import { parseLocalISODate } from './dateUtils';

const STORAGE_KEY = 'freshsave_local_inventory_v2';
const PURGED_PRESETS_KEY = 'freshsave_purged_presets_v2';

const VALID_CATEGORIES: FoodCategory[] = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Beverages',
  'Leftovers',
];

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

export function loadInventory(): FoodItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(PURGED_PRESETS_KEY, '1');
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let items = parsed.filter(isValidFoodItem);

    // Strip any previously seeded sample/starter items once so inventory only contains user entries
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
