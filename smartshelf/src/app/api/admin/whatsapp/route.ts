import { NextResponse } from 'next/server';
import { getWhatsAppStatus, reconnectWhatsAppServer } from '@/lib/whapi';

export async function GET(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const status = await getWhatsAppStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { connected: false, error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await reconnectWhatsAppServer();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}
