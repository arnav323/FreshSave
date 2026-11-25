import type { ExpiryStatus } from '../types/food';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns today's local calendar date as YYYY-MM-DD.
 */
export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local midnight Date.
 * Returns null if invalid.
 */
export function parseLocalISODate(iso: string): Date | null {
  if (!ISO_DATE_RE.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

/**
 * Adds a number of calendar days to a YYYY-MM-DD string.
 */
export function addDaysISO(baseIso: string, days: number): string {
  const parsed = parseLocalISODate(baseIso) ?? new Date();
  const result = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + days);
  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, '0');
  const day = String(result.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates whole calendar days remaining from today (local time) until expiryDate.
 * Returns null when expiryDate is omitted/unknown.
 */
export function getDaysRemaining(
  expiryDate: string | null,
  todayIso: string = getTodayISO()
): number | null {
  if (!expiryDate) return null;
  const expiry = parseLocalISODate(expiryDate);
  const today = parseLocalISODate(todayIso);
  if (!expiry || !today) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((expiry.getTime() - today.getTime()) / msPerDay);
}

/**
 * Categorizes an item by days remaining:
 * - no_expiry: daysRemaining === null
 * - expired: daysRemaining < 0
 * - expiring_soon: 0 <= daysRemaining <= 3
 * - fresh: daysRemaining > 3
 */
export function getExpiryStatus(daysRemaining: number | null): ExpiryStatus {
  if (daysRemaining === null) return 'no_expiry';
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 3) return 'expiring_soon';
  return 'fresh';
}

export function formatDaysRemainingLabel(daysRemaining: number | null): string {
  if (daysRemaining === null) {
    return 'No expiry date';
  }
  if (daysRemaining < -1) {
    return `Expired ${Math.abs(daysRemaining)} days ago`;
  }
  if (daysRemaining === -1) {
    return 'Expired yesterday';
  }
  if (daysRemaining === 0) {
    return 'Expires today';
  }
  if (daysRemaining === 1) {
    return '1 day left';
  }
  return `${daysRemaining} days left`;
}

export function formatDateShort(iso: string): string {
  const date = parseLocalISODate(iso);
  if (!date) return iso;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
