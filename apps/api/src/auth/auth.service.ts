import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';

@Injectable()
export class AuthService {
  private supabase: TypedSupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://vebpkkjerwaaupuahomz.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
  }

  async register(body: {
    email: string;
    password: string;
    username: string;
    fullName?: string;
    dateOfBirth?: string;
    phone?: string;
    countryCode?: string;
  }) {
    const { email, password, username, fullName, dateOfBirth, phone, countryCode } = body;
    if (!email || !password || !username) {
      throw new BadRequestException('Email, username, and password are required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    const { data: existingProfile } = await this.supabase
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

    const { data: created, error: createError } = await this.supabase.auth.admin.createUser({
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
        const { data: listData } = await this.supabase.auth.admin.listUsers({ perPage: 200 });
        const existingUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        );
        if (existingUser && !existingUser.email_confirmed_at) {
          await this.supabase.auth.admin.updateUserById(existingUser.id, {
            email_confirm: true,
            password,
            user_metadata: userMetadata,
          });
          if (countryCode) {
            await this.supabase
              .from('profiles')
              .update({ region: countryCode })
              .eq('id', existingUser.id);
          }
          return { ok: true, userId: existingUser.id, confirmedExisting: true };
        }
        throw new ConflictException('An account with this email already exists. Please sign in instead.');
      }

      if (existingProfile) {
        throw new ConflictException('That competitor username is already taken. Please choose another.');
      }

      throw new BadRequestException(errMsg || 'Registration failed.');
    }

    const userId = created.user?.id;
    if (userId && countryCode) {
      await this.supabase
        .from('profiles')
        .update({ region: countryCode })
        .eq('id', userId);
    }

    return { ok: true, userId };
  }

  async confirmEmail(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const { data: listData, error: listError } = await this.supabase.auth.admin.listUsers({
      perPage: 200,
    });
    if (listError) {
      throw new BadRequestException(listError.message);
    }
    const targetUser = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
    if (!targetUser) {
      throw new BadRequestException('User not found.');
    }
    if (!targetUser.email_confirmed_at) {
      await this.supabase.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true,
      });
    }
    return { ok: true, userId: targetUser.id };
  }

  async resolveUsername(username: string) {
    if (!username) {
      throw new BadRequestException('Username is required.');
    }
    const cleanUsername = username.trim().toLowerCase();
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (!profile) {
      throw new NotFoundException(`No competitor account found with username "${username}".`);
    }

    const { data: userData, error: userError } = await this.supabase.auth.admin.getUserById(profile.id);
    if (userError || !userData?.user?.email) {
      throw new NotFoundException('Could not resolve email for this username.');
    }

    return { email: userData.user.email, userId: profile.id };
  }

  async login(email: string, password?: string) {
    if (!password) {
      // Magic link OTP
      const { data, error } = await this.supabase.auth.signInWithOtp({ email });
      if (error) throw new UnauthorizedException(error.message);
      return { message: 'OTP sent to email', data };
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw new UnauthorizedException(error.message);
    return data;
  }

  async refresh(refreshToken: string) {
    const { data, error } = await this.supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error) throw new UnauthorizedException(error.message);
    return data;
  }

  async logout(token: string) {
    await this.supabase.auth.admin.signOut(token);
    return { message: 'Logged out successfully' };
  }
}
