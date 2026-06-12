import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  console.log('Whapi webhook received:', JSON.stringify(body, null, 2));

  return NextResponse.json({ received: true });
}
