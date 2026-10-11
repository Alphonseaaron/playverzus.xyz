import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly windowMs = 60 * 1000;
  private readonly maxRequests = 60;
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor() {
    // Prune stale IP and user records every 2 minutes to prevent heap growth
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (now > record.resetAt) this.hits.delete(key);
      }
    }, 120_000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const path = req.path || '';

    // Accurate client IP extraction supporting Cloudflare, AWS, and reverse proxies
    const clientIp =
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'anonymous';

    const identityKey = req.user?.id ? `u:${req.user.id}` : `ip:${clientIp}`;
    const now = Date.now();

    // Sensitive endpoints get stricter rate limits to prevent brute-forcing and abuse
    let routeLimit = this.maxRequests;
    if (path.includes('/auth/login') || path.includes('/auth/refresh')) {
      routeLimit = 15; // 15 attempts/minute for authentication
    } else if (path.includes('/wallet/payout') || path.includes('/wallet/deposit') || path.includes('/wallet/claim-demo')) {
      routeLimit = 12; // 12 financial transactions/minute
    } else if (path.includes('/ocr/verify')) {
      routeLimit = 20; // 20 OCR heavy validations/minute
    }

    const key = `${identityKey}:${path.split('/')[2] || 'root'}`;

    let record = this.hits.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + this.windowMs };
      this.hits.set(key, record);
    } else {
      record.count += 1;
      if (record.count > routeLimit) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please wait a moment before trying again.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return next.handle();
  }
}
