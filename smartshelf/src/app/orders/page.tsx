'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { computeRestockItems } from '@/lib/restock';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, Plus, ShoppingCart, CheckCircle2, AlertCircle, Trash2, ArrowLeft, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface OrderItem {
  id: string;
  medicineId?: string;
  name: string;
  quantity: number;
  unit: string;
}

const UNIT_OPTIONS = ['pack', 'carton', 'box', 'bottle', 'vial', 'sachet', 'piece'];

function OrderRow({
  item,
  onChange,
  onRemove,
}: {
  item: OrderItem;
  onChange: (id: string, field: keyof OrderItem, value: string | number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-2 glass-card rounded-2xl p-3">
      <div className="flex-1 min-w-0 space-y-2">
        <Input
          type="text"
          value={item.name}
          onChange={(e) => onChange(item.id, 'name', e.target.value)}
          placeholder="Medicine name"
          className="h-9 rounded-xl text-sm font-bold"
        />
        <div className="flex items-center gap-2">
          <select
            value={item.unit}
            onChange={(e) => onChange(item.id, 'unit', e.target.value)}
            className="h-9 rounded-xl border border-input bg-white px-3 text-xs font-semibold text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => onChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
            className="w-24 h-9 text-center text-sm font-bold rounded-xl"
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 shrink-0 mt-0.5"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { medicines, loadData } = usePharmacyStore();
  const token = useAuthStore((s) => s.token);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showStockSearch, setShowStockSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const restockItems = computeRestockItems(medicines);

  const suggestionIds = useMemo(
    () => new Set(orderItems.filter((i) => i.medicineId).map((i) => i.medicineId!)),
    [orderItems]
  );

  const filteredMeds = useMemo(
    () =>
      searchQuery
        ? medicines.filter((m) =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : medicines,
    [medicines, searchQuery]
  );

  function addSuggestion(item: (typeof restockItems)[number]) {
    if (suggestionIds.has(item.medicineId)) return;
    setOrderItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        medicineId: item.medicineId,
        name: item.medicineName,
        quantity: item.reorderQuantity,
        unit: item.unit,
      },
    ]);
  }

  function addFromStock(med: { id: string; name: string; unit: string }) {
    if (suggestionIds.has(med.id)) return;
    setOrderItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        medicineId: med.id,
        name: med.name,
        quantity: 1,
        unit: med.unit,
      },
    ]);
    setSearchQuery('');
    setShowStockSearch(false);
  }

  function addBlankRow() {
    setOrderItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', quantity: 1, unit: 'pack' },
    ]);
  }

  function updateItem(id: string, field: keyof OrderItem, value: string | number) {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function removeItem(id: string) {
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSendOrder() {
    setSending(true);
    setShowReviewDialog(false);
    setSent(false);
    try {
      const res = await fetch('/api/restock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: 'whatsapp',
          items: orderItems
            .filter((i) => i.name.trim())
            .map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
            })),
        }),
      });

      const data = await res.json();
      setSentMessage(data.message);
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send order');
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  const validItems = orderItems.filter((i) => i.name.trim());

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl">
              <ArrowLeft className="h-6 w-6 text-muted-foreground" />
            </Button>
            <h1 className="font-bold text-foreground text-2xl tracking-tight">
              Reorder Stock
            </h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground -mt-4">
          Add items to your order &mdash; type any medicine name, even ones not yet in stock.
        </p>

        {/* Suggested Items */}
        {restockItems.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              Suggested (low stock)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {restockItems.map((item) => {
                const alreadyAdded = suggestionIds.has(item.medicineId);
                return (
                  <Card key={item.medicineId} className={cn('overflow-hidden', alreadyAdded && 'opacity-50')}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm truncate">{item.medicineName}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {item.currentStock} &mdash; reorder {item.reorderQuantity} {item.unit}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyAdded ? 'ghost' : 'outline'}
                        disabled={alreadyAdded}
                        onClick={() => addSuggestion(item)}
                        className="h-8 shrink-0 rounded-xl text-xs font-bold"
                      >
                        {alreadyAdded ? 'Added' : `+${item.reorderQuantity}`}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Order Items */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <Package className="h-3.5 w-3.5" />
            Order Items
          </h2>

          {orderItems.length === 0 ? (
            <Card className="bg-muted/20 border-dashed border-2 border-border">
              <CardContent className="p-8 text-center">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-bold text-muted-foreground">Order is empty</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add items from stock below, or type in any new medicine name.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {orderItems.map((item) => (
                <OrderRow
                  key={item.id}
                  item={item}
                  onChange={updateItem}
                  onRemove={removeItem}
                />
              ))}
            </div>
          )}

          {/* Add buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStockSearch(true)}
              className="flex-1 h-11 rounded-xl gap-2 text-sm font-medium"
            >
              <Search className="h-4 w-4" />
              From stock
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addBlankRow}
              className="flex-1 h-11 rounded-xl border-dashed gap-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              New item
            </Button>
          </div>

          {/* Stock search */}
          {showStockSearch && (
            <div className="space-y-3 glass-card rounded-2xl p-4 mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-10 rounded-xl text-sm"
                  placeholder="Search current stock..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredMeds.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-4">
                    No medicines found. Type a new name above with &quot;New item&quot;.
                  </p>
                ) : (
                  filteredMeds.map((med) => {
                    const inOrder = suggestionIds.has(med.id);
                    return (
                      <button
                        key={med.id}
                        type="button"
                        disabled={inOrder}
                        onClick={() => addFromStock(med)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                          inOrder ? 'opacity-40 cursor-not-allowed' : 'hover:bg-secondary/30'
                        )}
                      >
                        <Plus className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{med.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {med.currentStock} {med.unit}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowStockSearch(false); setSearchQuery(''); }}
                className="w-full h-9 rounded-xl text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          )}
        </section>

        {/* Send */}
        <Button
          onClick={() => setShowReviewDialog(true)}
          disabled={validItems.length === 0 || sending}
          className="w-full h-16 bg-[#25D366] hover:bg-[#25D366]/90 rounded-2xl shadow-lg text-white font-bold text-xl gap-3 border-none"
        >
          <MessageCircle className="h-7 w-7" />
          {sending ? 'Sending...' : validItems.length === 0 ? 'Send Order via WhatsApp' : `Send Order (${validItems.length} items)`}
        </Button>

        {sent && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#10b981] text-white px-8 py-4 rounded-2xl shadow-2xl font-bold animate-in zoom-in slide-in-from-bottom-10 z-50 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            {sentMessage}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Order</DialogTitle>
              <DialogDescription>Final check before it goes to your supplier via WhatsApp.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {validItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-secondary/20 rounded-xl p-3">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">{item.name}</p>
                  </div>
                  <span className="font-bold text-foreground shrink-0 ml-3">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowReviewDialog(false)} className="flex-1 h-11 rounded-xl">
                Edit
              </Button>
              <Button onClick={handleSendOrder} disabled={validItems.length === 0} className="flex-1 h-11 rounded-xl font-bold gap-2 bg-[#25D366] hover:bg-[#25D366]/90">
                <MessageCircle className="h-5 w-5" />
                Send ({validItems.length} items)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
