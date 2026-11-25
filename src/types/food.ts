export type FoodCategory =
  | 'Produce'
  | 'Dairy & Eggs'
  | 'Meat & Seafood'
  | 'Bakery'
  | 'Pantry'
  | 'Beverages'
  | 'Leftovers';

export type ExpiryStatus = 'fresh' | 'expiring_soon' | 'expired' | 'no_expiry';

export type NavSection =
  | 'dashboard'
  | 'inventory'
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
  createdAt: number;
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
