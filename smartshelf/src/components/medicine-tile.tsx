'use client';
import type { Medicine } from '@/types';
import { cn, formatMoney } from '@/lib/utils';
import { Minus, Plus, Edit3, X } from 'lucide-react';

interface Props {
  medicine: Medicine;
  gradient?: string;
  quantity?: number;
  onIncrement?: (id: string) => void;
  onDecrement?: (id: string) => void;
  onEdit?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function MedicineTile({
  medicine,
  gradient = 'from-[#14b8a6] to-[#2dd4bf]',
  quantity = 0,
  onIncrement,
  onDecrement,
  onEdit,
  onRemove,
}: Props) {
  const atMax = quantity >= medicine.currentStock;
  const outOfStock = medicine.currentStock <= 0;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl p-5 text-white text-left group',
        'bg-gradient-to-br shadow-lg',
        'transition-all duration-200 hover:shadow-xl',
        gradient,
      )}
    >
      {(onEdit || onRemove) && quantity === 0 && (
        <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <span
              onClick={() => onEdit(medicine.id)}
              className="h-7 w-7 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center hover:bg-white/50 transition-colors cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5 text-white" />
            </span>
          )}
          {onRemove && (
            <span
              onClick={() => onRemove(medicine.id)}
              className="h-7 w-7 rounded-full bg-red-400/60 backdrop-blur-sm flex items-center justify-center hover:bg-red-400/80 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </span>
          )}
        </div>
      )}

      {quantity > 0 && (
        <div className="absolute top-3 right-3 h-7 px-2.5 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center z-10">
          <span className="text-xs font-black text-white">x{quantity}</span>
        </div>
      )}

      <div className="flex flex-col min-h-[150px] justify-between pt-8">
        <div>
          <p className="text-2xl font-black leading-none tracking-tight">{formatMoney(medicine.sellingPrice ?? 0)}</p>
          <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mt-2">
            Stock: {medicine.currentStock}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-sm font-bold leading-tight">{medicine.name}</p>
          <p className="text-xs text-white/70 mt-0.5">{medicine.unit}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => onDecrement?.(medicine.id)}
          disabled={quantity === 0}
          className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-white/40 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Remove one"
        >
          <Minus className="h-5 w-5 text-white" />
        </button>
        <span className="flex-1 text-center text-lg font-black text-white">{quantity}</span>
        <button
          onClick={() => onIncrement?.(medicine.id)}
          disabled={atMax || outOfStock}
          className="h-10 w-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-white/40 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Add one"
        >
          <Plus className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  );
}
