'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { MedicineTile } from '@/components/medicine-tile';
import { AuthGuard } from '@/components/auth-guard';
import { useSync } from '@/hooks/use-sync';
import { useCountUp } from '@/hooks/use-count-up';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, Loader2, Pill, ShoppingBag, Plus } from 'lucide-react';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getHealthStatus(score: number): { label: string; color: string; ringColor: string } {
  if (score > 80) return { label: 'GOOD', color: 'text-[#22c55e]', ringColor: '#22c55e' };
  if (score > 50) return { label: 'FAIR', color: 'text-[#f59e0b]', ringColor: '#f59e0b' };
  return { label: 'CRITICAL', color: 'text-[#ef4444]', ringColor: '#ef4444' };
}

function HealthRing({ score }: { score: number }) {
  const status = getHealthStatus(score);
  const [mounted, setMounted] = useState(false);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = mounted ? circumference - (score / 100) * circumference : circumference;
  const displayScore = useCountUp(score, 1000, mounted);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="220" height="220" className="-rotate-90">
        <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="12" />
        <circle
          cx="110" cy="110" r={radius}
          fill="none"
          stroke={status.ringColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="animate-ring"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black text-[#0f172a] tracking-tight">{displayScore}</span>
        <span className="text-sm font-semibold text-[#64748b] mt-1">/ 100</span>
        <span className={cn('text-xs font-bold uppercase tracking-widest mt-2', status.color)}>
          {status.label}
        </span>
      </div>
    </div>
  );
}

const BIG5_GRADIENTS = [
  'from-[#14b8a6] to-[#2dd4bf]',
  'from-[#3b82f6] to-[#60a5fa]',
  'from-[#22c55e] to-[#4ade80]',
  'from-[#0ea5e9] to-[#38bdf8]',
  'from-[#a855f7] to-[#c084fc]',
];

export default function HomePage() {
  const router = useRouter();
  const { medicines, sales, alerts, healthScore, isLoaded, loadData } = usePharmacyStore();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  useSync();

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const todaySales = useMemo(
    () => sales.filter((s) => new Date(s.soldAt).toDateString() === new Date().toDateString()).length,
    [sales]
  );

  const lowStockCount = useMemo(
    () => alerts.filter((a) => a.type === 'stockout').length,
    [alerts]
  );
  const expiryCount = useMemo(
    () => alerts.filter((a) => a.type === 'expiry').length,
    [alerts]
  );
  const totalAlerts = lowStockCount + expiryCount;

  const big5Meds = useMemo(() => medicines.filter((m) => m.isBig5), [medicines]);

  const animSales = useCountUp(todaySales, 800, isLoaded);

  return (
    <AuthGuard>
      {!isLoaded ? (
        <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-lg font-bold uppercase tracking-widest opacity-50">Loading Dashboard</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between entrance" style={{ animationDelay: '0ms' }}>
            <div>
              <h1 className="text-[#0f172a] font-extrabold text-2xl tracking-tight leading-none" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {getGreeting()}, {user?.name?.split(' ')[0] || 'Pharmacist'} 👋
              </h1>
              <p className="text-[#64748b] text-sm font-medium mt-1">Inventory Health Today</p>
            </div>
            <div className="h-12 w-12 rounded-full glass-card flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-primary">{(user?.name || 'P')[0]}</span>
              )}
            </div>
          </div>

          {/* Hero Card */}
          <Card className="glass-card rounded-3xl overflow-hidden active:scale-[0.99] transition-transform duration-150 entrance" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
              <HealthRing score={healthScore} />
              <div className="flex-1 text-center md:text-left">
                <p className="text-[#64748b] text-xs font-semibold uppercase tracking-widest">Today&apos;s Performance</p>
                <p className="text-4xl font-black text-[#0f172a] mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {animSales} Sales
                </p>
                <p className="text-sm text-[#64748b] mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                  {lowStockCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {lowStockCount} Low Stock
                    </span>
                  )}
                  {expiryCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                      <Clock className="h-3.5 w-3.5" />
                      {expiryCount} Expiring
                    </span>
                  )}
                  {totalAlerts === 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      All Healthy
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Summary */}
          {totalAlerts > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lowStockCount > 0 && (
                <button
                  onClick={() => router.push('/orders')}
                  className="glass-card rounded-2xl p-4 flex items-center gap-4 text-left hover:shadow-lg active:scale-[0.98] transition-all duration-150 group entrance"
                  style={{ animationDelay: '200ms' }}
                >
                  <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0f172a]">{lowStockCount} Stockout Risk</p>
                    <p className="text-xs text-[#64748b]">Medicines running low — tap to reorder</p>
                  </div>
                </button>
              )}
              {expiryCount > 0 && (
                <button
                  onClick={() => router.push('/risks')}
                  className="glass-card rounded-2xl p-4 flex items-center gap-4 text-left hover:shadow-lg active:scale-[0.98] transition-all duration-150 group entrance"
                  style={{ animationDelay: '300ms' }}
                >
                  <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0f172a]">{expiryCount} Expiry Risk</p>
                    <p className="text-xs text-[#64748b]">Medicines expiring soon — tap to review</p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Big 5 Quick Log */}
          <section className="entrance" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Pill className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-[#0f172a] font-extrabold text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Quick Sale
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white text-primary border-primary/20 font-bold text-[10px] px-3 py-1 uppercase tracking-widest shadow-sm">
                  1-Tap Log
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/bulk-sale')}
                  className="h-7 rounded-xl border-primary/20 text-primary font-bold text-[10px] uppercase tracking-widest gap-1 shadow-sm"
                >
                  <ShoppingBag className="h-3 w-3" />
                  Bulk
                </Button>
              </div>
            </div>

            {big5Meds.length === 0 ? (
              <Card className="glass-card rounded-3xl border-dashed border-2 border-[rgba(15,23,42,0.08)]">
                <CardContent className="p-12 text-center">
                  <Plus className="h-12 w-12 text-[#64748b]/50 mx-auto mb-4" />
                  <p className="text-[#0f172a] font-bold text-lg">No quick-sale items</p>
                  <p className="text-xs text-[#64748b] mt-2 font-medium">
                    Mark medicines as &quot;Big 5&quot; in Stock to see them here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {big5Meds.map((med, idx) => (
                  <MedicineTile
                    key={med.id}
                    medicine={med}
                    gradient={BIG5_GRADIENTS[idx % BIG5_GRADIENTS.length]}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AuthGuard>
  );
}
