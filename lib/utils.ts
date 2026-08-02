import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Whole days from now until `iso`. Negative when already past. */
export function daysUntil(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.ceil((then - now) / 86_400_000);
}

export function relativeDays(iso: string) {
  const d = daysUntil(iso);
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  return `in ${d}d`;
}

export function addMonths(from: Date, months: number) {
  const d = new Date(from);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  return d;
}

/** Monthly-equivalent price, so annual and monthly plans compare honestly. */
export function monthlyEquivalent(price: number, cycle: 'monthly' | 'annual' | 'one_time') {
  if (cycle === 'annual') return price / 12;
  if (cycle === 'one_time') return 0;
  return price;
}

export function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
