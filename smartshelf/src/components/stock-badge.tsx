import { Badge } from '@/components/ui/badge';
import { getStockStatus } from '@/lib/risk-engine';

interface Props {
  stock: number;
  threshold: number;
}

export function StockBadge({ stock, threshold }: Props) {
  const status = getStockStatus(stock, threshold);

  const colors: Record<string, string> = {
    ok: 'bg-green-100 text-green-800',
    low: 'bg-amber-100 text-amber-800',
    critical: 'bg-red-100 text-red-800',
    out: 'bg-gray-100 text-gray-800',
  };

  const labels: Record<string, string> = {
    ok: 'In Stock',
    low: 'Low',
    critical: 'Critical',
    out: 'Out',
  };

  return (
    <Badge variant="outline" className={colors[status]}>
      {labels[status]} ({stock})
    </Badge>
  );
}
