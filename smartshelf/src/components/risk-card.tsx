import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';
import type { StockAlert } from '@/types';

export function RiskCard({ alert }: { alert: StockAlert }) {
  const isExpiry = alert.type === 'expiry';
  const isCritical = alert.severity === 'critical';

  return (
    <Alert variant={isCritical ? 'destructive' : 'default'} className="mb-3">
      {isExpiry ? (
        <Clock className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      <AlertTitle className="font-semibold">
        {isExpiry
          ? `${alert.medicineName} expiring soon`
          : `${alert.medicineName} running low`}
      </AlertTitle>
      <AlertDescription>
        {isExpiry ? (
          <>
            {alert.currentStock} packs may expire in {alert.daysRemaining} days.
            <span className="block mt-1 font-semibold">
              Potential Loss: Le {alert.estimatedLossLeones?.toLocaleString()}
            </span>
          </>
        ) : alert.currentStock === 0 ? (
          'Out of stock.'
        ) : (
          `Projected to run out in ${alert.daysRemaining} days based on actual sales data. ${alert.currentStock} remaining.`
        )}
      </AlertDescription>
    </Alert>
  );
}
