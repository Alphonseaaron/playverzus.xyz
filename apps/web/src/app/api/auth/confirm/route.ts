import { NextResponse } from 'next/server';
import { createServiceClient } from '@playverzus/db';
import { ACTIVE_SUPABASE_URL } from '../../../../lib/supabase';

const RENDER_API_URL = 'https://playverzus-api.onrender.com/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body as { email?: string };
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const isDeadUrl = !rawUrl || rawUrl.includes('placeholder') || rawUrl.includes('sekbqpekqcmhzxhcqjvu');
    const supabaseUrl = isDeadUrl ? ACTIVE_SUPABASE_URL : rawUrl;

    if (!serviceKey || serviceKey.includes('placeholder')) {
      const apiRes = await fetch(`${RENDER_API_URL}/auth/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const apiData = (await apiRes.json().catch(() => ({}))) as {
        ok?: boolean;
        userId?: string;
        message?: string;
        error?: string;
      };
      if (!apiRes.ok) {
        return NextResponse.json(
          { error: apiData.message || apiData.error || 'Confirmation failed.' },
          { status: apiRes.status }
        );
      }
      return NextResponse.json(apiData);
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 200,
    });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 400 });
    }

    const targetUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!targetUser.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true,
      });
    }

    return NextResponse.json({ ok: true, userId: targetUser.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected confirmation error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
