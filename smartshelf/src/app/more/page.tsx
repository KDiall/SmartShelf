'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { isToday, startOfWeek, subDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Users, TrendingUp, ArrowLeft, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

type Period = '7d' | '30d' | 'all';

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-3xl" />
      <Skeleton className="h-80 rounded-3xl" />
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const { medicines, sales, alerts, isLoaded, loadData } = usePharmacyStore();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [period, setPeriod] = useState<Period>('7d');

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const now = useMemo(() => new Date(), []);
  const todaySales = useMemo(
    () => sales.filter((s) => isToday(new Date(s.soldAt))).length,
    [sales]
  );

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekSales = useMemo(
    () => sales.filter((s) => new Date(s.soldAt) >= weekStart).length,
    [sales, weekStart]
  );

  const lowStockCount = useMemo(
    () => alerts.filter((a) => a.type === 'stockout').length,
    [alerts]
  );

  const periodStart = useMemo(() => {
    if (period === '7d') return subDays(now, 7);
    if (period === '30d') return subDays(now, 30);
    return null;
  }, [period, now]);

  const periodSales = useMemo(
    () =>
      periodStart
        ? sales.filter((s) => new Date(s.soldAt) >= periodStart!)
        : sales,
    [sales, periodStart]
  );

  const medicineSalesMap = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number }>();
    for (const s of periodSales) {
      const med = medicines.find((m) => m.id === s.medicineId);
      const name = med?.name || 'Unknown';
      const existing = map.get(s.medicineId);
      if (existing) {
        existing.quantity += s.quantity;
      } else {
        map.set(s.medicineId, { name, quantity: s.quantity });
      }
    }
    return map;
  }, [periodSales, medicines]);

  const sortedBySales = useMemo(
    () => [...medicineSalesMap.values()].sort((a, b) => b.quantity - a.quantity),
    [medicineSalesMap]
  );

  const topSold = useMemo(() => sortedBySales.slice(0, 10), [sortedBySales]);

  const topDrug = useMemo(() => sortedBySales[0]?.name || 'N/A', [sortedBySales]);
  const topDrugQty = useMemo(() => sortedBySales[0]?.quantity || 0, [sortedBySales]);

  const periods: { value: Period; label: string }[] = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: 'all', label: 'All time' },
  ];

  return (
    <AuthGuard>
      {!isLoaded ? (
        <ReportsSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 entrance" style={{ animationDelay: '0ms' }}>
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl">
              <ArrowLeft className="h-6 w-6 text-muted-foreground" />
            </Button>
            <h1
              className="font-extrabold text-[#0f172a] text-2xl tracking-tight"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Reports
            </h1>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 entrance" style={{ animationDelay: '80ms' }}>
            <Card className="glass-card rounded-2xl border-l-4 border-l-primary overflow-hidden">
              <CardContent className="p-4">
                <p className="text-3xl font-black text-[#0f172a]">{todaySales}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <p className="text-xs text-[#64748b] font-semibold uppercase tracking-wide">
                    Today
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card rounded-2xl border-l-4 border-l-[#3b82f6] overflow-hidden entrance" style={{ animationDelay: '120ms' }}>
              <CardContent className="p-4">
                <p className="text-3xl font-black text-[#0f172a]">{weekSales}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
                  <p className="text-xs text-[#64748b] font-semibold uppercase tracking-wide">
                    This Week
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card rounded-2xl border-l-4 border-l-[#a855f7] overflow-hidden entrance" style={{ animationDelay: '160ms' }}>
              <CardContent className="p-4">
                <p className="text-3xl font-black text-[#0f172a]">{topDrugQty}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#a855f7]" />
                  <p className="text-xs text-[#64748b] font-semibold uppercase tracking-wide truncate">
                    Top: {topDrug}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className={cn(
              'glass-card rounded-2xl border-l-4 overflow-hidden entrance',
              lowStockCount > 0 ? 'border-l-destructive' : 'border-l-primary'
            )} style={{ animationDelay: '200ms' }}>
              <CardContent className="p-4">
                <p className={cn('text-3xl font-black', lowStockCount > 0 ? 'text-destructive' : 'text-[#0f172a]')}>
                  {lowStockCount}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn('h-1.5 w-1.5 rounded-full', lowStockCount > 0 ? 'bg-destructive' : 'bg-primary')} />
                  <p className="text-xs text-[#64748b] font-semibold uppercase tracking-wide">
                    Alerts
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 entrance" style={{ animationDelay: '240ms' }}>
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-5 py-2 rounded-full text-sm font-bold transition-all duration-200',
                  period === p.value
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white/70 text-[#64748b] hover:bg-white border border-[rgba(15,23,42,0.06)]'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {sortedBySales.length === 0 ? (
            <Card className="glass-card rounded-3xl entrance" style={{ animationDelay: '280ms' }}>
              <CardContent className="p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <p className="text-[#0f172a] font-bold text-lg">No sales data yet</p>
                <p className="text-xs text-[#64748b] mt-2 font-medium">
                  Log sales from the home page to see reports.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Most Sold Chart */}
              <Card className="glass-card rounded-3xl overflow-hidden entrance" style={{ animationDelay: '280ms' }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-[#0f172a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Most Sold Products
                      </h2>
                      <p className="text-xs text-[#64748b] font-medium">Top 10 by quantity sold</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(200, topSold.length * 44)}>
                    <BarChart data={topSold} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(255,255,255,0.9)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255,255,255,0.5)',
                          borderRadius: '0.75rem',
                          fontSize: '0.875rem',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                        }}
                      />
                      <Bar dataKey="quantity" fill="#14b8a6" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Sales Summary */}
              <Card className="glass-card rounded-3xl overflow-hidden entrance" style={{ animationDelay: '360ms' }}>
                <CardContent className="p-5">
                  <h2 className="font-extrabold text-[#0f172a] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Sales Summary
                  </h2>
                  <div className="space-y-1">
                    {sortedBySales.map((item, i) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between py-2.5 px-3 rounded-2xl hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold',
                            i < 3 ? 'bg-primary/10 text-primary' : 'bg-[rgba(15,23,42,0.04)] text-[#64748b]'
                          )}>
                            {i + 1}
                          </span>
                          <span className="text-sm font-semibold text-[#0f172a]">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">{item.quantity} units</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Settings */}
          <Card className="glass-card rounded-3xl overflow-hidden entrance" style={{ animationDelay: '440ms' }}>
            <CardContent className="p-5 space-y-2">
              <p className="text-xs font-bold text-[#64748b] uppercase tracking-widest mb-2">
                Settings
              </p>
              <button
                onClick={() => router.push('/medicines')}
                className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-primary/5 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-[#0f172a]">Manage Medicines</p>
                  <p className="text-xs text-[#64748b] font-medium">Edit stock, thresholds, and details</p>
                </div>
              </button>
              {(user?.role === 'admin' || user?.role === 'super_admin') && (
                <button
                  onClick={() => router.push('/admin/users')}
                  className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0f172a]">Manage Users</p>
                    <p className="text-xs text-[#64748b] font-medium">Add or remove staff accounts</p>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-center text-[#94a3b8] font-medium pb-4">
            SmartShelf v0.1.0
          </p>
        </div>
      )}
    </AuthGuard>
  );
}
