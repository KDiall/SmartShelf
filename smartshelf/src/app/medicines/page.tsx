'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { getStockStatus } from '@/lib/risk-engine';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Edit, Trash2, ArrowLeft, Plus } from 'lucide-react';
import { MedicineForm } from '@/components/medicine-form';
import type { Medicine } from '@/types';

function StockBadge({ status }: { status: string }) {
  const map: Record<string, { className: string; label: string }> = {
    ok: { className: 'bg-[#10b981] text-white', label: 'OK' },
    low: { className: 'bg-[#f59e0b] text-white', label: 'Low' },
    critical: { className: 'bg-[#ef4444] text-white', label: 'Critical' },
  };
  const cfg = map[status] || map.critical;
  return <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight', cfg.className)}>{cfg.label}</span>;
}

export default function MedicinesPage() {
  const { medicines, isLoaded, loadData, deleteMedicine, addMedicine } = usePharmacyStore();
  const token = useAuthStore((s) => s.token);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  async function handleDelete(id: string) {
    await deleteMedicine(id);
    setDeleteId(null);
  }

  async function handleAddMedicine(data: {
    name: string; image?: string | null; unit: string;
    currentStock: number; reorderThreshold: number; reorderQuantity: number;
    expiryDate: string; costPerUnit: number; isBig5: boolean;
  }) {
    const user = useAuthStore.getState().user;
    const newMed: Medicine = {
      ...data,
      id: crypto.randomUUID(),
      userId: user?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await addMedicine(newMed);
    setShowAddModal(false);
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/more">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/50">
                <ArrowLeft className="h-6 w-6 text-muted-foreground" />
              </Button>
            </Link>
            <h1 className="font-bold text-foreground text-3xl tracking-tight">
              All Medicines
            </h1>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)} 
            size="icon" 
            className="h-11 w-11 rounded-xl bg-[#0284c7] hover:bg-[#0284c7]/90 shadow-md shadow-sky-100"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {!isLoaded ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-lg">
            Loading...
          </div>
        ) : medicines.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground text-lg">No medicines found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {medicines.map((med) => {
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
                <Card key={med.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-semibold text-foreground">{med.name}</h3>
                          <StockBadge status={status} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {med.unit} &bull; Threshold: {med.reorderThreshold} &bull; Reorder: {med.reorderQuantity}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-primary">{med.currentStock}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                      <div
                        className={cn('h-full rounded-full transition-all', barColor)}
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/medicines/${med.id}`}>
                        <Button variant="ghost" size="icon" className="text-primary">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(med.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete confirmation */}
        <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Medicine?</DialogTitle>
              <DialogDescription>This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button
                variant="destructive"
                onClick={() => deleteId && handleDelete(deleteId)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add New Medicine Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Medicine</DialogTitle>
              <DialogDescription>
                Enter the details of the new medicine to add it to your inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <MedicineForm onSubmit={handleAddMedicine} submitLabel="Add Medicine" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
