const WHAPI_BASE_URL = process.env.WHAPI_BASE_URL || 'https://gate.whapi.cloud';
const WHAPI_API_KEY = process.env.WHAPI_API_KEY || '';

interface WhapiResponse {
  sent: boolean;
  message?: string;
  error?: string;
}

async function whapiRequest(endpoint: string, body: unknown): Promise<WhapiResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${WHAPI_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHAPI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Whapi error:', err);
      return { sent: false, error: err };
    }

    const data = await res.json();
    return { sent: true, message: data.message };
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === 'AbortError' ||
        (err.cause as Record<string, unknown>)?.code === 'UND_ERR_CONNECT_TIMEOUT');

    return {
      sent: false,
      error: isTimeout
        ? 'WhatsApp service is temporarily unreachable. Please try again later or use SMS instead.'
        : 'Failed to send WhatsApp message. Check your API configuration.',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTextMessage(to: string, text: string): Promise<WhapiResponse> {
  const sanitized = to.replace(/[^0-9]/g, '');
  return whapiRequest('/messages/text', {
    to: sanitized,
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

export async function sendAccountCreatedMessage(
  phone: string,
  name: string | null,
  otp: string
): Promise<WhapiResponse> {
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const text = `${greeting}\n\nYour SmartShelf account has been created! Use this OTP to log in:\n\n*${otp}*\n\nThis code expires in 5 minutes.\n\nDownload the app or visit the link to get started.`;
  return sendTextMessage(phone, text);
}
