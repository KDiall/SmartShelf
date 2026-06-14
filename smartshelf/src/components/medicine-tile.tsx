'use client';
import { useState } from 'react';
import type { Medicine } from '@/types';
import { getStockStatus } from '@/lib/risk-engine';
import { usePharmacyStore } from '@/store/pharmacy';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  medicine: Medicine;
}

export function MedicineTile({ medicine }: Props) {
  const recordSale = usePharmacyStore((s) => s.recordSale);
  const status = getStockStatus(medicine.currentStock, medicine.reorderThreshold);
  const [toast, setToast] = useState(false);

  const statusConfig: Record<string, { color: string; label: string }> = {
    ok: { color: 'bg-success text-white', label: 'In Stock' },
    low: { color: 'bg-warning text-white', label: 'Low' },
    critical: { color: 'bg-destructive text-destructive-foreground', label: 'Critical' },
    out: { color: 'bg-muted text-muted-foreground', label: 'Out of Stock' },
  };

  const s = statusConfig[status];
  const barWidth = Math.min((medicine.currentStock / (medicine.reorderThreshold * 2)) * 100, 100);

  async function handleSale(e: React.MouseEvent) {
    e.stopPropagation();
    await recordSale(medicine.id);
    setToast(true);
    setTimeout(() => setToast(false), 1500);
  }

  return (
    <Card className="relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer border-[#e2e8f0] hover:border-[#0284c7]/30 hover:shadow-lg">
      <div className="h-32 bg-secondary/30 flex items-center justify-center overflow-hidden relative">
        {medicine.image ? (
          <img src={medicine.image} alt={medicine.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="bg-[#0284c7]/5 h-full w-full flex items-center justify-center">
             <span className="text-[#0284c7]/20 font-black text-4xl uppercase select-none">{medicine.name.slice(0, 2)}</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
           <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider shadow-sm', s.color)}>{s.label}</span>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-bold text-foreground truncate group-hover:text-[#0284c7] transition-colors">{medicine.name}</h3>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">{medicine.unit}</p>
        </div>
        
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-2xl font-black text-[#0284c7] leading-none">{medicine.currentStock}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Units Available</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold text-foreground">Le {medicine.costPerUnit.toLocaleString()}</p>
             <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Per Unit</p>
          </div>
        </div>

        <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              s.color.includes('success') || s.color.includes('[#10b981]') ? 'bg-[#10b981]' : 
              s.color.includes('warning') || s.color.includes('[#f59e0b]') ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
            )}
            style={{ width: `${Math.max(barWidth, 6)}%` }}
          />
        </div>
        
        <Button 
          onClick={handleSale} 
          className="w-full h-11 rounded-xl bg-[#0284c7] hover:bg-[#0284c7]/90 shadow-md shadow-sky-50 font-bold"
        >
          LOG SALE
        </Button>
      </CardContent>
      {toast && (
        <div className="absolute inset-0 bg-[#10b981]/90 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in zoom-in duration-200 z-20">
          <CheckCircle2 className="h-10 w-10 mb-2" />
          <span className="font-black text-sm uppercase tracking-widest">Sale Recorded</span>
        </div>
      )}
    </Card>
  );
}
