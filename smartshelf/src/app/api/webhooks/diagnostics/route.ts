import { NextResponse } from 'next/server';

import { getWhatsAppStatus } from '@/lib/whatsapp';

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.WHATSAPP_API_KEY || process.env.WHAPI_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    console.error('Unauthorized diagnostics attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envVars = {
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    WHATSAPP_API_KEY: !!(process.env.WHATSAPP_API_KEY || process.env.WHAPI_API_KEY),
    WHATSAPP_SERVER_URL: process.env.WHATSAPP_SERVER_URL || process.env.WHAPI_BASE_URL || 'http://localhost:3700',
    DATABASE_URL: !!process.env.DATABASE_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    GENELINE_X_API_KEY: !!process.env.GENELINE_X_API_KEY,
    GENELINE_X_NAMESPACE: process.env.GENELINE_X_NAMESPACE || 'not set',
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'not set',
    UPLOADTHING_TOKEN: !!process.env.UPLOADTHING_TOKEN,
  };

  let openAiTest = 'not tested';
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const models = (data.data || []).map((m: { id: string }) => m.id);
        const hasGpt4oMini = models.some((m: string) => m.includes('gpt-4o-mini'));
        openAiTest = hasGpt4oMini
          ? 'OK (key valid, gpt-4o-mini available)'
          : 'OK (key valid, but gpt-4o-mini NOT found — check model access)';
      } else {
        const err = await res.text();
        openAiTest = `FAILED (${res.status}): ${err.slice(0, 200)}`;
      }
    } catch (err) {
      openAiTest = `ERROR: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  }

  let whatsAppTest = 'not tested';
  try {
    const status = await getWhatsAppStatus();
    whatsAppTest = status.connected
      ? `OK (connected: ${status.phoneNumber || 'unknown'})`
      : `FAILED: ${status.error || 'not connected'}`;
  } catch (err) {
    whatsAppTest = `ERROR: ${err instanceof Error ? err.message : 'unknown'}`;
  }

  return NextResponse.json({
    environment: process.env.NODE_ENV || 'unknown',
    envVarsSet: envVars,
    openAiTest,
    whatsAppTest,
    advice: buildAdvice(envVars, openAiTest, whatsAppTest),
  });
}

function buildAdvice(
  envVars: Record<string, boolean | string>,
  openAiTest: string,
  whatsAppTest: string
): string[] {
  const advice: string[] = [];

  if (!envVars.OPENAI_API_KEY) {
    advice.push('OPENAI_API_KEY is NOT set. Add it to Vercel environment variables.');
  } else if (openAiTest.startsWith('FAILED') || openAiTest.includes('not found')) {
    advice.push('OpenAI key issue: ' + openAiTest);
  }

  if (!envVars.WHATSAPP_API_KEY) {
    advice.push('WHATSAPP_API_KEY is NOT set. Add it to environment variables.');
  }

  if (!envVars.DATABASE_URL) {
    advice.push('DATABASE_URL is NOT set. Add it to environment variables.');
  }

  if (!envVars.JWT_SECRET) {
    advice.push('JWT_SECRET is NOT set. Add it to environment variables.');
  }

  if (whatsAppTest.startsWith('FAILED') || whatsAppTest.startsWith('ERROR')) {
    advice.push('WhatsApp server issue: ' + whatsAppTest);
  }

  if (envVars.OPENAI_API_KEY && envVars.WHATSAPP_API_KEY && !whatsAppTest.startsWith('FAILED') && !whatsAppTest.startsWith('ERROR')) {
    advice.push(
      'Both OpenAI and WhatsApp keys are set. Verify the WhatsApp server is running and configured with the correct AGENT_URL.'
    );
  }

  if (!advice.length) {
    advice.push('All checks passed. If the AI still does not respond, check the WhatsApp server logs.');
  }

  return advice;
}
