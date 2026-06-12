'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { StockBadge } from '@/components/stock-badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function MedicinesPage() {
  const { medicines, isLoaded, loadData, deleteMedicine } =
    usePharmacyStore();
  const token = useAuthStore((s) => s.token);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  async function handleDelete(id: string) {
    await deleteMedicine(id);
    setDeleteId(null);
  }

  return (
    <AuthGuard>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Medicines</h1>
        <Link href="/medicines/new">
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </Link>
      </div>

      {!isLoaded ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          Loading...
        </div>
      ) : medicines.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          No medicines found. Add your first medicine.
        </p>
      ) : (
        <div className="space-y-2">
          {medicines.map((med) => (
            <Card key={med.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{med.name}</p>
                    <StockBadge
                      stock={med.currentStock}
                      threshold={med.reorderThreshold}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {med.unit} &bull; Threshold: {med.reorderThreshold} &bull;
                    Reorder: {med.reorderQuantity}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Link href={`/medicines/${med.id}`}>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Dialog
                    open={deleteId === med.id}
                    onOpenChange={(open) => {
                      if (!open) setDeleteId(null);
                    }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(med.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete {med.name}?</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        This action cannot be undone.
                      </p>
                      <div className="flex gap-2 justify-end mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setDeleteId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(med.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AuthGuard>
  );
}
