import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';

interface CachedSession {
  user: {
    id: string;
    email?: string;
    role: string;
    region: string | null;
  };
  expiresAt: number;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase: TypedSupabaseClient;

  // Short-lived in-memory session cache (45s) to eliminate duplicate Supabase round-trips
  private readonly sessionCache = new Map<string, CachedSession>();

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);

    // Periodically prune stale cached sessions
    setInterval(() => {
      const now = Date.now();
      for (const [token, session] of this.sessionCache.entries()) {
        if (now > session.expiresAt) this.sessionCache.delete(token);
      }
    }, 60_000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    const now = Date.now();

    // Fast-path: Check in-memory cache first
    const cached = this.sessionCache.get(token);
    if (cached && now < cached.expiresAt) {
      request.user = cached.user;
      return true;
    }

    // Verify token with Supabase Auth
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      this.sessionCache.delete(token);
      throw new UnauthorizedException('Invalid or expired authentication session');
    }

    // Load profile role and region
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('role, region, is_banned')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile?.is_banned) {
      this.sessionCache.delete(token);
      throw new UnauthorizedException('Account has been suspended');
    }

    const userPayload = {
      id: data.user.id,
      email: data.user.email,
      role: profile?.role ?? 'PLAYER',
      region: profile?.region ?? null,
    };

    // Cache valid session for 45s
    this.sessionCache.set(token, {
      user: userPayload,
      expiresAt: now + 45_000,
    });

    request.user = userPayload;
    return true;
  }
}

