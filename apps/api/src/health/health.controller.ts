import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'playverzus-api',
      latestAppVersion: process.env.LATEST_APP_VERSION || '2.0.4',
      latestBuildNumber: Number(process.env.LATEST_BUILD_NUMBER || 5),
      minSupportedVersion: process.env.MIN_APP_VERSION || '2.0.0',
      releaseNotes:
        process.env.APP_RELEASE_NOTES ||
        'Real-cash USDC escrow across duels & Blitz pools, Admin Treasury Base wallet view, and mobile Cashier polish.',
      downloadPath: '/download',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
