import { NextResponse } from 'next/server';
import { sendOrderMessage } from '@/lib/whapi';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const { method } = await request.json();

  const medicines = await prisma.medicine.findMany();
  const lowStock = medicines.filter(
    (m: { currentStock: number; reorderThreshold: number }) => m.currentStock <= m.reorderThreshold
  );

  if (lowStock.length === 0) {
    return NextResponse.json({ message: 'No items to restock' });
  }

  const items = lowStock.map((m: { name: string; reorderQuantity: number; unit: string }) => ({
    name: m.name,
    quantity: m.reorderQuantity,
    unit: m.unit,
  }));

  const supplierPhone =
    process.env.NEXT_PUBLIC_WHATSAPP_SUPPLIER_NUMBER || '+23276000000';

  if (method === 'sms') {
    const lines = items.map((i) => `${i.name} x${i.quantity} ${i.unit}`);
    const text = `RESTOCK: ${lines.join(', ')}`;
    const result = await sendOrderMessage(supplierPhone, items);
    if (!result.sent) {
      return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Order sent via SMS', items });
  }

  const result = await sendOrderMessage(supplierPhone, items);

  if (!result.sent) {
    return NextResponse.json({ error: 'Failed to send order' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Order sent via WhatsApp', items });
}
