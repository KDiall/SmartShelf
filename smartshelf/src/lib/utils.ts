import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(n: number): string {
  const value = Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
  return `SLE ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
