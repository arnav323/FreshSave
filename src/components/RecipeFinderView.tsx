import { useEffect, useState } from 'react';
import { Check, ChefHat, Clock, Plus, Search, Utensils } from 'lucide-react';
import { motion } from 'motion/react';
import { COMMON_PANTRY_INGREDIENTS, RECIPE_DATABASE } from '../data/recipes';
import type { FoodItem } from '../types/food';
import { getDaysRemaining } from '../utils/dateUtils';
import { matchRecipes } from '../utils/recommendationsEngine';

interface RecipeFinderViewProps {
  items: FoodItem[];
  today: string;
}

export function RecipeFinderView({ items, today }: RecipeFinderViewProps) {
  const activeInventory = items.filter((item) => {
    const days = getDaysRemaining(item.expiryDate, today);
    return days === null || days >= 0;
  });
  const expiringInventory = activeInventory.filter((item) => {
    const days = getDaysRemaining(item.expiryDate, today);
    return days !== null && days <= 3;
  });

  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(() =>
    activeInventory.map((item) => item.name)
  );
  const [customIngredient, setCustomIngredient] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIngredients((prev) => {
      if (prev.length === 0 && activeInventory.length > 0) {
        return activeInventory.map((i) => i.name);
      }
      return prev;
    });
  }, [activeInventory.length]);

  const toggleIngredient = (name: string) => {
    const lower = name.toLowerCase();
    setSelectedIngredients((prev) => {
      const exists = prev.some((p) => p.toLowerCase() === lower);
      if (exists) {
        return prev.filter((p) => p.toLowerCase() !== lower);
      }
      return [...prev, name];
    });
  };

  const isSelected = (name: string) =>
    selectedIngredients.some((s) => s.toLowerCase() === name.toLowerCase());

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customIngredient.trim();
    if (!trimmed) {
      setCustomError('Enter an ingredient name before adding.');
      return;
    }
    if (trimmed.length > 40) {
      setCustomError('Ingredient name must be 40 characters or fewer.');
      return;
    }
    setCustomError(null);
    if (!isSelected(trimmed)) {
      setSelectedIngredients((prev) => [...prev, trimmed]);
    }
    setCustomIngredient('');
  };

  const handleSelectExpiringOnly = () => {
    if (expiringInventory.length === 0) return;
    setSelectedIngredients(expiringInventory.map((i) => i.name));
  };

  const handleSelectAllInventory = () => {
    setSelectedIngredients(activeInventory.map((i) => i.name));
  };

  const handleClearSelection = () => {
    setSelectedIngredients([]);
  };

  const rawMatches = matchRecipes(selectedIngredients, items, RECIPE_DATABASE, today);
  const normalizedSearch = recipeSearch.trim().toLowerCase();
  const filteredMatches = normalizedSearch
    ? rawMatches.filter(
        (m) =>
          m.recipe.title.toLowerCase().includes(normalizedSearch) ||
          m.recipe.ingredients.some((i) => i.toLowerCase().includes(normalizedSearch))
      )
    : rawMatches;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-cyan-400/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Local Recipe Finder</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select ingredients you have on hand to match recipes from FreshSave&apos;s built-in recipe database.
          </p>
        </div>
        <span className="text-xs font-mono font-semibold text-cyan-300 bg-cyan-400/10 border border-cyan-400/25 px-3 py-1.5 rounded-lg whitespace-nowrap self-start sm:self-auto tabular-nums">
          {selectedIngredients.length} ingredient{selectedIngredients.length === 1 ? '' : 's'} selected
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Ingredient Picker */}
        <section
          aria-label="Select ingredients"
          className="lg:col-span-5 bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-slate-800 p-5 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-100">1. Choose Ingredients</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {expiringInventory.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectExpiringOnly}
                  className="px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-400/12 hover:bg-amber-400/20 border border-amber-400/30 rounded-md transition-colors cursor-pointer"
                >
                  Use Expiring ({expiringInventory.length})
                </button>
              )}
              {activeInventory.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllInventory}
                  className="px-2.5 py-1 text-xs font-semibold text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/25 rounded-md transition-colors cursor-pointer"
                >
                  All Inventory
                </button>
              )}
              {selectedIngredients.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* From User Inventory */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">From Your Inventory</p>
            {activeInventory.length === 0 ? (
              <p className="text-xs text-slate-400 bg-[#070A14] border border-slate-800 rounded-lg p-3">
                No active inventory items yet. Select common kitchen ingredients below or add your own items.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeInventory.map((item) => {
                  const checked = isSelected(item.name);
                  const days = getDaysRemaining(item.expiryDate, today);
                  const expiringSoon = days !== null && days <= 3;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleIngredient(item.name)}
                      aria-pressed={checked}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        checked
                          ? 'bg-cyan-400 text-slate-950 border-cyan-400 font-semibold'
                          : expiringSoon
                          ? 'bg-amber-400/10 text-amber-300 border-amber-400/35 hover:border-amber-300'
                          : 'bg-[#070A14] text-slate-300 border-slate-700 hover:border-cyan-400/50'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Common Pantry Staples */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-300">Common Kitchen Ingredients</p>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_PANTRY_INGREDIENTS.map((ing) => {
                const checked = isSelected(ing);
                return (
                  <button
                    key={ing}
                    type="button"
                    onClick={() => toggleIngredient(ing)}
                    aria-pressed={checked}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      checked
                        ? 'bg-fuchsia-400 text-slate-950 border-fuchsia-400 font-semibold'
                        : 'bg-[#070A14] text-slate-300 border-slate-700 hover:border-fuchsia-400/50'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
                    <span>{ing}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Custom Ingredient */}
          <div className="pt-3 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-300 mb-2">Add Another Ingredient</p>
            <form onSubmit={handleAddCustom} className="flex items-center gap-2">
              <input
                type="text"
                value={customIngredient}
                onChange={(e) => {
                  setCustomIngredient(e.target.value);
                  if (customError) setCustomError(null);
                }}
                placeholder="e.g., Tofu, Mushrooms, Tuna"
                aria-label="Add custom ingredient"
                className="flex-1 min-w-0 px-3 py-2 text-xs rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add</span>
              </button>
            </form>
            {customError && (
              <p className="mt-1.5 text-xs text-rose-400" role="alert">
                {customError}
              </p>
            )}
          </div>
        </section>

        {/* Right: Matching Recipes */}
        <section aria-label="Matching recipes" className="lg:col-span-7 space-y-4">
          <div className="bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-fuchsia-300" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-100">
                2. Matching Recipes ({filteredMatches.length})
              </h3>
            </div>

            <div className="relative sm:w-64">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                placeholder="Filter matched recipes..."
                aria-label="Filter matched recipes"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>

          {selectedIngredients.length === 0 ? (
            <div className="bg-[#0D1121]/90 rounded-xl border border-slate-800 p-10 text-center">
              <Utensils className="w-8 h-8 text-cyan-300 mx-auto mb-2" aria-hidden="true" />
              <h4 className="text-sm font-bold text-slate-100">Select at least one ingredient</h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Click any ingredient on the left to match recipes from our predefined recipe database.
              </p>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="bg-[#0D1121]/90 rounded-xl border border-slate-800 p-10 text-center">
              <h4 className="text-sm font-bold text-slate-100">No matching recipes found</h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Try selecting a few more common staples like Eggs, Bread, Garlic, Pasta, or Tomatoes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((match) => {
                const isExpanded = expandedRecipeId === match.recipe.id;
                return (
                  <article
                    key={match.recipe.id}
                    className="bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-slate-800 hover:border-cyan-400/40 p-5 space-y-3 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-slate-100">{match.recipe.title}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                          <span>{match.recipe.mealType}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            <span>{match.recipe.prepTime}</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{match.recipe.servings}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-sm font-mono font-bold text-cyan-300 tabular-nums">
                          {match.matchedIngredients.length}/{match.recipe.ingredients.length} ingredients
                        </span>
                        <span className="block text-xs font-mono text-slate-400 tabular-nums">
                          {match.matchPercent}% match
                        </span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 pt-1">
                      <p className="text-slate-300">
                        <span className="font-semibold text-emerald-300">Available:</span>{' '}
                        {match.matchedIngredients.join(', ')}
                      </p>
                      {match.expiringMatches.length > 0 && (
                        <p className="text-amber-300 font-medium">
                          Prioritizes expiring soon: {match.expiringMatches.join(', ')}
                        </p>
                      )}
                      {match.missingIngredients.length > 0 && (
                        <p className="text-slate-400">
                          Additional ingredients: {match.missingIngredients.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-400 italic">{match.recipe.wasteTip}</p>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRecipeId(isExpanded ? null : match.recipe.id)
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/25 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {isExpanded ? 'Hide Steps' : 'View Instructions'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-800 space-y-2">
                        <h5 className="text-xs font-bold text-slate-200">
                          Preparation Instructions
                        </h5>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
                          {match.recipe.steps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
