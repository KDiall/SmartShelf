const WHATSAPP_SERVER_URL = process.env.WHAPI_BASE_URL || 'http://localhost:3700';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || process.env.WHAPI_API_KEY || '';

interface WhapiResponse {
  sent: boolean;
  message?: string;
  error?: string;
}

async function whapiRequest(endpoint: string, body: unknown): Promise<WhapiResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(`${WHATSAPP_SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WHATSAPP_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('WhatsApp server error:', err);
      return { sent: false, error: err };
    }

    const data = await res.json();
    return { sent: true, message: data.status || 'success' };
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === 'AbortError' ||
        (err.cause as Record<string, unknown>)?.code === 'UND_ERR_CONNECT_TIMEOUT');

    return {
      sent: false,
      error: isTimeout
        ? 'WhatsApp service is temporarily unreachable. Please try again later.'
        : 'Failed to send WhatsApp message. Check your WhatsApp server configuration.',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTextMessage(to: string, text: string): Promise<WhapiResponse> {
  // Ensure number is in E.164 format (+XXXXXXXXXXX)
  let phoneE164 = to.replace(/[^0-9]/g, '');
  if (!phoneE164.startsWith('+')) {
    phoneE164 = `+${phoneE164}`;
  }

  return whapiRequest('/send-whatsapp', {
    phoneE164: phoneE164,
    message: text,
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
