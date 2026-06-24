import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';
import { generateResponse } from '@/lib/rag';

export async function GET(request: Request) {
  const expectedKey = process.env.WHATSAPP_API_KEY;
  const apiKey = request.headers.get('x-api-key');

  if (!expectedKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  const expectedKey = process.env.WHATSAPP_API_KEY;
  const apiKey = request.headers.get('x-api-key');

  if (!expectedKey) {
    console.error('WHATSAPP_API_KEY is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (!apiKey || apiKey !== expectedKey) {
    console.error('Unauthorized webhook attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('Webhook received:', JSON.stringify(payload).slice(0, 500));

  // Handle non-message events (connected, disconnected)
  if (payload.event !== 'message') {
    console.log(`[Webhook] WhatsApp ${payload.event} event:`, JSON.stringify(payload));
    return NextResponse.json({ received: true });
  }

  const text = payload.message || '';
  const from = payload.from; // This is the JID (e.g. 123456789@c.us)

  if (!text || !from) {
    return NextResponse.json({ received: true });
  }

  console.log(`Processing msg from ${from}: "${text.slice(0, 100)}"`);

  // Resolve sender's pharmacy from their phone number
  const senderPhone = normalizePhone(from.split('@')[0]);
  let pharmacyId: string | undefined;
  let senderFound = false;
  try {
    let sender: { pharmacyId: string | null; role: string } | null = null;

    // 1. Exact match by full phone number
    if (senderPhone) {
      sender = await prisma.user.findUnique({
        where: { phone: senderPhone },
        select: { pharmacyId: true, role: true },
      });
    }

    // 2. Fallback: try matching last digits (handles demo short codes like 7000
    //    when the user texts from a real number like +23276000000)
    if (!sender && senderPhone) {
      const rawDigits = from.split('@')[0].replace(/\D/g, '');
      const users = await prisma.user.findMany({
        select: { phone: true, pharmacyId: true, role: true },
      });
      sender = users.find((u) => rawDigits.endsWith(u.phone.replace(/\D/g, ''))) ?? null;
    }

    senderFound = !!sender;
    pharmacyId = sender?.pharmacyId ?? undefined;
    console.log(`Sender phone=${senderPhone} pharmacyId=${pharmacyId || 'none'} role=${sender?.role || 'unknown'}`);
  } catch (err) {
    console.error('Failed to look up sender pharmacy:', err);
  }

  if (!senderFound) {
    // Allow super admin via env var even if not in DB
    const superAdminPhone = normalizePhone(
      process.env.NEXT_PUBLIC_WHATSAPP_SUPPLIER_NUMBER || ''
    );
    if (senderPhone && superAdminPhone && senderPhone === superAdminPhone) {
      pharmacyId = undefined;
      senderFound = true;
      console.log('Super admin identified via env var fallback');
    }
  }

  if (!senderFound) {
    console.log(`Rejecting unknown sender: ${senderPhone}`);
    return NextResponse.json({
      answer: 'You are not registered with any pharmacy. Contact your pharmacy admin to create your account.',
      to: from,
    });
  }

  let reply: string;
  try {
    reply = await generateResponse(text, pharmacyId);
    console.log(`AI response: "${reply.slice(0, 100)}"`);
  } catch (err) {
    reply = `Server error: ${err instanceof Error ? err.message : 'unknown error'}`;
    console.error('generateResponse threw:', err);
  }

  // The local WhatsApp server expects the reply in the response
  return NextResponse.json({ 
    answer: reply,
    to: from 
  });
}
