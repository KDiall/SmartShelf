'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePharmacyStore } from '@/store/pharmacy';
import { AuthGuard } from '@/components/auth-guard';
import { MedicineForm } from '@/components/medicine-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Medicine } from '@/types';

export default function EditMedicinePage() {
  const router = useRouter();
  const params = useParams();
  const { medicines, loadData, updateMedicine } = usePharmacyStore();
  const medicine = medicines.find((m) => m.id === params.id) ?? null;

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function onSubmit(data: {
    name: string;
    unit: string;
    currentStock: number;
    reorderThreshold: number;
    reorderQuantity: number;
    expiryDate: string;
    costPerUnit: number;
    isBig5?: boolean;
  }) {
    if (!medicine) return;

    const updated: Medicine = {
      ...medicine,
      ...data,
      isBig5: data.isBig5 ?? medicine.isBig5,
      updatedAt: new Date().toISOString(),
    };

    await updateMedicine(updated);
    router.push('/medicines');
  }

  if (!medicine) {
    return (
      <AuthGuard>
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 rounded-2xl w-1/3" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="entrance" style={{ animationDelay: '0ms' }}>
          <h1 className="font-bold text-foreground text-2xl tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Edit {medicine.name}
          </h1>
          <p className="text-sm text-[#64748b] font-medium mt-0.5">Update medicine details</p>
        </div>
        <Card className="glass-card rounded-2xl border-0 entrance" style={{ animationDelay: '50ms' }}>
          <CardHeader>
            <CardTitle>Medicine Details</CardTitle>
          </CardHeader>
          <CardContent>
            <MedicineForm
              defaultValues={medicine}
              onSubmit={onSubmit}
              submitLabel="Save Changes"
              big5LimitReached={medicines.filter((m) => m.isBig5 && m.id !== medicine.id).length >= 8}
              isCurrentlyBig5={medicine.isBig5}
            />
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
