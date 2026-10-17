import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { RedisModule } from './redis/redis.module';
import { PushModule } from './push/push.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { WalletModule } from './wallet/wallet.module';
import { MatchModule } from './match/match.module';
import { TournamentModule } from './tournament/tournament.module';
import { GameProfileModule } from './game-profile/game-profile.module';
import { ReviewModule } from './review/review.module';
import { OCRModule } from './ocr/ocr.module';
import { StreamModule } from './stream/stream.module';
import { SocialModule } from './social/social.module';
import { RatingModule } from './rating/rating.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { SeasonModule } from './season/season.module';
import { AdminModule } from './admin/admin.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RealtimeModule } from './realtime/realtime.module';
import { WorkersModule } from './workers/workers.module';
import { MailModule } from './mail/mail.module';
import { CrossmintModule } from './crossmint/crossmint.module';

import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    // Global infrastructure first
    RedisModule,   // Global — available to all modules
    PushModule,    // Global — Web Push notifications
    // Feature modules
    HealthModule,
    AuthModule,
    ProfileModule,
    WalletModule,
    MatchModule,
    TournamentModule,
    GameProfileModule,
    ReviewModule,
    OCRModule,
    StreamModule,
    SocialModule,
    RatingModule,
    LeaderboardModule,
    SeasonModule,
    AdminModule,
    WebhooksModule,
    RealtimeModule,
    WorkersModule,
    MailModule,
    CrossmintModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
