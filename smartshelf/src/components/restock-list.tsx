import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { RestockItem } from '@/types';

interface Props {
  items: RestockItem[];
  onSendOrder: () => void;
  sending: boolean;
}

export function RestockList({ items, onSendOrder, sending }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        No items need restocking.
      </p>
    );
  }

  return (
    <div>
      <div className="space-y-2 mb-4">
        {items.map((item) => (
          <Card key={item.medicineId}>
            <CardContent className="p-3 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm">{item.medicineName}</p>
                <p className="text-xs text-muted-foreground">
                  Stock: {item.currentStock} {item.unit}
                </p>
              </div>
              <p className="font-bold text-sm">
                Order: {item.reorderQuantity}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button
        onClick={onSendOrder}
        disabled={sending}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {sending ? 'Sending...' : 'Send Order via WhatsApp'}
      </Button>
    </div>
  );
}
