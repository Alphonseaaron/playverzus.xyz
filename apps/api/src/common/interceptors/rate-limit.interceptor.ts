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
    const key = req.user?.id ?? req.ip ?? 'anonymous';
    const now = Date.now();

    let record = this.hits.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + this.windowMs };
      this.hits.set(key, record);
    } else {
      record.count += 1;
      if (record.count > this.maxRequests) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests, please try again in a minute.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return next.handle();
  }
}
