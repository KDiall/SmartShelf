'use client';
import { useRouter } from 'next/navigation';
import { usePharmacyStore } from '@/store/pharmacy';
import { AuthGuard } from '@/components/auth-guard';
import { MedicineForm } from '@/components/medicine-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewMedicinePage() {
  const router = useRouter();
  const addMedicine = usePharmacyStore((s) => s.addMedicine);

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
    const medicine = {
      id: crypto.randomUUID(),
      ...data,
      isBig5: data.isBig5 ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addMedicine(medicine);
    router.push('/medicines');
  }

  return (
    <AuthGuard>
      <Card>
        <CardHeader>
          <CardTitle>Add Medicine</CardTitle>
        </CardHeader>
        <CardContent>
          <MedicineForm onSubmit={onSubmit} submitLabel="Add Medicine" />
        </CardContent>
      </Card>
    </AuthGuard>
  );
}
