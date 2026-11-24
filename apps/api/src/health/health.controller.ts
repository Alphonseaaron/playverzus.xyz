import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'playverzus-api',
      latestAppVersion: process.env.LATEST_APP_VERSION || '2.0.3',
      latestBuildNumber: Number(process.env.LATEST_BUILD_NUMBER || 4),
      minSupportedVersion: process.env.MIN_APP_VERSION || '2.0.0',
      releaseNotes:
        process.env.APP_RELEASE_NOTES ||
        'Direct No-KYB Base USDC deposits & payouts, live Cashier switcher, and iOS agreement flow.',
      downloadPath: '/download',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
