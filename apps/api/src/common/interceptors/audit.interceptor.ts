import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private supabase: TypedSupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Only audit mutating operations (POST, PATCH, PUT, DELETE)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    const user = req.user;
    const path = req.path;

    return next.handle().pipe(
      tap(async () => {
        if (user?.id) {
          try {
            await this.supabase.from('audit_log').insert({
              actor_id: user.id,
              action: `api.${method.toLowerCase()}${path.replace(/\//g, '.')}`,
              metadata: {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
              },
            });
          } catch {
            // Silently suppress non-blocking audit write failures
          }
        }
      }),
    );
  }
}
