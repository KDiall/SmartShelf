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

  // The new server sends a single message event per request
  if (payload.event !== 'message') {
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
  try {
    const sender = senderPhone
      ? await prisma.user.findUnique({ where: { phone: senderPhone }, select: { pharmacyId: true } })
      : null;
    pharmacyId = sender?.pharmacyId ?? undefined;
    console.log(`Sender phone=${senderPhone} pharmacyId=${pharmacyId || 'none (super_admin or unknown)'}`);
  } catch (err) {
    console.error('Failed to look up sender pharmacy:', err);
    // fall through — generateResponse will see all data if pharmacyId is undefined
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
