'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, ShoppingCart, CheckCircle2, Loader2, Search, Pill, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import Select from 'react-select';

interface LineItem {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  maxStock: number;
  unit: string;
}

const UNIT_OPTIONS = ['piece', 'pack', 'carton', 'box', 'bottle', 'vial', 'sachet'];

export default function BulkSalePage() {
  const router = useRouter();
  const { medicines, isLoaded, loadData, recordBulkSales } = usePharmacyStore();
  const token = useAuthStore((s) => s.token);
  const [items, setItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const medicineOptions = useMemo(
    () =>
      medicines.map((m) => ({
        value: m.id,
        label: `${m.name} (Stock: ${m.currentStock} ${m.unit})`,
        stock: m.currentStock,
      })),
    [medicines]
  );

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), medicineId: '', medicineName: '', quantity: 1, maxStock: 0, unit: 'piece' },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItem(id: string, field: keyof LineItem, value: unknown) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, [field]: value };
        if (field === 'medicineId') {
          const med = medicines.find((m) => m.id === value);
          updated.medicineName = med?.name || '';
          updated.maxStock = med?.currentStock || 0;
          updated.quantity = 1;
          updated.unit = med?.unit || 'piece';
        }
        return updated;
      })
    );
  }

  async function handleSubmit() {
    const validItems = items.filter((i) => i.medicineId && i.quantity > 0);
    if (validItems.length === 0) return;

    const overStock = validItems.find((i) => i.quantity > i.maxStock);
    if (overStock) {
      setError(`Not enough stock for ${overStock.medicineName}: ${overStock.quantity} requested, ${overStock.maxStock} available.`);
      return;
    }

    setError('');
    setSaving(true);
    try {
      await recordBulkSales(validItems.map((i) => ({ medicineId: i.medicineId, quantity: i.quantity })));
      setDone(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record sale');
    } finally {
      setSaving(false);
    }
  }

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      borderRadius: '0.75rem',
      padding: '2px',
      borderColor: 'hsl(var(--border))',
      minHeight: '44px',
      fontSize: '0.875rem',
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: '0.75rem',
      overflow: 'hidden',
      zIndex: 50,
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? 'hsl(var(--primary) / 0.08)' : 'white',
      color: 'hsl(var(--foreground))',
      fontSize: '0.875rem',
    }),
  };

  const totalItems = items.filter((i) => i.medicineId && i.quantity > 0).length;
  const totalQuantity = items.reduce((s, i) => s + (i.medicineId ? i.quantity : 0), 0);

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center gap-3 entrance" style={{ animationDelay: '0ms' }}>
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl">
            <ArrowLeft className="h-6 w-6 text-muted-foreground" />
          </Button>
          <div>
            <h1 className="font-bold text-foreground text-2xl tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Bulk Sale
            </h1>
            <p className="text-sm text-[#64748b] font-medium mt-0.5">Record multiple sales at once</p>
          </div>
        </div>

        {!isLoaded ? (
          <div className="space-y-3 entrance" style={{ animationDelay: '50ms' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : done ? (
          <Card className="glass-card rounded-2xl border-0">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-16 w-16 text-[#10b981] mx-auto mb-4" />
              <p className="text-2xl font-black text-[#10b981] uppercase tracking-tight">Sale Complete</p>
              <p className="text-sm text-muted-foreground mt-2">
                {totalItems} items · {totalQuantity} units sold
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Record multiple sales at once. Select medicines and enter quantities.
            </p>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {items.length > 0 && (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <Card key={item.id} className="glass-card rounded-2xl border-0 entrance" style={{ animationDelay: `${idx * 60}ms` }}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Item {idx + 1}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                          Medicine
                        </Label>
                        <Select
                          options={medicineOptions}
                          value={
                            item.medicineId
                              ? { value: item.medicineId, label: item.medicineName }
                              : null
                          }
                          onChange={(opt) => {
                            if (opt) updateItem(item.id, 'medicineId', opt.value);
                          }}
                          placeholder="Search medicine..."
                          isSearchable
                          styles={selectStyles}
                          noOptionsMessage={() => 'No medicines found'}
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                          Quantity
                        </Label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))
                            }
                            className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-secondary/80 transition-colors"
                          >
                            −
                          </button>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={item.quantity}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v)) {
                                updateItem(item.id, 'quantity', Math.max(1, Math.min(v, item.maxStock || 9999)));
                              } else if (e.target.value === '') {
                                updateItem(item.id, 'quantity', 1);
                              }
                            }}
                            className="w-24 text-center text-lg font-bold rounded-xl"
                          />
                          <button
                            onClick={() =>
                              updateItem(item.id, 'quantity', Math.min(item.quantity + 1, item.maxStock || 1))
                            }
                            className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center text-lg font-bold text-muted-foreground hover:bg-secondary/80 transition-colors"
                          >
                            +
                          </button>
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                            className="h-10 rounded-xl border border-input bg-white px-3 text-xs font-semibold text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                          {item.maxStock > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              of {item.maxStock}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              onClick={addItem}
              className="w-full h-14 rounded-2xl border-dashed border-2 gap-2 text-base font-bold"
            >
              <Plus className="h-5 w-5" />
              Add Item
            </Button>

            {totalItems > 0 && (
              <Card className="glass-card rounded-2xl border-0 entrance" style={{ animationDelay: '200ms' }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {totalItems} item{totalItems !== 1 ? 's' : ''} · {totalQuantity} unit
                      {totalQuantity !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">Ready to record</p>
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 gap-2 text-base font-bold"
                  >
                    {saving ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-5 w-5" />
                    )}
                    {saving ? 'Recording...' : 'Complete Sale'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {items.length === 0 && (
              <Card className="glass-card rounded-3xl border-0 entrance" style={{ animationDelay: '50ms' }}>
                <CardContent className="p-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Pill className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-[#0f172a] font-bold text-lg">No items added</p>
                  <p className="text-xs text-[#64748b] mt-2 font-medium">Tap &ldquo;Add Item&rdquo; to start a bulk sale.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}
