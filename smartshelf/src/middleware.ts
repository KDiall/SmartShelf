import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) return NextResponse.next();

  const publicApiRoutes = ['/api/auth/send-otp', '/api/auth/verify-otp', '/api/uploadthing', '/api/webhooks/whapi', '/api/webhooks/diagnostics'];
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (pathname.startsWith('/api/admin/')) {
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-phone', payload.phone);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-user-pharmacy-id', payload.pharmacyId ?? '');

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/api/:path*'],
};
