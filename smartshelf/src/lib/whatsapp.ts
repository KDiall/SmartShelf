const WHATSAPP_SERVER_URL = (process.env.WHATSAPP_SERVER_URL || process.env.WHAPI_BASE_URL || 'http://localhost:3700').replace(/\/$/, '');
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || process.env.WHAPI_API_KEY || '';

interface WhatsAppResponse {
  sent: boolean;
  message?: string;
  error?: string;
}

interface WhatsAppServerStatus {
  connected?: boolean;
  phoneNumber?: string | null;
  error?: string;
}

async function whatsappRequest(
  endpoint: string,
  body: unknown,
  method: 'POST' | 'GET' = 'POST'
): Promise<{ ok: boolean; status: number; data?: unknown; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  const url = `${WHATSAPP_SERVER_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WHATSAPP_API_KEY,
      },
      ...(method === 'POST'
        ? { body: JSON.stringify(body), signal: controller.signal }
        : { signal: controller.signal }),
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }

    return { ok: res.ok, status: res.status, data, text };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return { ok: false, status: 0, text: message };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTextMessage(to: string, text: string): Promise<WhatsAppResponse> {
  const phoneE164 = '+' + to.replace(/[^0-9]/g, '');

  console.log(`[WhatsApp] Sending message to ${phoneE164}`);
  const result = await whatsappRequest('/send-whatsapp', {
    phoneE164,
    message: text,
  });

  if (!result.ok) {
    console.error(`[WhatsApp] Send failed (${result.status}): ${result.text}`, result.data);
    const isTimeout = result.status === 0;
    return {
      sent: false,
      error: isTimeout
        ? 'WhatsApp service is temporarily unreachable. Please try again later.'
        : `WhatsApp server error (${result.status}): ${result.text || 'unknown'}`,
    };
  }

  console.log(`[WhatsApp] Message accepted`, result.data);
  return { sent: true, message: (result.data as { status?: string })?.status || 'success' };
}

export async function getWhatsAppStatus(): Promise<WhatsAppServerStatus> {
  const result = await whatsappRequest('/status', undefined, 'GET');
  if (!result.ok) {
    return {
      connected: false,
      error: result.status === 0 ? 'WhatsApp server unreachable' : `Server error ${result.status}: ${result.text}`,
    };
  }
  const data = (result.data as { connected?: boolean; phoneNumber?: string | null }) || {};
  return { connected: !!data.connected, phoneNumber: data.phoneNumber || null };
}

export async function reconnectWhatsAppServer(): Promise<{ success: boolean; error?: string }> {
  const result = await whatsappRequest('/init', {}, 'POST');
  if (!result.ok) {
    return {
      success: false,
      error: result.status === 0 ? 'WhatsApp server unreachable' : `Init failed (${result.status}): ${result.text}`,
    };
  }
  return { success: true };
}

export async function sendOtpMessage(phone: string, otp: string): Promise<WhatsAppResponse> {
  const text = `Your SmartShelf verification code is: ${otp}\n\nThis code expires in 5 minutes.`;
  return sendTextMessage(phone, text);
}

export async function sendOrderMessage(
  supplierPhone: string,
  items: { name: string; quantity: number; unit: string }[]
): Promise<WhatsAppResponse> {
  const lines = items.map((i) => `- ${i.name} x${i.quantity} ${i.unit}`);
  const text = `*SmartShelf Restock Order*\n\n${lines.join('\n')}\n\nPlease confirm availability.`;
  return sendTextMessage(supplierPhone, text);
}

export async function sendAccountCreatedMessage(
  phone: string,
  name: string | null,
  otp: string
): Promise<WhatsAppResponse> {
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const text = `${greeting}\n\nYour SmartShelf account has been created! Use this OTP to log in:\n\n*${otp}*\n\nThis code expires in 5 minutes.`;
  return sendTextMessage(phone, text);
}
