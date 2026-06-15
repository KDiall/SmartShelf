'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { isToday, startOfWeek, subDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Users, LogOut, TrendingUp, TrendingDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

type Period = '7d' | '30d' | 'all';

export default function MorePage() {
  const router = useRouter();
  const { medicines, sales, alerts, loadData } = usePharmacyStore();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
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
  const leastSold = useMemo(
    () => [...sortedBySales].reverse().slice(0, 10),
    [sortedBySales]
  );

  const topDrug = useMemo(() => sortedBySales[0]?.name || 'N/A', [sortedBySales]);
  const topDrugQty = useMemo(() => sortedBySales[0]?.quantity || 0, [sortedBySales]);

  const periods: { value: Period; label: string }[] = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: 'all', label: 'All time' },
  ];

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-foreground text-3xl tracking-tight">
            Reports
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-3xl font-black text-primary">{todaySales}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                Today's Sales
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-3xl font-black text-primary">{weekSales}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                This Week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-3xl font-black text-[#0284c7]">{topDrugQty}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1 truncate">
                Top: {topDrug}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className={cn('text-3xl font-black', lowStockCount > 0 ? 'text-destructive' : 'text-primary')}>
                {lowStockCount}
              </p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                Low Stock Alerts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-bold transition-colors',
                period === p.value
                  ? 'bg-[#0284c7] text-white shadow-md'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {sortedBySales.length === 0 ? (
          <Card className="bg-muted/20 border-dashed border-2 border-border">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground font-bold text-lg uppercase tracking-tight">
                No sales data yet
              </p>
              <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest font-bold opacity-50">
                Log sales from the home page to see reports.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Most Sold Chart */}
            <Card className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-[#0284c7]/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-[#0284c7]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">Most Sold Products</h2>
                    <p className="text-xs text-muted-foreground">Top 10 by quantity sold</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(200, topSold.length * 40)}>
                  <BarChart data={topSold} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                      }}
                    />
                    <Bar dataKey="quantity" fill="#0284c7" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Least Sold Chart */}
            {leastSold.length > 0 && (
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground">Least Sold Products</h2>
                      <p className="text-xs text-muted-foreground">Bottom 10 by quantity sold</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(200, leastSold.length * 40)}>
                    <BarChart data={leastSold} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.75rem',
                          fontSize: '0.875rem',
                        }}
                    />
                    <Bar dataKey="quantity" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Sales Summary Table */}
            <Card>
              <CardContent className="p-5">
                <h2 className="font-bold text-foreground mb-4">Sales Summary</h2>
                <div className="space-y-1">
                  {sortedBySales.map((item, i) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-secondary/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-[#0284c7]">{item.quantity} units</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Settings */}
        <div className="border-t border-border pt-5 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
            Settings
          </p>

          <Button
            variant="ghost"
            onClick={() => router.push('/medicines')}
            className="w-full justify-start h-auto p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-lg">Manage Medicines</p>
                <p className="text-sm text-muted-foreground">Edit stock, thresholds, and details</p>
              </div>
            </div>
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.push('/settings')}
            className="w-full justify-start h-auto p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-lg">Profile Settings</p>
                <p className="text-sm text-muted-foreground">Edit pharmacy name, address, and photo</p>
              </div>
            </div>
          </Button>

          {user?.role === 'admin' && (
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/users')}
              className="w-full justify-start h-auto p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground text-lg">Manage Users</p>
                  <p className="text-sm text-muted-foreground">Add or remove staff accounts</p>
                </div>
              </div>
            </Button>
          )}

          <div className="border-t border-border my-3" />

          <Button
            variant="ghost"
            onClick={() => { logout(); router.push('/login'); }}
            className="w-full justify-start h-auto p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-destructive text-lg">Log Out</p>
                <p className="text-sm text-muted-foreground">Sign out of SmartShelf</p>
              </div>
            </div>
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground pt-2">
          SmartShelf v0.1.0
        </p>
      </div>
    </AuthGuard>
  );
}
