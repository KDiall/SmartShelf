'use client';
import { useState } from 'react';
import type { Medicine } from '@/types';
import { usePharmacyStore } from '@/store/pharmacy';
import { cn } from '@/lib/utils';
import { Plus, CheckCircle2 } from 'lucide-react';

interface Props {
  medicine: Medicine;
  gradient?: string;
}

export function MedicineTile({ medicine, gradient = 'from-[#14b8a6] to-[#2dd4bf]' }: Props) {
  const recordSale = usePharmacyStore((s) => s.recordSale);
  const [toast, setToast] = useState(false);

  async function handleSale(e: React.MouseEvent) {
    e.stopPropagation();
    await recordSale(medicine.id, 1);
    setToast(true);
    setTimeout(() => setToast(false), 1500);
  }

  return (
    <button
      onClick={handleSale}
      className={cn(
        'relative overflow-hidden rounded-3xl p-5 text-white text-left',
        'bg-gradient-to-br shadow-lg',
        'hover:scale-[1.02] hover:shadow-xl active:scale-[0.96] transition-all duration-200',
        gradient,
      )}
    >
      <div className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
        <Plus className="h-5 w-5 text-white" />
      </div>

      <div className="flex flex-col h-full min-h-[120px] justify-end">
        <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Stock</p>
        <p className="text-3xl font-black leading-none mt-1">{medicine.currentStock}</p>
        <p className="text-sm font-bold mt-3 leading-tight">{medicine.name}</p>
        <p className="text-xs text-white/70 mt-0.5">{medicine.unit}</p>
      </div>

      {toast && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-[#0f172a] animate-in fade-in zoom-in duration-200 rounded-3xl">
          <CheckCircle2 className="h-8 w-8 text-[#22c55e] mb-1" />
          <span className="font-bold text-sm">Sold!</span>
        </div>
      )}
    </button>
  );
}
