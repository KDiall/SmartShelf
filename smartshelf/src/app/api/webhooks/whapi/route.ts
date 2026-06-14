import { NextResponse } from 'next/server';
import { generateResponse } from '@/lib/rag';

const WHAPI_BASE_URL = process.env.WHAPI_BASE_URL || 'https://gate.whapi.cloud';
const WHAPI_API_KEY = process.env.WHAPI_API_KEY || '';

export async function POST(request: Request) {
  const body = await request.json();

  const messages = body.messages;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ received: true });
  }

  for (const msg of messages) {
    if (msg.type !== 'text' || msg.from_me) continue;

    const incomingNumber = msg.from?.replace(/[^0-9]/g, '');
    const text = msg.text?.body || '';

    if (!text || !incomingNumber) continue;

    try {
      const response = await generateResponse(text);

      await fetch(`${WHAPI_BASE_URL}/messages/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WHAPI_API_KEY}`,
        },
        body: JSON.stringify({
          to: incomingNumber,
          body: response,
        }),
      });
    } catch (err) {
      console.error('Failed to process message:', err);
    }
  }

  return NextResponse.json({ received: true });
}
