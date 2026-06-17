'use client';
import { useEffect, useMemo } from 'react';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Clock, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function RiskCard({ alert }: { alert: ReturnType<typeof usePharmacyStore.getState>['alerts'][0] }) {
  const isExpiry = alert.type === 'expiry';
  const isCritical = alert.severity === 'critical';

  return (
    <Card className={cn(
      'glass-card rounded-2xl overflow-hidden border',
      isExpiry ? 'border-amber-200' : 'border-red-200'
    )}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0',
            isExpiry ? 'bg-amber-50' : 'bg-red-50'
          )}>
            {isExpiry ? (
              <Clock className={cn('h-6 w-6', isCritical ? 'text-red-500' : 'text-amber-500')} />
            ) : (
              <AlertTriangle className={cn('h-6 w-6', isCritical ? 'text-red-500' : 'text-amber-500')} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                'text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                isExpiry
                  ? isCritical ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  : isCritical ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
              )}>
                {isExpiry ? 'Expiry Risk' : 'Stockout Risk'}
              </span>
              {isCritical && (
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">High</span>
              )}
            </div>
            <p className="font-bold text-[#0f172a] text-lg">{alert.medicineName}</p>
            {isExpiry ? (
              <p className="text-sm text-[#64748b] mt-1">
                {alert.currentStock} packs — {alert.daysRemaining <= 0 ? `expired ${Math.abs(alert.daysRemaining)} days ago` : `expiring in ${alert.daysRemaining} days`}
              </p>
            ) : (
              <p className="text-sm text-[#64748b] mt-1">
                {alert.daysRemaining} days of stock remaining ({alert.currentStock} left)
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RisksPage() {
  const router = useRouter();
  const alerts = usePharmacyStore((s) => s.alerts);
  const loadData = usePharmacyStore((s) => s.loadData);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const expiryCount = useMemo(() => alerts.filter((a) => a.type === 'expiry').length, [alerts]);
  const stockoutCount = useMemo(() => alerts.filter((a) => a.type === 'stockout').length, [alerts]);

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl">
            <ArrowLeft className="h-6 w-6 text-muted-foreground" />
          </Button>
          <h1 className="font-extrabold text-[#0f172a] text-2xl tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Inventory Risks
          </h1>
        </div>

        {alerts.length > 0 && (
          <div className="flex gap-3 text-sm text-[#64748b]">
            <span className="font-semibold">{stockoutCount} stockout</span>
            <span className="text-[rgba(15,23,42,0.08)]">·</span>
            <span className="font-semibold">{expiryCount} expiring</span>
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-[#0f172a] font-bold text-lg">No risks detected</p>
            <p className="text-sm text-[#64748b] mt-1">Inventory looks healthy.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => (
              <RiskCard key={`${a.medicineId}-${a.type}`} alert={a} />
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
