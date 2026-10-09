import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';

@Injectable()
export class AuthService {
  private supabase: TypedSupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
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
