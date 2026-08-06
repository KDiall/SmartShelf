'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ShoppingCart, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

interface SaleCheckoutBarProps {
  itemCount: number;
  totalQuantity: number;
  total: number;
  saving?: boolean;
  onComplete: (amountPaid: number) => Promise<void> | void;
}

export function SaleCheckoutBar({ itemCount, totalQuantity, total, saving, onComplete }: SaleCheckoutBarProps) {
  const [open, setOpen] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const paid = parseFloat(amountPaid || '0');
  const change = Math.max(0, paid - total);
  const short = Math.max(0, total - paid);

  function openCheckout() {
    setAmountPaid('');
    setError('');
    setOpen(true);
  }

  async function handleConfirm() {
    if (paid < total) return;
    setError('');
    setSubmitting(true);
    try {
      await onComplete(paid);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete sale');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-30 entrance" style={{ animationDelay: '0ms' }}>
        <div className="mx-auto max-w-5xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="bg-white/95 backdrop-blur border border-border/60 rounded-2xl shadow-xl shadow-slate-900/10 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {itemCount} item{itemCount !== 1 ? 's' : ''} · {totalQuantity} unit{totalQuantity !== 1 ? 's' : ''}
              </p>
              <p className="text-2xl font-black text-[#0f172a] tracking-tight">{formatMoney(total)}</p>
            </div>
            <Button
              onClick={openCheckout}
              disabled={saving}
              className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 gap-2 text-base font-bold"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShoppingCart className="h-5 w-5" />
              )}
              Complete Sale
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) setOpen(false); }}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center">Complete Sale</DialogTitle>
            <DialogDescription className="text-center">
              Take payment and finish this transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 text-center">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Due</p>
              <p className="text-4xl font-black text-[#0f172a] tracking-tight">{formatMoney(total)}</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="amountPaid" className="text-sm font-semibold text-foreground">
                Amount Paid (Le)
              </label>
              <div className="flex gap-2">
                <Input
                  id="amountPaid"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => {
                    setAmountPaid(e.target.value.replace(/[^0-9.]/g, ''));
                    setError('');
                  }}
                  className="h-12 text-lg font-bold rounded-xl flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAmountPaid(String(total))}
                  className="h-12 rounded-xl px-4 text-sm font-bold"
                >
                  Exact
                </Button>
              </div>
            </div>

            {paid >= total ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-700">Change</span>
                <span className="text-2xl font-black text-emerald-700 tracking-tight">{formatMoney(change)}</span>
              </div>
            ) : (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm font-bold text-amber-700">
                  {short > 0 ? `Short by ${formatMoney(short)}` : 'Enter the amount paid'}
                </span>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              onClick={handleConfirm}
              disabled={submitting || paid < total}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 gap-2 text-base font-bold"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              {submitting ? 'Recording...' : 'Confirm Sale'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
