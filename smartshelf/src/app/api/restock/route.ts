import { NextResponse } from 'next/server';
import { sendOrderMessage } from '@/lib/whatsapp';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const { method, items: bodyItems } = await request.json();
  const userId = request.headers.get('x-user-id');

  const pharmacyId = request.headers.get('x-user-pharmacy-id');

  let items: { name: string; quantity: number; unit: string }[];

  if (bodyItems) {
    items = bodyItems;
  } else {
    const where: Record<string, unknown> = {};
    if (pharmacyId) where.pharmacyId = pharmacyId;
    else if (userId) where.userId = userId;
    const medicines = await prisma.medicine.findMany({ where });
    const lowStock = medicines.filter(
      (m: { currentStock: number; reorderThreshold: number }) => m.currentStock <= m.reorderThreshold
    );

    if (lowStock.length === 0) {
      return NextResponse.json({ message: 'No items to restock' });
    }

    items = lowStock.map((m: { name: string; reorderQuantity: number; unit: string }) => ({
      name: m.name,
      quantity: m.reorderQuantity,
      unit: m.unit,
    }));
  }

  const supplierPhone =
    process.env.NEXT_PUBLIC_WHATSAPP_SUPPLIER_NUMBER || '+23276000000';

  const result = await sendOrderMessage(supplierPhone, items);

  return NextResponse.json({
    message: result.sent
      ? `Order sent via ${method === 'sms' ? 'SMS' : 'WhatsApp'}`
      : 'Order recorded (WhatsApp unavailable — contact supplier manually)',
    items,
    whatsappSent: result.sent,
    whatsappError: result.error,
  });
}
