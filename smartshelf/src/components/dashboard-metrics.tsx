import { Card, CardContent } from '@/components/ui/card';
import type { Medicine, StockAlert } from '@/types';

interface Props {
  healthScore: number;
  medicines: Medicine[];
  alerts: StockAlert[];
}

export function DashboardMetrics({ healthScore, alerts }: Props) {
  const lowStock = alerts.filter((a) => a.type === 'stockout').length;
  const expiryRisk = alerts.filter((a) => a.type === 'expiry').length;

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-3 text-center flex flex-col justify-center h-full">
          <p
            className={`text-3xl font-bold ${
              healthScore > 80
                ? 'text-green-600'
                : healthScore > 50
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            {healthScore}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">
            Health Score
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-center">
          <p
            className={`text-2xl font-bold ${
              lowStock > 0 ? 'text-amber-600' : 'text-green-600'
            }`}
          >
            {lowStock}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">
            Low Stock
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-center">
          <p
            className={`text-2xl font-bold ${
              expiryRisk > 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {expiryRisk}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">
            Expiry Risk
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
