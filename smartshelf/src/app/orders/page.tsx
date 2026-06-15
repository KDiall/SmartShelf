'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { computeRestockItems } from '@/lib/restock';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, Smartphone, Plus, ShoppingCart, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MedicineForm } from '@/components/medicine-form';
import type { Medicine } from '@/types';

interface OrderItem {
  medicineId: string;
  name: string;
  quantity: number;
  unit: string;
}

export default function OrdersPage() {
  const { medicines, loadData, addMedicine } = usePharmacyStore();
  const token = useAuthStore((s) => s.token);
  const [sending, setSending] = useState<'whatsapp' | 'sms' | null>(null);
  const [sent, setSent] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderMethod, setOrderMethod] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const restockItems = computeRestockItems(medicines);

  const existingIds = useMemo(() => new Set(orderItems.map((i) => i.medicineId)), [orderItems]);

  const availableMeds = useMemo(
    () => medicines.filter((m) => !existingIds.has(m.id)),
    [medicines, existingIds]
  );

  const filteredMeds = useMemo(
    () =>
      searchQuery
        ? availableMeds.filter((m) =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : availableMeds,
    [availableMeds, searchQuery]
  );

  function handleOpenOrder(method: 'whatsapp' | 'sms') {
    setOrderMethod(method);
    setOrderItems(
      restockItems.map((item) => ({
        medicineId: item.medicineId,
        name: item.medicineName,
        quantity: item.reorderQuantity,
        unit: item.unit,
      }))
    );
    setSearchQuery('');
    setShowPicker(false);
    setShowOrderModal(true);
  }

  function updateItemQty(id: string, qty: number) {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.medicineId === id ? { ...item, quantity: Math.max(1, qty) } : item
      )
    );
  }

  function removeItem(id: string) {
    setOrderItems((prev) => prev.filter((item) => item.medicineId !== id));
  }

  function addItem(med: Medicine) {
    setOrderItems((prev) => [
      ...prev,
      {
        medicineId: med.id,
        name: med.name,
        quantity: med.reorderQuantity,
        unit: med.unit,
      },
    ]);
    setSearchQuery('');
  }

  async function handleSendOrder() {
    setSending(orderMethod);
    setShowOrderModal(false);
    setSent(false);
    try {
      const res = await fetch('/api/restock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: orderMethod,
          items: orderItems.map((item) => ({
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
      setSending(null);
    }
  }

  async function handleAddMedicine(data: {
    name: string; image?: string | null; unit: string;
    currentStock: number; reorderThreshold: number; reorderQuantity: number;
    expiryDate: string; costPerUnit: number; isBig5: boolean;
  }) {
    const user = useAuthStore.getState().user;
    const newMed: Medicine = {
      ...data,
      id: crypto.randomUUID(),
      userId: user?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await addMedicine(newMed);
    setShowAddModal(false);
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-foreground text-3xl tracking-tight">
            Inventory Orders
          </h1>
          <Button 
            onClick={() => setShowAddModal(true)} 
            size="icon" 
            className="h-11 w-11 rounded-xl bg-[#0284c7] hover:bg-[#0284c7]/90 shadow-md shadow-sky-100"
          >
            <Plus className="h-6 w-6 text-white" />
          </Button>
        </div>

        {restockItems.length === 0 ? (
          <Card className="bg-[#10b981]/5 border-none shadow-none">
            <CardContent className="p-12 text-center">
              <div className="h-20 w-20 rounded-full bg-[#10b981]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-[#10b981]" />
              </div>
              <h2 className="text-xl font-bold text-[#10b981]">Stock Levels Healthy</h2>
              <p className="text-muted-foreground mt-1 max-w-xs mx-auto">
                All your medicines are currently above their reorder thresholds.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {restockItems.map((item) => {
                const isCritical = item.currentStock === 0;
                const med = medicines.find((m) => m.id === item.medicineId);
                return (
                  <Card key={item.medicineId} className={cn(
                    'border-none shadow-sm transition-all',
                    isCritical ? 'bg-[#ef4444]/5' : 'bg-[#f59e0b]/5'
                  )}>
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className={cn(
                        'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
                        isCritical ? 'bg-[#ef4444]/20' : 'bg-[#f59e0b]/20'
                      )}>
                        {isCritical ? <AlertCircle className="h-6 w-6 text-[#ef4444]" /> : <ShoppingCart className="h-6 w-6 text-[#f59e0b]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-foreground truncate">{item.medicineName}</h3>
                        <p className="text-xs font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">
                          Current: <span className={cn('font-bold', isCritical ? 'text-[#ef4444]' : 'text-[#f59e0b]')}>{item.currentStock}</span> / {med?.reorderThreshold} {item.unit}
                        </p>
                        <p className="text-sm font-bold text-[#0284c7] mt-2">
                           Reorder: {item.reorderQuantity} {item.unit}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest text-center">
                Automated Procurement
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => handleOpenOrder('whatsapp')}
                  disabled={sending !== null}
                  className="flex-1 h-14 bg-[#10b981] hover:bg-[#10b981]/90 rounded-2xl shadow-lg shadow-emerald-50 text-white font-bold text-lg gap-2 border-none"
                >
                  <MessageCircle className="h-6 w-6" />
                  {sending === 'whatsapp' ? 'Sending...' : 'WhatsApp'}
                </Button>
                <Button
                  onClick={() => handleOpenOrder('sms')}
                  disabled={sending !== null}
                  className="flex-1 h-14 bg-[#020617] hover:bg-[#020617]/90 rounded-2xl shadow-lg shadow-slate-100 text-white font-bold text-lg gap-2 border-none"
                >
                  <Smartphone className="h-6 w-6" />
                  {sending === 'sms' ? 'Sending...' : 'SMS'}
                </Button>
              </div>
            </div>

            {sent && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#10b981] text-white px-8 py-4 rounded-2xl shadow-2xl font-bold animate-in zoom-in slide-in-from-bottom-10 z-50 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                {sentMessage}
              </div>
            )}
          </>
        )}

        {/* Order Review Dialog */}
        <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Order</DialogTitle>
              <DialogDescription>
                Review and edit items before sending via {orderMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {orderItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 font-medium">
                  No items in order.
                </p>
              ) : (
                orderItems.map((item) => (
                  <div key={item.medicineId} className="flex items-center gap-3 bg-secondary/20 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Qty:</label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItemQty(item.medicineId, parseInt(e.target.value) || 1)}
                        className="w-20 h-9 text-center text-sm font-bold rounded-xl"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.medicineId)}
                      className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Add Item Picker */}
            {showPicker ? (
              <div className="space-y-3 border-t pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-10 rounded-xl text-sm"
                    placeholder="Search medicines..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredMeds.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      {searchQuery ? 'No medicines match your search.' : 'All medicines already added.'}
                    </p>
                  ) : (
                    filteredMeds.map((med) => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => addItem(med)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/30 text-left transition-colors"
                      >
                        <Plus className="h-4 w-4 text-[#0284c7] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{med.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock: {med.currentStock} {med.unit}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowPicker(false); setSearchQuery(''); }}
                  className="w-full h-9 rounded-xl text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPicker(true)}
                disabled={availableMeds.length === 0}
                className="w-full h-10 rounded-xl border-dashed gap-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add more items
              </Button>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowOrderModal(false)}
                className="flex-1 h-11 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendOrder}
                disabled={orderItems.length === 0}
                className={cn(
                  'flex-1 h-11 rounded-xl font-bold gap-2',
                  orderMethod === 'whatsapp'
                    ? 'bg-[#10b981] hover:bg-[#10b981]/90'
                    : 'bg-[#020617] hover:bg-[#020617]/90'
                )}
              >
                {orderMethod === 'whatsapp' ? <MessageCircle className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                Send Order ({orderItems.length} items)
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add New Medicine Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Quick Add Medicine</DialogTitle>
              <DialogDescription>
                Add a new medicine to your inventory directly from the orders page.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <MedicineForm onSubmit={handleAddMedicine} submitLabel="Add Medicine" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
