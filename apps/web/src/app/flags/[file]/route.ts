import { NextResponse } from 'next/server';

const flagCache = new Map<string, { body: ArrayBuffer; contentType: string }>();
const MAX_CACHE = 250;

export async function GET(
  _req: Request,
  context: { params: { file: string } },
) {
  const file = String(context.params?.file || '');
  const match = file.match(/^([a-z]{2})\.png$/i);
  if (!match) {
    return new NextResponse('Not Found', { status: 404 });
  }
  const iso = match[1]!.toLowerCase();

  const cached = flagCache.get(iso);
  if (cached) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const upstream = await fetch(`https://flagcdn.com/w40/${iso}.png`);
    if (!upstream.ok) {
      return new NextResponse('Flag not found', { status: upstream.status });
    }
    const contentType = upstream.headers.get('content-type') || 'image/png';
    const body = await upstream.arrayBuffer();
    if (body.byteLength > 0 && body.byteLength < 100_000) {
      if (flagCache.size >= MAX_CACHE) {
        const oldest = flagCache.keys().next().value;
        if (oldest) flagCache.delete(oldest);
      }
      flagCache.set(iso, { body, contentType });
    }
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new NextResponse('Upstream error', { status: 502 });
  }
}
