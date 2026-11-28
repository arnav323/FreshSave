import { useEffect, useRef, useState } from 'react';
import { AlertOctagon, X } from 'lucide-react';
import type { FoodItem, WasteReason } from '../types/food';
import { formatINR, formatQty } from '../utils/analyticsEngine';
import { formatDaysRemainingLabel, getDaysRemaining } from '../utils/dateUtils';

const WASTE_REASONS: WasteReason[] = [
  'Expired',
  'Spoiled',
  'Forgotten',
  'Over-purchased',
  'Other',
];

interface WasteModalProps {
  item: FoodItem | null;
  today: string;
  onClose: () => void;
  onConfirm: (
    item: FoodItem,
    wastedQty: number,
    reason: WasteReason,
    reasonNote?: string
  ) => void;
}

export function WasteModal({ item, today, onClose, onConfirm }: WasteModalProps) {
  const [qtyInput, setQtyInput] = useState('');
  const [reason, setReason] = useState<WasteReason>('Expired');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!item) return;
    const days = getDaysRemaining(item.expiryDate, today);
    setQtyInput(String(item.quantity));
    setReason(days !== null && days < 0 ? 'Expired' : 'Spoiled');
    setNote('');
    setError(null);
    setSubmitting(false);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [item, today]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const daysRemaining = getDaysRemaining(item.expiryDate, today);
  const parsedQty = Number(qtyInput);
  const isValidQty =
    qtyInput.trim().length > 0 &&
    Number.isFinite(parsedQty) &&
    parsedQty > 0 &&
    parsedQty <= item.quantity + 0.0001;

  const clampedQty = isValidQty ? Math.min(item.quantity, Math.round(parsedQty * 100) / 100) : 0;
  const hasPrice = typeof item.pricePerUnit === 'number' && Number.isFinite(item.pricePerUnit);
  const estimatedLoss = hasPrice ? Math.round(clampedQty * (item.pricePerUnit ?? 0) * 100) / 100 : null;
  const remainingAfter = Math.max(0, Math.round((item.quantity - clampedQty) * 100) / 100);

  const handleSetFraction = (fraction: number) => {
    const val = Math.max(0.01, Math.round(item.quantity * fraction * 100) / 100);
    setQtyInput(String(Math.min(item.quantity, val)));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!qtyInput.trim() || !Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError('Enter a wasted quantity greater than 0.');
      return;
    }
    if (parsedQty > item.quantity + 0.0001) {
      setError(`Wasted quantity cannot exceed available ${formatQty(item.quantity)} ${item.unit}.`);
      return;
    }
    setSubmitting(true);
    onConfirm(
      item,
      Math.min(item.quantity, Math.round(parsedQty * 100) / 100),
      reason,
      note.trim() ? note.trim() : undefined
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04050A]/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waste-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#0D1121] rounded-2xl border border-rose-500/45 shadow-[0_0_45px_rgba(244,63,94,0.2)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-500/20 bg-[#090C18]">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400" aria-hidden="true" />
            <h2 id="waste-modal-title" className="text-base font-bold tracking-wide text-slate-100">
              Log Food Wasted
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#070A14] border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400">Grocery Item</p>
              <p className="text-base font-bold text-slate-100">{item.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatDaysRemainingLabel(daysRemaining)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Available</p>
              <p className="text-sm font-mono font-semibold text-cyan-300 tabular-nums">
                {formatQty(item.quantity)} {item.unit}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="waste-qty" className="block text-sm font-medium text-slate-200">
                Quantity Wasted ({item.unit})
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '25%', f: 0.25 },
                  { label: '50%', f: 0.5 },
                  { label: 'All', f: 1 },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => handleSetFraction(btn.f)}
                    className="px-2 py-0.5 text-xs font-mono font-semibold text-rose-300 bg-rose-500/12 hover:bg-rose-500/25 border border-rose-500/30 rounded transition-colors cursor-pointer"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              ref={inputRef}
              id="waste-qty"
              type="number"
              min="0.01"
              max={item.quantity}
              step="any"
              value={qtyInput}
              onChange={(e) => {
                setQtyInput(e.target.value);
                if (error) setError(null);
              }}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-[#070A14] text-slate-100 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-400 ${
                error ? 'border-rose-500' : 'border-slate-700'
              }`}
            />
            {error && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium" role="alert">
                {error}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="waste-reason" className="block text-sm font-medium text-slate-200 mb-1.5">
              Reason for Waste
            </label>
            <select
              id="waste-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as WasteReason)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              {WASTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="waste-note" className="block text-sm font-medium text-slate-200 mb-1.5">
              Optional Note
            </label>
            <input
              id="waste-note"
              type="text"
              maxLength={120}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Found in back of fridge, bought extra pack"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-700 bg-[#070A14] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          <div className="p-4 rounded-xl bg-rose-500/8 border border-rose-500/25 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Estimated Financial Loss</span>
              <span className="font-mono font-bold text-sm text-rose-300 tabular-nums">
                {hasPrice && estimatedLoss !== null ? formatINR(estimatedLoss) : 'Price not recorded'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Remaining Inventory After</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {remainingAfter === 0
                  ? '0 (removed from active inventory)'
                  : `${formatQty(remainingAfter)} ${item.unit}`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-300 bg-[#070A14] border border-slate-700 hover:border-slate-500 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg shadow-[0_0_18px_rgba(244,63,94,0.3)] transition-colors cursor-pointer"
            >
              Confirm Wasted
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
