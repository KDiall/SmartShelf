import { NextResponse } from 'next/server';
import { getBotStatus, startBotSession, logoutBotSession, getBotQR } from '@/lib/whatsapp';

export async function GET(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const want = url.searchParams.get('want');

  if (want === 'qr') {
    const { qr, error } = await getBotQR();
    if (!qr) return NextResponse.json({ error: error || 'QR not ready' }, { status: 503 });
    return NextResponse.json({ qr });
  }

  const status = await getBotStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = (body as { action?: string }).action;

  if (action === 'logout') {
    const result = await logoutBotSession();
    return NextResponse.json(result);
  }

  const result = await startBotSession();
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ success: true, sessionId: result.sessionId });
}
