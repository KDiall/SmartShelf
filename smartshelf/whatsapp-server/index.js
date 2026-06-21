const express = require('express');
const bodyParser = require('body-parser');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { Server } = require('socket.io');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Load environment variables
require('dotenv').config();
// Also try to load from env.txt in current or parent dir for Render/Local flexibility
const envTxtPath = fs.existsSync(path.join(__dirname, 'env.txt')) 
  ? path.join(__dirname, 'env.txt') 
  : fs.existsSync(path.join(__dirname, '..', 'env.txt')) 
    ? path.join(__dirname, '..', 'env.txt') 
    : null;

if (envTxtPath) {
  console.log(`Loading environment from ${envTxtPath}`);
  require('dotenv').config({ path: envTxtPath });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Prevent the entire process from dying when Puppeteer/Chrome crashes.
// Render health checks will surface the issue, but the server stays up
// so the /init endpoint can be called again to retry.
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception (server continues):', err.message);
});

// Helpers for robust environment variable access (supporting your env.txt names)
const getChatbotId = () => (process.env.CLIENT_PHONE_E164 || process.env.WHATSAPP_CLIENT_PHONE || '').trim();
const getAgentUrl = () => (process.env.AGENT_URL || process.env.WHATSAPP_AGENT_URL || 'http://localhost:3001').trim().replace(/\/+$/, '');
const getAgentApiKey = () => (process.env.AGENT_API_KEY || process.env.WHATSAPP_API_KEY || '').trim();
const getApiKey = () => (process.env.API_KEY || process.env.WHATSAPP_API_KEY || '').trim();

// Where WhatsApp session data is stored. On hosts with an ephemeral filesystem
// (e.g. Render without a disk), point SESSION_DIR at a mounted persistent disk
// so the bot does not need re-linking after every restart/deploy.
const SESSION_DIR = (process.env.SESSION_DIR || path.join(__dirname, '.wwebjs_auth')).trim();
// Chromium binary for Puppeteer. The puppeteer Docker base image provides this
// via PUPPETEER_EXECUTABLE_PATH; fall back to Puppeteer's own resolution locally.
const CHROME_PATH = (process.env.PUPPETEER_EXECUTABLE_PATH || '').trim();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await gracefulShutdown();
  process.exit(0);
});

async function gracefulShutdown() {
  console.log('Starting graceful shutdown...');
  for (const [chatbotId] of sessionHealthChecks) {
    stopHealthMonitoring(chatbotId);
  }
  console.log('Shutdown complete');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io',
});

app.use(cors({
  origin: "*",
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

// API Key middleware for authentication
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const expectedApiKey = getApiKey();
  
  if (!expectedApiKey) {
    console.error('⚠️ API_KEY not configured in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  if (!apiKey || apiKey.trim() !== expectedApiKey) {
    console.warn(`🔒 ${process.env.BRAND_NAME || 'Server'}: Unauthorized API access attempt from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
};

const qrCodes = new Map();
const clients = new Map();
const sessionHealthChecks = new Map();
const HEALTH_CHECK_INTERVAL = 30000;

// Message queue helper functions
async function sendMessageDirectly(client, phoneE164, message) {
  try {
    const number = phoneE164.replace('+', '');
    const wid = await client.getNumberId(number);
    if (!wid || !wid._serialized) {
      throw new Error(`Number ${phoneE164} is not on WhatsApp`);
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    await client.sendMessage(wid._serialized, message, { sendSeen: false });
    return { success: true, jid: wid._serialized };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function ensureChatLoaded(client, jid) {
  try {
    return await client.getChatById(jid);
  } catch (error) {
    return null;
  }
}

async function safeSendMessage(client, to, text) {
  const resolvedTo = await resolveJID(client, to);
  await ensureChatLoaded(client, resolvedTo);
  try {
    await client.sendMessage(resolvedTo, text, { sendSeen: false });
    return { success: true, to: resolvedTo };
  } catch (error) {
    const msg = String(error?.message || '');
    if (msg.includes('markedUnread') || msg.includes('sendSeen')) {
      await new Promise(resolve => setTimeout(resolve, 800));
      await ensureChatLoaded(client, resolvedTo);
      await client.sendMessage(resolvedTo, text, { sendSeen: false });
      return { success: true, to: resolvedTo, retried: true };
    }
    throw error;
  }
}

async function resolveJID(client, identifier) {
  if (identifier.includes('@')) {
    try {
      const contact = await client.getContactById(identifier);
      if (contact && contact.id && contact.id._serialized) return contact.id._serialized;
      if (contact && contact.number) return `${contact.number}@c.us`;
    } catch (e) {}
    return identifier;
  }

  const cleaned = identifier.replace(/[^\d]/g, '');
  const naiveJID = `${cleaned}@c.us`;

  // Ask WhatsApp for the real serialized JID. WhatsApp's internal id can differ
  // from `${number}@c.us`, so blindly appending it only works for some numbers
  // (e.g. saved contacts). getNumberId resolves the correct JID for any number
  // that is actually registered on WhatsApp.
  try {
    const wid = await client.getNumberId(cleaned);
    if (wid && wid._serialized) {
      console.log(`[resolveJID] Resolved ${cleaned} -> ${wid._serialized}`);
      return wid._serialized;
    }
    console.log(`[resolveJID] getNumberId returned null for ${cleaned}; falling back to ${naiveJID}`);
  } catch (error) {
    console.warn(`[resolveJID] getNumberId failed for ${cleaned}: ${error.message || error}; falling back to ${naiveJID}`);
  }

  return naiveJID;
}

async function checkNetwork() {
  if (String(process.env.SKIP_NETWORK_CHECK).toLowerCase() === 'true') return true;
  return new Promise((resolve) => {
    const req = require('https').get('https://web.whatsapp.com', { timeout: 15000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function startHealthMonitoring(chatbotId, client) {
  if (sessionHealthChecks.has(chatbotId)) clearInterval(sessionHealthChecks.get(chatbotId));
  const healthCheck = setInterval(async () => {
    try {
      const state = await client.getState().catch(() => null);
      if (state && !['UNPAIRED', 'UNPAIRED_IDLE', 'CONFLICT', 'UNLAUNCHED'].includes(state)) {
        await client.sendPresenceAvailable().catch(() => {});
      }
    } catch (e) {}
  }, HEALTH_CHECK_INTERVAL);
  sessionHealthChecks.set(chatbotId, healthCheck);
}

function stopHealthMonitoring(chatbotId) {
  if (sessionHealthChecks.has(chatbotId)) {
    clearInterval(sessionHealthChecks.get(chatbotId));
    sessionHealthChecks.delete(chatbotId);
  }
}

async function clearSession(chatbotId) {
  try {
    const sessionPath = path.join(SESSION_DIR, `session-${String(chatbotId).replace(/[^A-Za-z0-9_-]/g, '_')}`);
    if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
  } catch (e) {}
}

async function initializeClient(retryCount = 0, maxRetries = 3) {
  const chatbotId = getChatbotId();
  if (!chatbotId) throw new Error('CLIENT_PHONE_E164 (or WHATSAPP_CLIENT_PHONE) is not set in .env');

  if (clients.has(chatbotId)) {
    const client = clients.get(chatbotId);
    try {
      if (client?.info?.wid?.user) return { status: 'connected', phoneNumber: client.info.wid.user };
      if (qrCodes.has(chatbotId)) return { status: 'awaiting_qr', qr: qrCodes.get(chatbotId)?.base64 };
    } catch (e) {
      clients.delete(chatbotId);
      if (client) await client.destroy().catch(() => {});
    }
  }

  if (!(await checkNetwork())) throw new Error('Network check failed');

  // Clean up Chrome lock files from previous runs to prevent
  // "profile appears to be in use by another Chrome process" errors.
  try {
    require('child_process').execSync('pkill -f chrome || true');
    // Also remove any Chrome lock files in the session directory
    const lockFiles = path.join(SESSION_DIR, 'SingletonLock');
    if (fs.existsSync(lockFiles)) fs.unlinkSync(lockFiles);
    const socketFile = path.join(SESSION_DIR, 'SingletonSocket');
    if (fs.existsSync(socketFile)) fs.unlinkSync(socketFile);
  } catch (e) {}

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
        '--user-data-dir=/tmp/chrome-user-data',
      ],
      ...(CHROME_PATH ? { executablePath: CHROME_PATH } : {}),
    },
  });

  client.on('qr', async (qr) => {
    console.log(`📱 QR code generated for ${chatbotId}`);
    const base64 = await qrcode.toDataURL(qr, { width: 512 });
    qrCodes.set(chatbotId, { qr, base64 });
    io.emit(`qr:${chatbotId}`, base64);
  });

  client.on('ready', async () => {
    console.log(`✅ Client ready for ${chatbotId}`);
    const phoneNumber = client.info?.wid?.user || 'unknown';
    startHealthMonitoring(chatbotId, client);
    try {
      await axios.post(getAgentUrl(), { chatbotId, event: 'connected', phoneNumber }, {
        headers: { 'x-api-key': getAgentApiKey() }
      });
      io.emit(`connected:${chatbotId}`, { phoneNumber });
      qrCodes.delete(chatbotId);
    } catch (e) {}
  });

  client.on('message', async (message) => {
    try {
      const chat = await message.getChat().catch(() => null);
      if (message.fromMe || chat?.isGroup || !message.from.endsWith('@c.us')) return;

      let mediaData = null;
      if (message.hasMedia) {
        const media = await message.downloadMedia().catch(() => null);
        if (media) mediaData = { mimetype: media.mimetype, filename: media.filename, data: media.data };
      }

      const jidLocal = message.from.split('@')[0];
      const webhookPayload = {
        chatbotId,
        event: 'message',
        message: message.body,
        from: message.from,
        email: `${jidLocal}@gmail.com`,
        phoneE164: `+${jidLocal}`,
        messageType: message.type,
        hasMedia: message.hasMedia,
        ...(mediaData && { media: mediaData })
      };

      const response = await axios.post(getAgentUrl(), webhookPayload, {
        headers: { 'x-api-key': getAgentApiKey() }
      });

      const data = response.data;
      let text = data.answer || data.message || data.response || data.reply || data.text || (typeof data === 'string' ? data : '');
      
      if (text.trim()) {
        await safeSendMessage(client, message.from, text);
      } else {
        await safeSendMessage(client, message.from, "Sorry, I couldn't generate a response.");
      }
    } catch (error) {
      console.error('Error processing message:', error.message);
    }
  });

  client.on('disconnected', async (reason) => {
    console.log(`❌ Disconnected for ${chatbotId}:`, reason);
    stopHealthMonitoring(chatbotId);
    clients.delete(chatbotId);
    qrCodes.delete(chatbotId);
    await client.destroy().catch(() => {});
    try {
      await axios.post(getAgentUrl(), { chatbotId, event: 'disconnected', reason }, {
        headers: { 'x-api-key': getAgentApiKey() }
      });
    } catch (e) {}
  });

  try {
    await client.initialize();
    clients.set(chatbotId, client);
    return { status: 'initialized' };
  } catch (error) {
    if (retryCount < maxRetries - 1) return initializeClient(retryCount + 1, maxRetries);
    throw error;
  }
}

app.post('/send-whatsapp', requireApiKey, async (req, res) => {
  const client = clients.get(getChatbotId());
  if (!client || !client.info?.wid?.user) {
    return res.status(503).json({ error: 'WhatsApp client not connected' });
  }

  const { phoneE164, message } = req.body;
  if (!phoneE164 || !message) {
    return res.status(400).json({ error: 'phoneE164 and message are required' });
  }

  console.log(`[send-whatsapp] Sending to ${phoneE164}`);
  try {
    const result = await safeSendMessage(client, phoneE164, message);
    console.log(`[send-whatsapp] Delivered to ${phoneE164}`, result.to);
    res.json({ status: 'sent', jid: result.to });
  } catch (err) {
    console.error(`[send-whatsapp] Failed to ${phoneE164}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/brand', (req, res) => {
  res.json({ name: process.env.BRAND_NAME || 'WhatsApp Client', tagline: process.env.BRAND_TAGLINE || 'AI Assistant' });
});

app.get('/connect/:phoneE164', (req, res) => {
  const { phoneE164 } = req.params;
  const chatbotId = getChatbotId();
  const normalize = (s) => s.replace(/\D/g, '');
  if (normalize(phoneE164) !== normalize(chatbotId)) {
    console.warn(`[connect] Mismatch: Rec=${phoneE164}, Exp=${chatbotId}`);
    return res.status(403).send('Invalid chatbot ID');
  }
  res.sendFile(path.join(__dirname, 'public', 'connect.html'));
});

app.post('/init', requireApiKey, async (req, res) => {
  try { res.json(await initializeClient()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/status', requireApiKey, (req, res) => {
  const client = clients.get(getChatbotId());
  res.json({ connected: !!client?.info?.wid?.user, phoneNumber: client?.info?.wid?.user || null });
});

app.post('/logout', requireApiKey, async (req, res) => {
  const chatbotId = getChatbotId();
  const client = clients.get(chatbotId);
  try {
    stopHealthMonitoring(chatbotId);
    if (client) {
      await client.logout().catch(() => {});
      await client.destroy().catch(() => {});
      clients.delete(chatbotId);
    }
    qrCodes.delete(chatbotId);
    await clearSession(chatbotId);
    res.json({ status: 'success', message: 'Logged out and session cleared' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/reset-session', requireApiKey, async (req, res) => {
  const chatbotId = getChatbotId();
  const client = clients.get(chatbotId);
  try {
    stopHealthMonitoring(chatbotId);
    if (client) {
      await client.destroy().catch(() => {});
      clients.delete(chatbotId);
    }
    qrCodes.delete(chatbotId);
    await clearSession(chatbotId);
    res.json({ status: 'success', message: 'Session data deleted. Server will restart with fresh state.' });
    // Small delay then exit to let Render restart the process
    setTimeout(() => process.exit(0), 1000);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

const PORT = process.env.PORT || 3700;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Connect UI: http://localhost:${PORT}/connect/${getChatbotId()}`);
});

// Initialize WhatsApp after a short delay so Render's health check
// succeeds immediately and the container is fully ready.
setTimeout(() => {
  initializeClient().catch(e => console.error('Init failed:', e.message));
}, 3000);
