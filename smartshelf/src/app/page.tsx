'use client';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { MedicineTile } from '@/components/medicine-tile';
import { AuthGuard } from '@/components/auth-guard';
import { useSync } from '@/hooks/use-sync';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isToday, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ShoppingCart, CheckCircle2, AlertCircle, Clock, Loader2, Pill, ShoppingBag } from 'lucide-react';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

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
    () => sales.filter((s) => isToday(new Date(s.soldAt))).length,
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

  return (
    <AuthGuard>
      {!isLoaded ? (
        <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-[#0284c7] mb-4" />
          <p className="text-lg font-bold uppercase tracking-widest opacity-50">Loading Dashboard</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#020617] font-black text-4xl tracking-tight leading-none">
                {getGreeting()}, <span className="text-[#0284c7]">{user?.name?.split(' ')[0] || 'Pharmacist'}</span>
              </h1>
              <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest mt-2">{format(new Date(), 'EEEE, MMMM d')}</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white shadow-xl shadow-sky-100 flex items-center justify-center border border-sky-50 overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-black text-[#0284c7]">{(user?.name || 'P')[0]}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none bg-gradient-to-br from-[#0284c7] to-[#0ea5e9] text-white shadow-2xl shadow-sky-200 overflow-hidden relative md:col-span-2 group">
              <div className="absolute -top-10 -right-10 p-8 opacity-10 transition-transform group-hover:scale-110 duration-500">
                <ShoppingCart size={240} />
              </div>
              <CardContent className="p-10 relative z-10">
                <p className="text-white/70 text-xs font-black uppercase tracking-[0.2em] mb-4">Daily Performance</p>
                <div className="flex items-baseline gap-4">
                  <p className="font-black tracking-tighter" style={{ fontSize: 72 }}>
                    {todaySales}
                  </p>
                  <p className="text-white/80 font-black text-xl uppercase tracking-widest mb-3">Sales Today</p>
                </div>
                <div className="h-2 w-full bg-white/20 rounded-full mt-6 overflow-hidden">
                   <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: '65%' }} />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {lowStockCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/orders')}
                  className="w-full h-auto p-5 bg-white border-none shadow-xl shadow-amber-100/50 hover:shadow-amber-200/50 hover:bg-amber-50 group transition-all rounded-3xl"
                >
                  <div className="flex items-center text-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-[#020617] uppercase tracking-tight leading-none">
                        {lowStockCount} Low Stock
                      </p>
                      <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">Tap to Restock</p>
                    </div>
                  </div>
                </Button>
              )}

              {expiryCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/risks')}
                  className="w-full h-auto p-5 bg-white border-none shadow-xl shadow-red-100/50 hover:shadow-red-200/50 hover:bg-red-50 group transition-all rounded-3xl"
                >
                  <div className="flex items-center text-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <Clock className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-[#020617] uppercase tracking-tight leading-none">
                        {expiryCount} Expiring Soon
                      </p>
                      <p className="text-xs font-bold text-red-500 uppercase tracking-widest mt-1">View Details</p>
                    </div>
                  </div>
                </Button>
              )}

              {totalAlerts === 0 && (
                <Card className="bg-white border-none shadow-xl shadow-emerald-100/50 rounded-3xl">
                  <CardContent className="p-5 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="font-black text-[#020617] uppercase tracking-tight">All Healthy</p>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">No alerts</p>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-white border-none shadow-xl shadow-sky-50 rounded-3xl">
                <CardContent className="p-6 text-center">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Health Score</p>
                   <p className={cn(
                     'text-3xl font-black',
                     healthScore > 80 ? 'text-[#10b981]' : healthScore > 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                   )}>{healthScore}%</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#0284c7]/10 flex items-center justify-center">
                  <Pill className="h-4 w-4 text-[#0284c7]" />
                </div>
                <h2 className="text-[#020617] font-black text-xl uppercase tracking-tight">Quick Sale</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white text-[#0284c7] border-sky-100 font-black text-[10px] px-3 py-1 uppercase tracking-widest shadow-sm">1-Tap Log</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/bulk-sale')}
                  className="h-8 rounded-xl border-sky-100 text-[#0284c7] font-bold text-[10px] uppercase tracking-widest gap-1 shadow-sm"
                >
                  <ShoppingBag className="h-3 w-3" />
                  Bulk
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {medicines
                .filter((m) => m.isBig5)
                .map((med) => (
                  <MedicineTile key={med.id} medicine={med} />
                ))}
              {medicines.filter((m) => m.isBig5).length === 0 && (
                <div className="col-span-full">
                  <Card className="bg-white/50 border-dashed border-2 border-slate-200 shadow-none rounded-3xl">
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground font-bold text-lg uppercase tracking-tight">
                        No quick-sale items
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest font-bold opacity-50">
                        Mark medicines as &quot;Big 5&quot; to see them here.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </AuthGuard>
  );
}
