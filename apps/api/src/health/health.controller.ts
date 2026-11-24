import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'playverzus-api',
      latestAppVersion: process.env.LATEST_APP_VERSION || '2.0.2',
      latestBuildNumber: Number(process.env.LATEST_BUILD_NUMBER || 3),
      minSupportedVersion: process.env.MIN_APP_VERSION || '2.0.0',
      releaseNotes:
        process.env.APP_RELEASE_NOTES ||
        'playverzus.xyz brand alignment, native permission UX, and iOS-standard agreement review.',
      downloadPath: '/download',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
