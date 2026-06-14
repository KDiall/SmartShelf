import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enqueueIngestion, deleteFile, NAMESPACE } from '@/lib/geneline';

export async function GET(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const guidelines = await prisma.guideline.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(guidelines);
}

export async function POST(request: Request) {
  const role = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { url, filename } = await request.json();

    if (!url || !filename) {
      return NextResponse.json({ error: 'URL and filename are required' }, { status: 400 });
    }

    // 1. Trigger ingestion in Geneline
    await enqueueIngestion({
      files: [{ url, filename, metadata: { type: 'stg', country: 'Sierra Leone' } }],
      namespace: NAMESPACE,
    });

    // 2. Save record in database
    const guideline = await prisma.guideline.create({
      data: {
        name: filename,
        url: url,
        status: 'indexed',
        userId: userId,
      },
    });

    return NextResponse.json({ success: true, guideline });
  } catch (err) {
    console.error('Failed to process guideline:', err);
    const message =
      err instanceof Error &&
      (err.name === 'AbortError' ||
        err.cause?.constructor?.name?.includes('Timeout') ||
        (err.cause as any)?.code === 'UND_ERR_CONNECT_TIMEOUT')
        ? 'AI ingestion service timed out. Please try again later.'
        : 'Failed to process document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const role = request.headers.get('x-user-role');
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    const guideline = await prisma.guideline.findUnique({ where: { id } });
    if (!guideline) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Try to remove from Geneline as well
    try {
      await deleteFile({ url: guideline.url, namespace: NAMESPACE });
    } catch (err) {
      console.warn('Failed to delete from Geneline, continuing...', err);
    }

    await prisma.guideline.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
