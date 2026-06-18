import { NextResponse } from 'next/server';
import { generateResponse } from '@/lib/rag';

const WHAPI_BASE_URL = process.env.WHAPI_BASE_URL || 'https://gate.whapi.cloud';
const WHAPI_API_KEY = process.env.WHAPI_API_KEY || '';

async function sendReply(to: string, body: string): Promise<string | null> {
  if (!WHAPI_API_KEY) return 'WHAPI_API_KEY not set';
  try {
    const res = await fetch(`${WHAPI_BASE_URL}/messages/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHAPI_API_KEY}`,
      },
      body: JSON.stringify({ to, body }),
    });
    if (!res.ok) {
      const err = await res.text();
      return `Whapi reply failed (${res.status}): ${err}`;
    }
    return null;
  } catch (err) {
    return `Whapi reply error: ${err instanceof Error ? err.message : err}`;
  }
}

export async function GET() {
  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ received: true });
  }

  const raw = JSON.stringify(body).slice(0, 500);
  console.log('Webhook received:', raw);

  if (!WHAPI_API_KEY) {
    console.error('WHAPI_API_KEY is not set');
    return NextResponse.json({ received: true });
  }

  const messages = body.messages;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ received: true });
  }

  for (const msg of messages) {
    if (msg.type !== 'text' || msg.from_me) continue;

    const incomingNumber = msg.from?.replace(/[^0-9]/g, '');
    const text = msg.text?.body || '';

    if (!text || !incomingNumber) continue;

    console.log(`Processing msg from ${incomingNumber}: "${text.slice(0, 100)}"`);

    let reply: string;
    try {
      reply = await generateResponse(text);
      console.log(`AI response: "${reply.slice(0, 100)}"`);
    } catch (err) {
      reply = `Server error: ${err instanceof Error ? err.message : 'unknown error'}`;
      console.error('generateResponse threw:', err);
    }

    const errMsg = await sendReply(incomingNumber, reply);
    if (errMsg) {
      console.error(errMsg);
    } else {
      console.log(`Reply sent to ${incomingNumber}`);
    }
  }

  return NextResponse.json({ received: true });
}
