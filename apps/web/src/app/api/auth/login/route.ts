import { NextResponse } from 'next/server';
import { createServiceClient } from '@playverzus/db';
import { ACTIVE_SUPABASE_URL } from '../../../../lib/supabase';

const RENDER_API_URL = 'https://playverzus-api.onrender.com/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier } = body as { identifier?: string };

    if (!identifier) {
      return NextResponse.json({ error: 'Email or username is required.' }, { status: 400 });
    }

    const clean = identifier.trim();

    // If it's already an email, return directly
    if (clean.includes('@')) {
      return NextResponse.json({ email: clean.toLowerCase() });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const isDeadUrl = !rawUrl || rawUrl.includes('placeholder') || rawUrl.includes('sekbqpekqcmhzxhcqjvu');
    const supabaseUrl = isDeadUrl ? ACTIVE_SUPABASE_URL : rawUrl;

    // If service role key is not set in Vercel environment, delegate to Render API
    if (!serviceKey || serviceKey.includes('placeholder')) {
      const res = await fetch(`${RENDER_API_URL}/auth/resolve-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.email) {
        return NextResponse.json(
          { error: data.message || `No competitor account found with username "${clean}".` },
          { status: res.status || 404 }
        );
      }
      return NextResponse.json({ email: data.email });
    }

    // Direct resolution via server client
    const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .ilike('username', clean.toLowerCase())
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: `No competitor account found with username "${clean}".` },
        { status: 404 }
      );
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

    if (userError || !userData?.user?.email) {
      return NextResponse.json(
        { error: 'Could not resolve email for this username.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ email: userData.user.email });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected lookup error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
