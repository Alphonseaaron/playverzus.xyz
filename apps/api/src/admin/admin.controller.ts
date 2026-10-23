import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async stats() {
    return this.adminService.getPlatformStats();
  }

  @Get('users')
  async listUsers(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.adminService.listUsers(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Post('users/:id/ban')
  async ban(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.banUser(id, body.reason);
  }

  @Post('users/:id/unban')
  async unban(@Param('id') id: string) {
    return this.adminService.unbanUser(id);
  }

  @Post('users/:id/kyc')
  async kyc(
    @Param('id') id: string,
    @Body() body: { status: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED'; providerRef?: string },
  ) {
    return this.adminService.updateUserKyc(id, body.status, body.providerRef);
  }

  @Post('users/:id/role')
  async role(
    @Param('id') id: string,
    @Body() body: { role: 'PLAYER' | 'REVIEWER' | 'ADMIN' | 'SUPER_ADMIN' },
  ) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Get('sponsors')
  async listSponsors() {
    return this.adminService.listSponsors();
  }

  @Post('sponsors')
  async createSponsor(
    @Body() body: { name: string; websiteUrl?: string; fundedAmount?: number },
  ) {
    return this.adminService.createSponsor(body.name, body.websiteUrl, body.fundedAmount);
  }

  @Get('treasury')
  async treasury() {
    return this.adminService.getTreasuryReport();
  }
}
