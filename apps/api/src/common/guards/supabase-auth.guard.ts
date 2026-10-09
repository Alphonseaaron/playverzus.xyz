import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase: TypedSupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase Auth
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired authentication session');
    }

    // Load profile role and region
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('role, region, is_banned')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile?.is_banned) {
      throw new UnauthorizedException('Account has been suspended');
    }

    request.user = {
      id: data.user.id,
      email: data.user.email,
      role: profile?.role ?? 'PLAYER',
      region: profile?.region ?? null,
    };

    return true;
  }
}
