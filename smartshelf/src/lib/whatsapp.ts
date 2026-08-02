import { createHmac } from 'crypto';

const OPENWA_URL = (process.env.OPENWA_URL || 'http://localhost:2785').trim().replace(/\/+$/, '');
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || '';
const OPENWA_WEBHOOK_SECRET = process.env.OPENWA_WEBHOOK_SECRET || '';
const OPENWA_WEBHOOK_URL = process.env.OPENWA_WEBHOOK_URL || '';
const BOT_SESSION_NAME = 'smartshelf-bot';

export interface SendResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

export interface BotStatus {
  status: 'ready' | 'qr_ready' | 'initializing' | 'authenticating' | 'disconnected' | 'none' | 'failed' | string;
  phone?: string | null;
  error?: string;
}

// Cached session ID so we don't list sessions on every send
let cachedSessionId: string | null = null;

async function openwaRequest(
  endpoint: string,
  body?: unknown,
  method: 'GET' | 'POST' | 'DELETE' = 'GET'
): Promise<{ ok: boolean; status: number; data?: unknown; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(`${OPENWA_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': OPENWA_API_KEY,
      },
      ...(body !== undefined ? { body: JSON.stringify(body), signal: controller.signal } : { signal: controller.signal }),
    });
    const text = await res.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) : undefined; } catch { data = undefined; }
    return { ok: res.ok, status: res.status, data, text };
  } catch (err) {
    return { ok: false, status: 0, text: err instanceof Error ? err.message : 'unknown error' };
  } finally {
    clearTimeout(timer);
  }
}

// Find the bot session by name across all OpenWA sessions
async function findBotSession(): Promise<string | null> {
  const result = await openwaRequest('/api/sessions?limit=50', undefined, 'GET');
  if (!result.ok) return null;
  const data = result.data as { items?: { id: string; name: string }[] };
  const match = data?.items?.find((s) => s.name === BOT_SESSION_NAME);
  return match?.id ?? null;
}

// Returns the bot session ID, using cache and falling back to a live lookup
async function getBotSessionId(): Promise<string | null> {
  if (cachedSessionId) {
    const check = await openwaRequest(`/api/sessions/${cachedSessionId}`, undefined, 'GET');
    if (check.ok) return cachedSessionId;
    cachedSessionId = null;
  }
  cachedSessionId = await findBotSession();
  return cachedSessionId;
}

// Get the bot's current status for the admin dashboard
export async function getBotStatus(): Promise<BotStatus> {
  const sessionId = await getBotSessionId();
  if (!sessionId) return { status: 'none' };

  const result = await openwaRequest(`/api/sessions/${sessionId}`, undefined, 'GET');
  if (!result.ok) {
    return { status: 'disconnected', error: `OpenWA error (${result.status})` };
  }
  const d = result.data as { status?: string; phone?: string | null };
  return { status: d?.status ?? 'disconnected', phone: d?.phone ?? null };
}

// Get the QR code PNG (base64 data URL) — only works when status is qr_ready
export async function getBotQR(): Promise<{ qr: string | null; error?: string }> {
  const sessionId = await getBotSessionId();
  if (!sessionId) return { qr: null, error: 'No bot session exists. Start the bot first.' };

  const result = await openwaRequest(`/api/sessions/${sessionId}/qr`, undefined, 'GET');
  if (!result.ok) return { qr: null, error: `QR not ready (${result.status})` };
  const d = result.data as { qr?: string };
  return { qr: d?.qr ?? null };
}

// Register the SmartShelf webhook on OpenWA for a session (skips if already registered)
async function ensureWebhookRegistered(sessionId: string): Promise<void> {
  if (!OPENWA_WEBHOOK_URL) return;

  // List existing webhooks to avoid duplicates
  const list = await openwaRequest(`/api/sessions/${sessionId}/webhooks`, undefined, 'GET');
  if (list.ok) {
    const existing = (list.data as { items?: { url: string }[] })?.items ?? [];
    if (existing.some((w) => w.url === OPENWA_WEBHOOK_URL)) return; // already registered
  }

  const body: Record<string, unknown> = {
    url: OPENWA_WEBHOOK_URL,
    events: ['message.received'],
    active: true,
  };
  if (OPENWA_WEBHOOK_SECRET) body.secret = OPENWA_WEBHOOK_SECRET;

  const result = await openwaRequest(`/api/sessions/${sessionId}/webhooks`, body, 'POST');
  if (!result.ok) {
    console.error(`[WhatsApp] Failed to register webhook (${result.status}): ${result.text}`);
  } else {
    console.log(`[WhatsApp] Webhook registered → ${OPENWA_WEBHOOK_URL}`);
  }
}

// Create and start the bot session (super_admin action)
export async function startBotSession(): Promise<{ ok: boolean; sessionId?: string; error?: string }> {
  let sessionId = await getBotSessionId();

  if (!sessionId) {
    // Create the session
    const created = await openwaRequest('/api/sessions', { name: BOT_SESSION_NAME, engine: 'whatsapp-web.js' }, 'POST');
    if (!created.ok) {
      return { ok: false, error: `Failed to create bot session (${created.status}): ${created.text}` };
    }
    sessionId = (created.data as { id?: string })?.id ?? null;
    if (!sessionId) return { ok: false, error: 'No session ID returned from OpenWA' };
    cachedSessionId = sessionId;
  }

  // Start it (if it's not already running)
  const started = await openwaRequest(`/api/sessions/${sessionId}/start`, {}, 'POST');
  if (!started.ok && started.status !== 409) {
    // 409 = already started, that's fine
    return { ok: false, error: `Failed to start session (${started.status}): ${started.text}` };
  }

  // Auto-register the SmartShelf webhook so inbound messages reach us
  await ensureWebhookRegistered(sessionId);

  return { ok: true, sessionId };
}

// Logout and fully remove the bot session
export async function logoutBotSession(): Promise<{ ok: boolean; error?: string }> {
  const sessionId = await getBotSessionId();
  if (!sessionId) return { ok: true };

  await openwaRequest(`/api/sessions/${sessionId}/logout`, {}, 'POST');
  const del = await openwaRequest(`/api/sessions/${sessionId}`, undefined, 'DELETE');
  cachedSessionId = null;

  if (!del.ok && del.status !== 404) {
    return { ok: false, error: `Delete failed (${del.status}): ${del.text}` };
  }
  return { ok: true };
}

// Send a text message from the bot to a phone number
export async function sendTextMessage(to: string, text: string): Promise<SendResult> {
  const sessionId = await getBotSessionId();
  if (!sessionId) return { sent: false, error: 'Bot session not running. Start the bot in Settings.' };

  // OpenWA chatId: digits only + @c.us
  const chatId = to.replace(/[^0-9]/g, '') + '@c.us';

  const result = await openwaRequest(
    `/api/sessions/${sessionId}/messages/send-text`,
    { chatId, text },
    'POST'
  );

  if (!result.ok) {
    console.error(`[WhatsApp] Send failed (${result.status}): ${result.text}`);
    return {
      sent: false,
      error: result.status === 0
        ? 'WhatsApp bot is unreachable. Check OpenWA is running.'
        : `Send error (${result.status}): ${result.text || 'unknown'}`,
    };
  }

  const d = result.data as { messageId?: string };
  return { sent: true, messageId: d?.messageId };
}

// Send a restock order to the supplier via the bot
export async function sendOrderMessage(
  supplierPhone: string,
  items: { name: string; quantity: number; unit: string }[],
  pharmacyName?: string
): Promise<SendResult> {
  const header = pharmacyName ? `🏥 Pharmacy: ${pharmacyName}\n\n` : '';
  const lines = items.map((i) => `- ${i.name} x${i.quantity} ${i.unit}`);
  const text = `*SmartShelf Restock Order*\n\n${header}${lines.join('\n')}\n\nPlease confirm availability.`;
  console.log(`[WhatsApp] Sending restock order to ${supplierPhone}`);
  return sendTextMessage(supplierPhone, text);
}

// Send a low-stock alert to a pharmacy admin
export async function sendLowStockAlert(
  adminPhone: string,
  items: { name: string; currentStock: number; reorderThreshold: number; unit: string }[],
  pharmacyName: string
): Promise<SendResult> {
  const lines = items.map((i) => `- *${i.name}*: ${i.currentStock} ${i.unit} (threshold: ${i.reorderThreshold})`);
  const text = `⚠️ *Low Stock Alert — ${pharmacyName}*\n\nThe following items need restocking:\n\n${lines.join('\n')}\n\nLog in to SmartShelf to place an order.`;
  return sendTextMessage(adminPhone, text);
}

// Verify an inbound OpenWA webhook.
// If no OPENWA_WEBHOOK_SECRET is configured (webhook created without a secret),
// OpenWA does not send X-OpenWA-Signature — so we skip HMAC and trust the
// presence of OpenWA's own delivery headers as a basic sanity check.
export function verifyOpenWAWebhook(rawBody: string, signature: string, headers?: Record<string, string | null>): boolean {
  if (!OPENWA_WEBHOOK_SECRET) {
    // No secret configured — verify at least that this looks like an OpenWA delivery
    const hasOpenWAHeader = headers?.['x-openwa-event'] || headers?.['x-openwa-delivery-id'];
    return !!hasOpenWAHeader;
  }

  if (!signature) return false;

  const expected = 'sha256=' + createHmac('sha256', OPENWA_WEBHOOK_SECRET).update(rawBody).digest('hex');

  // Timing-safe comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return require('crypto').timingSafeEqual(sigBuf, expBuf);
}
