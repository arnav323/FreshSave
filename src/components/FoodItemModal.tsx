import { useEffect, useRef, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import type { FoodCategory, FoodItem } from '../types/food';
import { addDaysISO, getTodayISO, parseLocalISODate } from '../utils/dateUtils';

const CATEGORIES: FoodCategory[] = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Beverages',
  'Leftovers',
];

const COMMON_UNITS = [
  'pcs',
  'g',
  'kg',
  'ml',
  'L',
  'bag',
  'pack',
  'carton',
  'bottle',
  'jar',
  'loaf',
  'cups',
  'bunch',
  'serving',
];

export interface FoodItemFormValues {
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  purchaseDate: string;
  expiryDate: string | null;
}

interface FoodItemModalProps {
  isOpen: boolean;
  editingItem: FoodItem | null;
  focusExpiryOnOpen?: boolean;
  onClose: () => void;
  onSave: (values: FoodItemFormValues, existingId?: string) => void;
}

interface FieldErrors {
  name?: string;
  quantity?: string;
  unit?: string;
  purchaseDate?: string;
  expiryDate?: string;
}

export function FoodItemModal({
  isOpen,
  editingItem,
  focusExpiryOnOpen = false,
  onClose,
  onSave,
}: FoodItemModalProps) {
  const today = getTodayISO();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('Produce');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const nameInputRef = useRef<HTMLInputElement>(null);
  const expiryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setName(editingItem.name);
      setCategory(editingItem.category);
      setQuantity(String(editingItem.quantity));
      setUnit(editingItem.unit);
      setPurchaseDate(editingItem.purchaseDate);
      setExpiryDate(editingItem.expiryDate ?? '');
    } else {
      const currentToday = getTodayISO();
      setName('');
      setCategory('Produce');
      setQuantity('1');
      setUnit('pcs');
      setPurchaseDate(currentToday);
      setExpiryDate('');
    }
    setErrors({});
    const timer = window.setTimeout(() => {
      if (focusExpiryOnOpen) {
        expiryInputRef.current?.focus();
      } else {
        nameInputRef.current?.focus();
      }
    }, 30);
    return () => window.clearTimeout(timer);
  }, [isOpen, editingItem, focusExpiryOnOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = (): FoodItemFormValues | null => {
    const nextErrors: FieldErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      nextErrors.name = 'Please enter a food name (e.g., Baby Spinach or Whole Milk).';
    } else if (trimmedName.length > 80) {
      nextErrors.name = 'Food name must be 80 characters or fewer.';
    }

    const parsedQty = Number(quantity);
    if (!quantity.trim() || !Number.isFinite(parsedQty) || parsedQty <= 0) {
      nextErrors.quantity = 'Enter a valid quantity greater than 0.';
    } else if (parsedQty > 10000) {
      nextErrors.quantity = 'Quantity seems too large. Please check your entry.';
    }

    const trimmedUnit = unit.trim();
    if (!trimmedUnit) {
      nextErrors.unit = 'Select a unit.';
    }

    const parsedPurchase = parseLocalISODate(purchaseDate);
    if (!parsedPurchase) {
      nextErrors.purchaseDate = 'Please choose a valid purchase date.';
    }

    const trimmedExpiry = expiryDate.trim();
    if (trimmedExpiry.length > 0) {
      const parsedExpiry = parseLocalISODate(trimmedExpiry);
      if (!parsedExpiry) {
        nextErrors.expiryDate = 'Please enter a valid expiry date.';
      } else if (parsedPurchase && parsedExpiry.getTime() < parsedPurchase.getTime()) {
        nextErrors.expiryDate = 'Expiry date cannot be earlier than the purchase date.';
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return null;
    }

    return {
      name: trimmedName,
      category,
      quantity: Math.round(parsedQty * 100) / 100,
      unit: trimmedUnit,
      purchaseDate,
      expiryDate: trimmedExpiry.length > 0 ? trimmedExpiry : null,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = validate();
    if (!valid) return;
    onSave(valid, editingItem?.id);
  };

  const applyQuickShelfLife = (days: number) => {
    const base = parseLocalISODate(purchaseDate) ? purchaseDate : getTodayISO();
    setExpiryDate(addDaysISO(base, days));
    if (errors.expiryDate) {
      setErrors((prev) => ({ ...prev, expiryDate: undefined }));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04050A]/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="food-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-[#0D1121] rounded-2xl border border-cyan-400/35 shadow-[0_0_45px_rgba(34,211,238,0.16)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-400/20 bg-[#090C18]">
          <h2 id="food-modal-title" className="text-base font-bold tracking-wide text-slate-100">
            {editingItem ? 'Edit Food Item' : 'Add Food Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          <div>
            <label htmlFor="food-name" className="block text-sm font-medium text-slate-200 mb-1.5">
              Food Name
            </label>
            <input
              ref={nameInputRef}
              id="food-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g., Baby Spinach, Greek Yogurt, Chicken Breast"
              maxLength={80}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-[#070A14] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                errors.name ? 'border-rose-500' : 'border-slate-700'
              }`}
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="food-qty" className="block text-sm font-medium text-slate-200 mb-1.5">
                Quantity
              </label>
              <input
                id="food-qty"
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-[#070A14] text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.quantity ? 'border-rose-500' : 'border-slate-700'
                }`}
              />
              {errors.quantity && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium" role="alert">
                  {errors.quantity}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="food-unit" className="block text-sm font-medium text-slate-200 mb-1.5">
                Unit
              </label>
              <select
                id="food-unit"
                value={COMMON_UNITS.includes(unit) ? unit : 'pcs'}
                onChange={(e) => {
                  setUnit(e.target.value);
                  if (errors.unit) setErrors((prev) => ({ ...prev, unit: undefined }));
                }}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="food-category" className="block text-sm font-medium text-slate-200 mb-1.5">
                Category
              </label>
              <select
                id="food-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as FoodCategory)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="purchase-date" className="block text-sm font-medium text-slate-200 mb-1.5">
                Purchase Date
              </label>
              <input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => {
                  setPurchaseDate(e.target.value);
                  if (errors.purchaseDate) setErrors((prev) => ({ ...prev, purchaseDate: undefined }));
                  if (errors.expiryDate) setErrors((prev) => ({ ...prev, expiryDate: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-[#070A14] text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.purchaseDate ? 'border-rose-500' : 'border-slate-700'
                }`}
              />
              {errors.purchaseDate && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium" role="alert">
                  {errors.purchaseDate}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor="expiry-date" className="block text-sm font-medium text-slate-200">
                  Expiry Date <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                {expiryDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setExpiryDate('');
                      setErrors((prev) => ({ ...prev, expiryDate: undefined }));
                    }}
                    className="text-xs text-fuchsia-300 hover:text-fuchsia-200 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                ref={expiryInputRef}
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  if (errors.expiryDate) setErrors((prev) => ({ ...prev, expiryDate: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-[#070A14] text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  errors.expiryDate ? 'border-rose-500' : 'border-slate-700'
                }`}
              />
              {errors.expiryDate && (
                <p className="mt-1.5 text-xs text-rose-400 font-medium" role="alert">
                  {errors.expiryDate}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Leave Expiry Date blank if you don&apos;t know it yet—you can set or update it anytime later.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-slate-400 mr-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                <span>Quick set:</span>
              </span>
              {[
                { label: '+2 days', days: 2 },
                { label: '+5 days', days: 5 },
                { label: '+1 week', days: 7 },
                { label: '+2 weeks', days: 14 },
              ].map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => applyQuickShelfLife(preset.days)}
                  className="px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/25 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-300 bg-[#070A14] border border-slate-700 hover:border-slate-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-[0_0_18px_rgba(34,211,238,0.3)] transition-colors cursor-pointer whitespace-nowrap"
            >
              {editingItem ? 'Save Changes' : 'Add Food Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
