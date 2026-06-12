const WHAPI_BASE_URL = process.env.WHAPI_BASE_URL || 'https://gate.whapi.cloud';
const WHAPI_API_KEY = process.env.WHAPI_API_KEY || '';

interface WhapiResponse {
  sent: boolean;
  message?: string;
  error?: string;
}

async function whapiRequest(endpoint: string, body: unknown): Promise<WhapiResponse> {
  const res = await fetch(`${WHAPI_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WHAPI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Whapi error:', err);
    return { sent: false, error: err };
  }

  const data = await res.json();
  return { sent: true, message: data.message };
}

export async function sendTextMessage(to: string, text: string): Promise<WhapiResponse> {
  return whapiRequest('/messages/text', {
    to,
    body: text,
  });
}

export async function sendOtpMessage(phone: string, otp: string): Promise<WhapiResponse> {
  const text = `Your SmartShelf verification code is: ${otp}\n\nThis code expires in 5 minutes.`;
  return sendTextMessage(phone, text);
}

export async function sendOrderMessage(
  supplierPhone: string,
  items: { name: string; quantity: number; unit: string }[]
): Promise<WhapiResponse> {
  const lines = items.map((i) => `- ${i.name} x${i.quantity} ${i.unit}`);
  const text = `*SmartShelf Restock Order*\n\n${lines.join('\n')}\n\nPlease confirm availability.`;
  return sendTextMessage(supplierPhone, text);
}
