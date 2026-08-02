import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';
import { generateResponse } from '@/lib/rag';
import { sendTextMessage, verifyOpenWAWebhook } from '@/lib/whatsapp';

export async function GET() {
  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Verify the request came from OpenWA
  const signature = request.headers.get('x-openwa-signature') || '';
  const headers = {
    'x-openwa-event': request.headers.get('x-openwa-event'),
    'x-openwa-delivery-id': request.headers.get('x-openwa-delivery-id'),
  };
  if (!verifyOpenWAWebhook(rawBody, signature, headers)) {
    console.error('[Webhook] Invalid HMAC signature — rejecting');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = (payload as { event?: string }).event;
  console.log(`[Webhook] OpenWA event: ${event}`);

  // Only handle inbound messages from others (skip our own sends and non-message events)
  if (event !== 'message.received') {
    return NextResponse.json({ received: true });
  }

  const data = (payload as { data?: { message?: { body?: string; from?: string; fromMe?: boolean; chatId?: string } } }).data;
  const message = data?.message;

  if (!message || message.fromMe) {
    return NextResponse.json({ received: true });
  }

  const text = message.body?.trim() || '';
  const from = message.from || ''; // e.g. "23276123456@c.us"
  const chatId = message.chatId || from;

  if (!text || !from) {
    return NextResponse.json({ received: true });
  }

  console.log(`[Webhook] Message from ${from}: "${text.slice(0, 100)}"`);

  // Resolve the sender's pharmacy by their phone number
  const senderPhone = normalizePhone(from.split('@')[0]);
  let pharmacyId: string | undefined;
  let senderFound = false;

  try {
    let sender: { pharmacyId: string | null; role: string } | null = null;

    if (senderPhone) {
      sender = await prisma.user.findUnique({
        where: { phone: senderPhone },
        select: { pharmacyId: true, role: true },
      });
    }

    // Fallback: match by trailing digits (handles international prefix mismatches)
    if (!sender) {
      const rawDigits = from.split('@')[0].replace(/\D/g, '');
      const users = await prisma.user.findMany({
        select: { phone: true, pharmacyId: true, role: true },
      });
      sender = users.find((u) => rawDigits.endsWith(u.phone.replace(/\D/g, ''))) ?? null;
    }

    senderFound = !!sender;
    pharmacyId = sender?.pharmacyId ?? undefined;
    console.log(`[Webhook] Resolved phone=${senderPhone} → pharmacyId=${pharmacyId || 'none'}`);
  } catch (err) {
    console.error('[Webhook] Sender lookup failed:', err);
  }

  if (!senderFound) {
    console.log(`[Webhook] Unknown sender: ${senderPhone} — rejecting`);
    await sendTextMessage(
      from.split('@')[0],
      'You are not registered with SmartShelf. Contact your pharmacy admin to create your account.'
    );
    return NextResponse.json({ received: true });
  }

  // Generate AI response scoped to the sender's pharmacy
  let reply: string;
  try {
    reply = await generateResponse(text, pharmacyId);
    console.log(`[Webhook] AI reply: "${reply.slice(0, 100)}"`);
  } catch (err) {
    reply = 'Sorry, I hit an error processing your message. Please try again.';
    console.error('[Webhook] generateResponse error:', err);
  }

  // Send the reply back via the bot session (OpenWA does not read our response body)
  await sendTextMessage(from.split('@')[0], reply);

  return NextResponse.json({ received: true });
}
