import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async stats() {
    return this.adminService.getPlatformStats();
  }

  @Get('users')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE_AUDITOR')
  async listUsers(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.adminService.listUsers(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Post('users/:id/ban')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async ban(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.banUser(id, body.reason);
  }

  @Post('users/:id/unban')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async unban(@Param('id') id: string) {
    return this.adminService.unbanUser(id);
  }

  @Post('users/:id/kyc')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
  async kyc(
    @Param('id') id: string,
    @Body() body: { status: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED'; providerRef?: string },
  ) {
    return this.adminService.updateUserKyc(id, body.status, body.providerRef);
  }

  @Post('users/:id/role')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async role(
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Get('sponsors')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COMMUNITY_MANAGER')
  async listSponsors() {
    return this.adminService.listSponsors();
  }

  @Post('sponsors')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COMMUNITY_MANAGER')
  async createSponsor(
    @Body() body: { name: string; websiteUrl?: string; fundedAmount?: number },
  ) {
    return this.adminService.createSponsor(body.name, body.websiteUrl, body.fundedAmount);
  }

  @Get('treasury')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE_AUDITOR')
  async treasury() {
    return this.adminService.getTreasuryReport();
  }
}
