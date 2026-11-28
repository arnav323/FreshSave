import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Clock,
  HelpCircle,
  Info,
  Plus,
  Refrigerator,
} from 'lucide-react';
import { motion } from 'motion/react';
import { RECIPE_DATABASE } from '../data/recipes';
import type { FoodItem, NavSection } from '../types/food';
import { formatDaysRemainingLabel, getDaysRemaining } from '../utils/dateUtils';
import { generateConsumeFirstPlan, matchRecipes } from '../utils/recommendationsEngine';
import { FoodCategoryIcon } from './FoodCategoryIcon';

interface RecommendationsViewProps {
  items: FoodItem[];
  today: string;
  onNavigate: (section: NavSection) => void;
  onAddClick: () => void;
}

export function RecommendationsView({
  items,
  today,
  onNavigate,
  onAddClick,
}: RecommendationsViewProps) {
  const recommendations = generateConsumeFirstPlan(items, today);
  const activeIngredientNames = items
    .filter((item) => {
      const days = getDaysRemaining(item.expiryDate, today);
      return days === null || days >= 0;
    })
    .map((item) => item.name);

  const recipeMatches = matchRecipes(activeIngredientNames, items, RECIPE_DATABASE, today).slice(
    0,
    4
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Clear Non-AI Rule-Based Disclosure */}
      <div className="bg-[#12162A] border border-fuchsia-500/35 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-fuchsia-300 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-bold text-slate-100">
            Rule-Based Smart Recommendations (Local JavaScript Engine)
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            These suggestions are calculated locally in your browser using expiry-date rules, keyword storage tips, and a predefined recipe database—not external AI services.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#0D1121]/90 rounded-xl border border-cyan-400/20 p-10 text-center">
          <h3 className="text-base font-bold text-slate-100">
            Add food items to unlock recommendations
          </h3>
          <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
            Once your inventory has items, FreshSave automatically calculates which foods to consume first, how to store them, and matching recipes.
          </p>
          <button
            type="button"
            onClick={onAddClick}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.28)] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Food Item</span>
          </button>
        </div>
      ) : (
        <>
          {/* 1. Consume First Priority */}
          <section className="bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-cyan-400/20 p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                1. Recommended Consumption Order
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ranked from most urgent expiry date to longest shelf life
              </p>
            </div>

            <div className="divide-y divide-slate-800">
              {recommendations.map((rec, idx) => {
                const isExpired = rec.status === 'expired';
                const isSoon = rec.status === 'expiring_soon';
                const isNoExpiry = rec.status === 'no_expiry';
                const badgeColor = isExpired
                  ? 'text-rose-300'
                  : isSoon
                  ? 'text-amber-300'
                  : isNoExpiry
                  ? 'text-fuchsia-300'
                  : 'text-emerald-300';
                const Icon = isExpired
                  ? AlertOctagon
                  : isSoon
                  ? Clock
                  : isNoExpiry
                  ? HelpCircle
                  : CheckCircle2;

                return (
                  <div
                    key={rec.item.id}
                    className="py-4 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5 ${
                          isExpired
                            ? 'bg-rose-500/15 text-rose-300'
                            : isSoon
                            ? 'bg-amber-400/12 text-amber-300'
                            : isNoExpiry
                            ? 'bg-fuchsia-500/15 text-fuchsia-300'
                            : 'bg-emerald-400/12 text-emerald-300'
                        }`}
                      >
                        <FoodCategoryIcon category={rec.item.category} className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-bold text-slate-100">
                            {idx + 1}. {rec.item.name}
                          </span>
                          <span className="text-xs font-mono text-cyan-300/80 tabular-nums">
                            {rec.item.quantity} {rec.item.unit} · {rec.item.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{rec.reason}</p>
                        <p className="text-xs font-medium text-cyan-300">
                          Rule Action: {rec.actionTip}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold tabular-nums whitespace-nowrap shrink-0 ${badgeColor}`}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span>{formatDaysRemainingLabel(rec.daysRemaining)}</span>
                      {rec.item.expirySource === 'estimated' && (
                        <span
                          title={`Estimated reminder based on ${rec.item.category} default`}
                          className="text-[10px] font-bold tracking-wider text-amber-300"
                        >
                          ESTIMATED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. Rule-Based Storage Tips */}
          <section className="bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Refrigerator className="w-5 h-5 text-cyan-300 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  2. Storage Tips for Your Inventory
                </h3>
                <p className="text-xs text-slate-400">
                  Matched by food name keywords and category rules
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => (
                <div
                  key={`tip-${rec.item.id}`}
                  className="p-4 rounded-xl bg-[#070A14] border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-100">{rec.item.name}</h4>
                    <span className="text-xs text-cyan-300/80">{rec.item.category}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{rec.storageTip}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Suggested Recipes from Inventory */}
          <section className="bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-fuchsia-500/25 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <ChefHat className="w-5 h-5 text-fuchsia-300 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    3. Suggested Recipes Using Available Ingredients
                  </h3>
                  <p className="text-xs text-slate-400">
                    Matched against our predefined local recipe database (non-expired items prioritized)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('recipes')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:underline cursor-pointer whitespace-nowrap"
              >
                <span>Open Recipe Finder</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {recipeMatches.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">
                No direct recipe matches found yet from your active items. Try the{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('recipes')}
                  className="text-cyan-300 font-semibold underline cursor-pointer"
                >
                  Recipe Finder
                </button>{' '}
                to select pantry staples you also have on hand.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipeMatches.map((match) => (
                  <div
                    key={match.recipe.id}
                    className="p-4 rounded-xl border border-slate-800 bg-[#070A14] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-100">{match.recipe.title}</h4>
                      <span className="text-xs font-mono font-semibold text-cyan-300 tabular-nums whitespace-nowrap">
                        {match.matchedIngredients.length}/{match.recipe.ingredients.length} match
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {match.recipe.prepTime} · {match.recipe.servings}
                    </p>

                    <div className="text-xs space-y-1">
                      <p className="text-slate-300">
                        <span className="font-semibold text-emerald-300">You have:</span>{' '}
                        {match.matchedIngredients.join(', ')}
                      </p>
                      {match.expiringMatches.length > 0 && (
                        <p className="text-amber-300 font-medium">
                          Uses expiring soon: {match.expiringMatches.join(', ')}
                        </p>
                      )}
                      {match.missingIngredients.length > 0 && (
                        <p className="text-slate-400">
                          Also helpful: {match.missingIngredients.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </motion.div>
  );
}
