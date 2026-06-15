'use client';
import { useEffect, useState } from 'react';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { computeRestockItems } from '@/lib/restock';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Smartphone, Plus, ShoppingCart, CheckCircle2, AlertCircle } from 'lucide-react';
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

export default function OrdersPage() {
  const { medicines, loadData, addMedicine } = usePharmacyStore();
  const token = useAuthStore((s) => s.token);
  const [sending, setSending] = useState<'whatsapp' | 'sms' | null>(null);
  const [sent, setSent] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const restockItems = computeRestockItems(medicines);

  async function handleAddMedicine(data: {
    name: string; image?: string | null; unit: string;
    currentStock: number; reorderThreshold: number; reorderQuantity: number;
    expiryDate: string; costPerUnit: number; isBig5: boolean;
  }) {
    const newMed: Medicine = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await addMedicine(newMed);
    setShowAddModal(false);
  }

  async function handleSendOrder(method: 'whatsapp' | 'sms') {
    setSending(method);
    setSent(false);
    try {
      const res = await fetch('/api/restock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ method }),
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
                  onClick={() => handleSendOrder('whatsapp')}
                  disabled={sending !== null}
                  className="flex-1 h-14 bg-[#10b981] hover:bg-[#10b981]/90 rounded-2xl shadow-lg shadow-emerald-50 text-white font-bold text-lg gap-2 border-none"
                >
                  <MessageCircle className="h-6 w-6" />
                  {sending === 'whatsapp' ? 'Sending...' : 'WhatsApp'}
                </Button>
                <Button
                  onClick={() => handleSendOrder('sms')}
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
