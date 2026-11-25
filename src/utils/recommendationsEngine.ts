import type {
  FoodCategory,
  FoodItem,
  Recipe,
  RecipeMatch,
  RuleRecommendation,
} from '../types/food';
import { getDaysRemaining, getExpiryStatus } from './dateUtils';

const STORAGE_KEYWORD_RULES: { keywords: string[]; tip: string }[] = [
  {
    keywords: ['spinach', 'lettuce', 'greens', 'kale', 'arugula', 'salad'],
    tip: 'Store in a breathable container lined with a dry paper towel to absorb excess moisture and prevent wilting.',
  },
  {
    keywords: ['strawberr', 'blueberr', 'raspberr', 'blackberr', 'berry', 'berries'],
    tip: 'Wait to wash berries until right before eating. Store unwashed in a paper-towel-lined container, or freeze extras on a tray.',
  },
  {
    keywords: ['yogurt', 'kefir', 'sour cream'],
    tip: 'Keep on a middle or lower fridge shelf (not the warmer door) with the lid tightly sealed to prevent souring.',
  },
  {
    keywords: ['milk', 'cream'],
    tip: 'Store on an interior fridge shelf rather than the door where temperatures fluctuate when opened.',
  },
  {
    keywords: ['egg'],
    tip: 'Keep eggs in their original carton on an interior fridge shelf to protect them from odors and moisture loss.',
  },
  {
    keywords: ['cheese'],
    tip: 'Wrap hard cheeses in parchment or wax paper first, then loosely in a zip bag so they can breathe without drying out.',
  },
  {
    keywords: ['chicken', 'turkey', 'beef', 'pork', 'meat', 'steak', 'mince'],
    tip: 'Store on the coldest bottom shelf in a leak-proof container. Freeze portions immediately if you will not cook them within 2 days.',
  },
  {
    keywords: ['salmon', 'fish', 'shrimp', 'seafood', 'cod', 'tuna'],
    tip: 'Keep seafood on the coldest bottom shelf and cook or freeze within 1–2 days of purchase.',
  },
  {
    keywords: ['bread', 'sourdough', 'baguette', 'bun', 'roll', 'bagel'],
    tip: 'Keep in a bread box or paper bag at room temperature for 3–4 days; slice and freeze extras so you can toast individual slices.',
  },
  {
    keywords: ['tomato'],
    tip: 'Keep whole tomatoes stem-side down at room temperature away from sunlight; refrigerate only once very ripe to slow softening.',
  },
  {
    keywords: ['banana'],
    tip: 'Keep away from other fruit to avoid speeding up ripening; peel and freeze spotted bananas in chunks for smoothies or pancakes.',
  },
  {
    keywords: ['avocado'],
    tip: 'Leave firm avocados on the counter to ripen, then move to the fridge once soft to hold freshness for 3–4 extra days.',
  },
  {
    keywords: ['onion', 'potato', 'garlic'],
    tip: 'Store in a cool, dark, ventilated pantry—keep potatoes and onions separated so neither spoils prematurely.',
  },
  {
    keywords: ['carrot', 'celery'],
    tip: 'Store in the crisper drawer; trim leafy carrot tops first so they do not draw moisture out of the roots.',
  },
  {
    keywords: ['leftover', 'cooked', 'soup', 'rice', 'pasta'],
    tip: 'Cool quickly and store in shallow airtight containers; eat or freeze refrigerated leftovers within 3–4 days.',
  },
];

const CATEGORY_STORAGE_RULES: Record<FoodCategory, string> = {
  Produce:
    'Use your fridge crisper drawer for leafy veggies and keep ethylene-producing fruit (bananas, apples) separate from sensitive greens.',
  'Dairy & Eggs':
    'Keep dairy and eggs on middle or lower interior shelves where fridge temperatures stay coldest and most consistent.',
  'Meat & Seafood':
    'Store on the bottom fridge shelf to avoid drips, and freeze portions before spoilage if plans change.',
  Bakery:
    'Store bread in a cool dry spot rather than the fridge (which dries bread faster), or freeze sliced loaves for up to 3 months.',
  Pantry:
    'Keep dry goods tightly sealed in a cool, dark cabinet away from stove heat and steam.',
  Beverages:
    'Refrigerate opened cartons and juices promptly and check cap seals after each pour.',
  Leftovers:
    'Label leftovers with the cooked date and keep them front-and-center on the top shelf so they are not forgotten.',
};

export function getStorageTipForItem(item: FoodItem): string {
  const lower = item.name.toLowerCase();
  for (const rule of STORAGE_KEYWORD_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.tip;
    }
  }
  return CATEGORY_STORAGE_RULES[item.category];
}

export function generateConsumeFirstPlan(
  items: FoodItem[],
  today: string
): RuleRecommendation[] {
  const mapped: RuleRecommendation[] = items.map((item) => {
    const daysRemaining = getDaysRemaining(item.expiryDate, today);
    const status = getExpiryStatus(daysRemaining);
    const storageTip = getStorageTipForItem(item);

    if (daysRemaining === null || status === 'no_expiry') {
      return {
        item,
        daysRemaining: null,
        status: 'no_expiry',
        priorityLevel: 'no_expiry',
        reason: 'No expiry date set — check freshness visually or add a date when known.',
        actionTip:
          item.category === 'Produce' || item.category === 'Meat & Seafood' || item.category === 'Leftovers'
            ? 'Perishable category: inspect regularly and plan to use within a few days of purchase.'
            : 'Follow the storage tip below, and update the expiry date if you find a label.',
        storageTip,
      };
    }

    if (status === 'expired') {
      return {
        item,
        daysRemaining,
        status,
        priorityLevel: 'expired',
        reason: `Past expiry by ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? 'day' : 'days'}.`,
        actionTip:
          item.category === 'Meat & Seafood' || item.category === 'Dairy & Eggs' || item.category === 'Leftovers'
            ? 'Do not consume if past a Use-By safety date or showing any odor/texture change—discard safely.'
            : 'Inspect carefully for mold, odor, or spoilage before deciding whether to compost or discard.',
        storageTip,
      };
    }

    if (daysRemaining === 0) {
      return {
        item,
        daysRemaining,
        status,
        priorityLevel: 'urgent',
        reason: 'Expires today — highest consumption priority.',
        actionTip: 'Use in today’s meal or freeze immediately if suitable for freezing.',
        storageTip,
      };
    }

    if (status === 'expiring_soon') {
      return {
        item,
        daysRemaining,
        status,
        priorityLevel: 'soon',
        reason: `Expires within ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} (3-day alert window).`,
        actionTip: 'Move to the front of the shelf and prioritize in your next 1–2 meals.',
        storageTip,
      };
    }

    return {
      item,
      daysRemaining,
      status,
      priorityLevel: 'upcoming',
      reason: `Fresh for ${daysRemaining} more days.`,
      actionTip:
        daysRemaining <= 7
          ? 'Plan into this week’s meals so it stays ahead of the 3-day window.'
          : 'No rush—keep stored properly and check again next week.',
      storageTip,
    };
  });

  const orderWeight: Record<RuleRecommendation['priorityLevel'], number> = {
    urgent: 0,
    soon: 1,
    upcoming: 2,
    no_expiry: 3,
    expired: 4,
  };

  return mapped.sort((a, b) => {
    const weightDiff = orderWeight[a.priorityLevel] - orderWeight[b.priorityLevel];
    if (weightDiff !== 0) return weightDiff;
    const aDays = a.daysRemaining ?? Number.MAX_SAFE_INTEGER;
    const bDays = b.daysRemaining ?? Number.MAX_SAFE_INTEGER;
    return aDays - bDays || a.item.name.localeCompare(b.item.name);
  });
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ingredientMatches(selected: string, recipeIngredient: string): boolean {
  const s = normalizeToken(selected);
  const r = normalizeToken(recipeIngredient);
  if (!s || !r) return false;
  if (s === r || s.includes(r) || r.includes(s)) return true;

  const sWords = s.split(' ');
  const rWords = r.split(' ');
  for (const sw of sWords) {
    if (sw.length < 3) continue;
    for (const rw of rWords) {
      if (rw.length < 3) continue;
      if (sw === rw) return true;
      if (sw.slice(0, 4) === rw.slice(0, 4) && Math.min(sw.length, rw.length) >= 4) {
        return true;
      }
    }
  }
  return false;
}

export function matchRecipes(
  selectedIngredients: string[],
  inventoryItems: FoodItem[],
  recipes: Recipe[],
  today: string
): RecipeMatch[] {
  const expiringNames = inventoryItems
    .filter((item) => {
      const days = getDaysRemaining(item.expiryDate, today);
      return days !== null && days >= 0 && days <= 3;
    })
    .map((item) => item.name);

  const results: RecipeMatch[] = [];

  for (const recipe of recipes) {
    const matchedIngredients: string[] = [];
    const missingIngredients: string[] = [];
    const expiringMatches: string[] = [];

    for (const reqIng of recipe.ingredients) {
      const isMatched = selectedIngredients.some((sel) => ingredientMatches(sel, reqIng));
      if (isMatched) {
        matchedIngredients.push(reqIng);
        const usesExpiring = expiringNames.some((exp) => ingredientMatches(exp, reqIng));
        if (usesExpiring) {
          expiringMatches.push(reqIng);
        }
      } else {
        missingIngredients.push(reqIng);
      }
    }

    if (matchedIngredients.length > 0) {
      const matchPercent = Math.round(
        (matchedIngredients.length / recipe.ingredients.length) * 100
      );
      results.push({
        recipe,
        matchedIngredients,
        missingIngredients,
        expiringMatches,
        matchPercent,
      });
    }
  }

  return results.sort((a, b) => {
    if (b.expiringMatches.length !== a.expiringMatches.length) {
      return b.expiringMatches.length - a.expiringMatches.length;
    }
    if (b.matchPercent !== a.matchPercent) {
      return b.matchPercent - a.matchPercent;
    }
    return b.matchedIngredients.length - a.matchedIngredients.length;
  });
}
