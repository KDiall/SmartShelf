'use client';
import { Card, CardContent } from '@/components/ui/card';
import type { Medicine } from '@/types';
import { getStockStatus } from '@/lib/risk-engine';
import { usePharmacyStore } from '@/store/pharmacy';
import { Badge } from '@/components/ui/badge';

interface Props {
  medicine: Medicine;
}

export function MedicineTile({ medicine }: Props) {
  const recordSale = usePharmacyStore((s) => s.recordSale);
  const status = getStockStatus(medicine.currentStock, medicine.reorderThreshold);

  const statusColors: Record<string, string> = {
    ok: 'bg-green-100 text-green-800 border-green-300',
    low: 'bg-amber-100 text-amber-800 border-amber-300',
    critical: 'bg-red-100 text-red-800 border-red-300',
    out: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <Card
      className="cursor-pointer active:scale-95 transition-transform hover:shadow-md"
      onClick={() => recordSale(medicine.id)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-sm leading-tight">{medicine.name}</h3>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${statusColors[status]}`}
          >
            {medicine.currentStock}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">{medicine.unit}</p>
      </CardContent>
    </Card>
  );
}
