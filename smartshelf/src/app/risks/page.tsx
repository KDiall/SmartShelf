'use client';
import { useEffect } from 'react';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { RiskCard } from '@/components/risk-card';

export default function RisksPage() {
  const alerts = usePharmacyStore((s) => s.alerts);
  const loadData = usePharmacyStore((s) => s.loadData);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  return (
    <AuthGuard>
      <h1 className="text-xl font-bold mb-4">Inventory Risks</h1>
      {alerts.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          No risks detected. Inventory looks healthy.
        </p>
      ) : (
        alerts.map((a) => (
          <RiskCard key={`${a.medicineId}-${a.type}`} alert={a} />
        ))
      )}
    </AuthGuard>
  );
}
