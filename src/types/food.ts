export type FoodCategory =
  | 'Produce'
  | 'Dairy & Eggs'
  | 'Meat & Seafood'
  | 'Bakery'
  | 'Pantry'
  | 'Beverages'
  | 'Leftovers';

export type ExpiryStatus = 'fresh' | 'expiring_soon' | 'expired' | 'no_expiry';

export type ExpirySource = 'manual' | 'estimated';

export type NavSection =
  | 'dashboard'
  | 'inventory'
  | 'analytics'
  | 'recommendations'
  | 'recipes'
  | 'storage';

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  purchaseDate: string; // YYYY-MM-DD
  expiryDate: string | null; // Optional YYYY-MM-DD
  expirySource?: ExpirySource; // Distinguishes manually entered vs category-estimated dates
  purchasePrice?: number | null; // Total purchase cost in INR (₹)
  initialQuantity?: number; // Quantity originally purchased
  pricePerUnit?: number | null; // Calculated purchasePrice / initialQuantity
  createdAt: number;
}

export type TransactionType = 'consumed' | 'wasted';

export type WasteReason =
  | 'Spoiled'
  | 'Expired'
  | 'Forgotten'
  | 'Over-purchased'
  | 'Other';

export interface FoodTransaction {
  transactionId: string;
  groceryId: string;
  groceryName: string;
  category: FoodCategory;
  transactionType: TransactionType;
  quantity: number;
  unit: string;
  recordedPurchasePrice: number | null; // Price per unit snapshot in ₹
  estimatedMonetaryValue: number | null; // quantity * recordedPurchasePrice
  dateTime: string; // ISO timestamp
  dateISO: string; // Local YYYY-MM-DD
  daysRemainingAtEvent: number | null;
  wasApproachingExpiry?: boolean;
  reason?: WasteReason;
  reasonNote?: string;
}

export interface PurchaseRecord {
  groceryId: string;
  groceryName: string;
  category: FoodCategory;
  purchaseDate: string; // YYYY-MM-DD
  quantityPurchased: number;
  unit: string;
  totalPurchaseCost: number; // ₹
  pricePerUnit: number; // ₹
}

export type DateFilterRange =
  | 'this_week'
  | 'this_month'
  | 'last_30_days'
  | 'last_3_months'
  | 'all_time';

export interface EnvFactorConfig {
  co2PerKgByCategory: Record<FoodCategory, number>;
  unitWeightKg: Record<string, number>;
}

export interface WasteGoalsConfig {
  monthlyWasteBudgetInr: number;
  targetExpiringConsumedCount: number;
  targetMaxWastePercent: number;
}

export interface Recipe {
  id: string;
  title: string;
  prepTime: string;
  servings: string;
  mealType: string;
  ingredients: string[];
  steps: string[];
  wasteTip: string;
}

export interface RecipeMatch {
  recipe: Recipe;
  matchedIngredients: string[];
  missingIngredients: string[];
  expiringMatches: string[];
  matchPercent: number;
}

export interface RuleRecommendation {
  item: FoodItem;
  daysRemaining: number | null;
  status: ExpiryStatus;
  priorityLevel: 'urgent' | 'soon' | 'upcoming' | 'no_expiry' | 'expired';
  reason: string;
  actionTip: string;
  storageTip: string;
}
