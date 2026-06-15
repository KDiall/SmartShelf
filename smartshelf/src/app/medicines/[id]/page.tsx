'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePharmacyStore } from '@/store/pharmacy';
import { AuthGuard } from '@/components/auth-guard';
import { MedicineForm } from '@/components/medicine-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          Loading...
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Card>
        <CardHeader>
          <CardTitle>Edit {medicine.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <MedicineForm
            defaultValues={medicine}
            onSubmit={onSubmit}
            submitLabel="Save Changes"
          />
        </CardContent>
      </Card>
    </AuthGuard>
  );
}
