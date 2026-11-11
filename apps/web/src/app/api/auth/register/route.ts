import { NextResponse } from 'next/server';
import { createServiceClient } from '@playverzus/db';
import { ACTIVE_SUPABASE_URL } from '../../../../lib/supabase';

const RENDER_API_URL = 'https://playverzus-api.onrender.com/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      username,
      fullName,
      dateOfBirth,
      phone,
      countryCode,
    } = body as {
      email?: string;
      password?: string;
      username?: string;
      fullName?: string;
      dateOfBirth?: string;
      phone?: string;
      countryCode?: string;
    };

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, username, and password are required.' },
        { status: 400 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const isDeadUrl = !rawUrl || rawUrl.includes('placeholder') || rawUrl.includes('sekbqpekqcmhzxhcqjvu');
    const supabaseUrl = isDeadUrl ? ACTIVE_SUPABASE_URL : rawUrl;

    // If service role key is not present in Vercel environment, delegate to the Render API
    if (!serviceKey || serviceKey.includes('placeholder')) {
      const apiRes = await fetch(`${RENDER_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const apiData = (await apiRes.json().catch(() => ({}))) as {
        ok?: boolean;
        userId?: string;
        message?: string;
        error?: string;
      };
      if (!apiRes.ok) {
        return NextResponse.json(
          { error: apiData.message || apiData.error || 'Registration failed.' },
          { status: apiRes.status }
        );
      }
      return NextResponse.json(apiData);
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('username', cleanUsername)
      .maybeSingle();

    const userMetadata = {
      username: cleanUsername,
      display_name: username.trim(),
      full_name: (fullName || '').trim(),
      date_of_birth: dateOfBirth || '',
      phone: (phone || '').trim(),
      country_code: countryCode || 'US',
      region: countryCode || 'US',
    };

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createError) {
      const errMsg = createError.message || '';
      if (
        errMsg.toLowerCase().includes('already') ||
        errMsg.toLowerCase().includes('registered') ||
        errMsg.toLowerCase().includes('exists')
      ) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
        const existingUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        );
        if (existingUser && !existingUser.email_confirmed_at) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            email_confirm: true,
            password,
            user_metadata: userMetadata,
          });
          if (countryCode) {
            await supabaseAdmin
              .from('profiles')
              .update({ region: countryCode })
              .eq('id', existingUser.id);
          }
          return NextResponse.json({ ok: true, userId: existingUser.id, confirmedExisting: true });
        }
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        );
      }

      if (existingProfile) {
        return NextResponse.json(
          { error: 'That competitor username is already taken. Please choose another.' },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: errMsg || 'Registration failed.' }, { status: 400 });
    }

    const userId = created.user?.id;
    if (userId && countryCode) {
      await supabaseAdmin
        .from('profiles')
        .update({ region: countryCode })
        .eq('id', userId);
    }

    return NextResponse.json({ ok: true, userId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected registration error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
