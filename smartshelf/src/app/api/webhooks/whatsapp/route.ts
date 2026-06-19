import { NextResponse } from 'next/server';
import { generateResponse } from '@/lib/rag';

export async function GET() {
  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key');
  if (process.env.WHATSAPP_API_KEY && apiKey !== process.env.WHATSAPP_API_KEY) {
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

  let reply: string;
  try {
    reply = await generateResponse(text);
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
