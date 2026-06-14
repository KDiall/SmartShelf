'use client';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { isToday, startOfWeek, subDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Users, LogOut } from 'lucide-react';

export default function MorePage() {
  const router = useRouter();
  const { medicines, sales, alerts, loadData } = usePharmacyStore();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const todaySales = useMemo(
    () => sales.filter((s) => isToday(new Date(s.soldAt))).length,
    [sales]
  );

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekSales = useMemo(
    () => sales.filter((s) => new Date(s.soldAt) >= weekStart).length,
    [sales, weekStart]
  );

  const topDrug = useMemo(() => {
    const counts: Record<string, number> = {};
    const sevenDaysAgo = subDays(new Date(), 7);
    sales
      .filter((s) => new Date(s.soldAt) >= sevenDaysAgo)
      .forEach((s) => {
        counts[s.medicineId] = (counts[s.medicineId] || 0) + s.quantity;
      });
    const topId = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0];
    const top = topId ? medicines.find((m) => m.id === topId) : null;
    return top?.name || 'N/A';
  }, [sales, medicines]);

  const lowStockCount = useMemo(
    () => alerts.filter((a) => a.type === 'stockout').length,
    [alerts]
  );

  const cards = [
    { label: "Today's Sales", value: todaySales },
    { label: 'This Week', value: weekSales },
    { label: 'Most Sold Drug', value: topDrug },
    { label: 'Low Stock Alerts', value: lowStockCount, warn: lowStockCount > 0 },
  ];

  return (
    <AuthGuard>
      <div className="space-y-5">
        <h1 className="font-bold text-foreground text-3xl" style={{ fontSize: 28 }}>
          Reports
        </h1>

        <div className="grid grid-cols-2 gap-3">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <p className="font-bold text-4xl mb-1">
                  <span className={card.warn ? 'text-destructive' : 'text-primary'}>
                    {card.value}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {card.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

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
