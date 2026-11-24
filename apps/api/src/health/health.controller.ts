import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'playverzus-api',
      latestAppVersion: process.env.LATEST_APP_VERSION || '2.0.1',
      latestBuildNumber: Number(process.env.LATEST_BUILD_NUMBER || 2),
      minSupportedVersion: process.env.MIN_APP_VERSION || '2.0.0',
      releaseNotes:
        process.env.APP_RELEASE_NOTES ||
        'Smart device detection, first-time permission alerts, featured game sync, and 1-tap tournament & duel launches.',
      downloadPath: '/download',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
