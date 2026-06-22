'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { getStockStatus } from '@/lib/risk-engine';
import { Search, Plus, Loader2, Filter } from 'lucide-react';
import { MedicineForm } from '@/components/medicine-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Medicine } from '@/types';

function StockBadge({ status }: { status: string }) {
  const map: Record<string, { className: string; label: string }> = {
    ok: { className: 'bg-success text-white', label: 'OK' },
    low: { className: 'bg-warning text-white', label: 'Low' },
    critical: { className: 'bg-destructive text-destructive-foreground', label: 'Critical' },
  };
  const cfg = map[status] || map.critical;
  return <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.className)}>{cfg.label}</span>;
}

export default function StockPage() {
  const { medicines, isLoaded, loadData, addMedicine } = usePharmacyStore();
  const token = useAuthStore((s) => s.token);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const filtered = useMemo(
    () =>
      medicines.filter((m) => {
        const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;
        if (statusFilter === 'all') return true;
        const status = getStockStatus(m.currentStock, m.reorderThreshold);
        return status === statusFilter;
      }),
    [medicines, search, statusFilter]
  );

  async function handleAdd(data: {
    name: string;
    unit: string;
    currentStock: number;
    reorderThreshold: number;
    reorderQuantity: number;
    expiryDate: string;
    costPerUnit: number;
    isBig5?: boolean;
  }) {
    const user = useAuthStore.getState().user;
    const medicine: Medicine = {
      id: crypto.randomUUID(),
      ...data,
      isBig5: data.isBig5 ?? false,
      userId: user?.id,
      pharmacyId: user?.pharmacyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await addMedicine(medicine);
    setShowModal(false);
  }

  return (
    <AuthGuard>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-foreground text-3xl" style={{ fontSize: 28 }}>
            Stock
          </h1>
          <Button onClick={() => setShowModal(true)} size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              className="pl-12 text-lg rounded-[14px]"
              placeholder="Search medicines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'ok', label: 'In Stock' },
              { value: 'low', label: 'Low' },
              { value: 'critical', label: 'Critical' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0',
                  statusFilter === opt.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-[#64748b] border border-[rgba(15,23,42,0.1)] hover:border-primary/30'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {!isLoaded ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground text-lg">
                {search ? 'No matches found.' : 'No medicines yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((med, idx) => {
              const status = getStockStatus(med.currentStock, med.reorderThreshold);
              const barColor =
                status === 'ok'
                  ? 'bg-success'
                  : status === 'low'
                    ? 'bg-warning'
                    : 'bg-destructive';
              const barWidth = Math.min(
                (med.currentStock / (med.reorderThreshold * 2)) * 100,
                100
              );

              return (
                <Link key={med.id} href={`/medicines/${med.id}`} className="block entrance" style={{ animationDelay: `${idx * 60}ms` }}>
                  <Card className="glass-card active:scale-[0.99] transition-transform rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-semibold text-foreground">{med.name}</h3>
                          <StockBadge status={status} />
                        </div>
                        <span className="text-lg font-bold text-primary">
                          {med.currentStock}{' '}
                          <span className="text-sm font-medium text-muted-foreground">{med.unit}</span>
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', barColor)}
                          style={{ width: `${Math.max(barWidth, 2)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Add Medicine Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Medicine</DialogTitle>
              <DialogDescription>Enter the details of the new medicine.</DialogDescription>
            </DialogHeader>
            <MedicineForm
              onSubmit={handleAdd}
              submitLabel="Add Medicine"
              big5LimitReached={medicines.filter((m) => m.isBig5).length >= 8}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
