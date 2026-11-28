import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react';
import type { FoodItem } from '../types/food';
import { formatINR, formatQty } from '../utils/analyticsEngine';
import { formatDaysRemainingLabel, getDaysRemaining, getExpiryStatus } from '../utils/dateUtils';

interface ConsumeModalProps {
  item: FoodItem | null;
  today: string;
  onClose: () => void;
  onConfirm: (item: FoodItem, consumedQty: number) => void;
}

export function ConsumeModal({ item, today, onClose, onConfirm }: ConsumeModalProps) {
  const [qtyInput, setQtyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!item) return;
    setQtyInput(String(item.quantity));
    setError(null);
    setSubmitting(false);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [item]);

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
  const status = getExpiryStatus(daysRemaining);
  const isApproaching = status === 'expiring_soon';
  const isExpired = status === 'expired';

  const parsedQty = Number(qtyInput);
  const isValidQty =
    qtyInput.trim().length > 0 &&
    Number.isFinite(parsedQty) &&
    parsedQty > 0 &&
    parsedQty <= item.quantity + 0.0001;

  const clampedQty = isValidQty ? Math.min(item.quantity, Math.round(parsedQty * 100) / 100) : 0;
  const hasPrice = typeof item.pricePerUnit === 'number' && Number.isFinite(item.pricePerUnit);
  const estimatedValue = hasPrice ? Math.round(clampedQty * (item.pricePerUnit ?? 0) * 100) / 100 : null;
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
      setError('Enter a quantity greater than 0.');
      return;
    }
    if (parsedQty > item.quantity + 0.0001) {
      setError(`Consumed quantity cannot exceed available ${formatQty(item.quantity)} ${item.unit}.`);
      return;
    }
    setSubmitting(true);
    onConfirm(item, Math.min(item.quantity, Math.round(parsedQty * 100) / 100));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04050A]/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consume-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#0D1121] rounded-2xl border border-emerald-400/40 shadow-[0_0_45px_rgba(52,211,153,0.18)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-400/20 bg-[#090C18]">
          <h2 id="consume-modal-title" className="text-base font-bold tracking-wide text-slate-100">
            Confirm Food Consumed
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          {/* Item summary */}
          <div className="p-4 rounded-xl bg-[#070A14] border border-slate-800 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">Grocery Item</p>
                <p className="text-base font-bold text-slate-100">{item.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Available</p>
                <p className="text-sm font-mono font-semibold text-cyan-300 tabular-nums">
                  {formatQty(item.quantity)} {item.unit}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Expiry Status</span>
              <span
                className={`inline-flex items-center gap-1.5 font-mono font-semibold ${
                  isExpired
                    ? 'text-rose-300'
                    : isApproaching
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {isExpired ? (
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                ) : isApproaching ? (
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{formatDaysRemainingLabel(daysRemaining)}</span>
              </span>
            </div>
          </div>

          {/* Quantity input */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="consume-qty" className="block text-sm font-medium text-slate-200">
                Quantity Consumed ({item.unit})
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
                    className="px-2 py-0.5 text-xs font-mono font-semibold text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/25 rounded transition-colors cursor-pointer"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              ref={inputRef}
              id="consume-qty"
              type="number"
              min="0.01"
              max={item.quantity}
              step="any"
              value={qtyInput}
              onChange={(e) => {
                setQtyInput(e.target.value);
                if (error) setError(null);
              }}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-[#070A14] text-slate-100 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                error ? 'border-rose-500' : 'border-slate-700'
              }`}
            />
            {error && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Value & impact readout */}
          <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-400/25 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Estimated Monetary Value</span>
              <span className="font-mono font-bold text-sm text-emerald-300 tabular-nums">
                {hasPrice && estimatedValue !== null ? formatINR(estimatedValue) : 'Price not recorded'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Approaching Expiry (0–3 days)</span>
              <span className={`font-semibold ${isApproaching ? 'text-amber-300' : 'text-slate-300'}`}>
                {isApproaching ? 'Yes — prevents waste' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Remaining Inventory After</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {remainingAfter === 0
                  ? '0 (item completed)'
                  : `${formatQty(remainingAfter)} ${item.unit}`}
              </span>
            </div>
            {isExpired && (
              <p className="pt-2 border-t border-rose-500/25 text-rose-300 leading-relaxed">
                This item is past its expiry date. Confirming logs consumption without adding to Money Saved before expiry.
              </p>
            )}
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
              className="px-5 py-2.5 text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg shadow-[0_0_18px_rgba(52,211,153,0.3)] transition-colors cursor-pointer"
            >
              Confirm Consumed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
