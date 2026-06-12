'use client';
import { useEffect, useState } from 'react';
import { usePharmacyStore } from '@/store/pharmacy';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { RestockList } from '@/components/restock-list';
import { computeRestockItems } from '@/lib/restock';

export default function RestockPage() {
  const { medicines, loadData } = usePharmacyStore();
  const token = useAuthStore((s) => s.token);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const restockItems = computeRestockItems(medicines);

  async function handleSendOrder() {
    setSending(true);
    try {
      const res = await fetch('/api/restock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to send order');
      }

      const data = await res.json();
      alert('Order sent via WhatsApp!');
    } catch (err) {
      alert('Failed to send order. Check console for details.');
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthGuard>
      <h1 className="text-xl font-bold mb-4">Restock Assistant</h1>
      <RestockList
        items={restockItems}
        onSendOrder={handleSendOrder}
        sending={sending}
      />
    </AuthGuard>
  );
}
