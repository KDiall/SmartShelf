'use client';
import { useEffect } from 'react';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { MedicineTile } from '@/components/medicine-tile';
import { DashboardMetrics } from '@/components/dashboard-metrics';
import { RiskCard } from '@/components/risk-card';
import { AuthGuard } from '@/components/auth-guard';
import { useSync } from '@/hooks/use-sync';

export default function DashboardPage() {
  const { healthScore, medicines, alerts, isLoaded, loadData } =
    usePharmacyStore();
  const token = useAuthStore((s) => s.token);
  useSync();

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, loadData]);

  return (
    <AuthGuard>
      {!isLoaded ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          Loading...
        </div>
      ) : (
        <>
          {alerts.length > 0 && (
            <div className="bg-amber-100 border-l-4 border-amber-500 p-3 mb-4 rounded-r-md shadow-sm">
              <p className="text-sm font-bold text-amber-900">
                ⚠️ {alerts.length} Medicines at Risk
              </p>
              <p className="text-xs text-amber-800">
                {alerts.filter((a) => a.type === 'stockout').length} stockout
                risk &bull;{' '}
                {alerts.filter((a) => a.type === 'expiry').length} expiry risk
              </p>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">SmartShelf</h1>
          </div>

          <DashboardMetrics
            healthScore={healthScore}
            medicines={medicines}
            alerts={alerts}
          />

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center justify-between">
              <span>Quick Access (Top Sellers)</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">
                1-Tap Log
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {medicines
                .filter((m) => m.isBig5)
                .map((med) => (
                  <MedicineTile key={med.id} medicine={med} />
                ))}
            </div>
          </section>
        </>
      )}
    </AuthGuard>
  );
}
