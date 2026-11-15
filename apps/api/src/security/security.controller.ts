import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SecurityService } from './security.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@Controller('admin/security')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'SECURITY_ENGINEER')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('overview')
  async getOverview() {
    return this.securityService.getOverview();
  }

  @Get('events')
  async getEvents(
    @Query('category') category?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.securityService.getEvents(category, severity, parsedLimit);
  }

  @Post('freeze/:id')
  async freezeMatch(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { reason?: string },
  ) {
    if (!id) throw new BadRequestException('Match ID is required');
    return this.securityService.freezeMatch(
      id,
      user.id,
      body.reason || 'Flagged for suspicious score/frame anomaly by Security Engineer',
    );
  }

  @Post('void/:id')
  async voidMatch(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { reason?: string },
  ) {
    if (!id) throw new BadRequestException('Match ID is required');
    return this.securityService.voidMatch(
      id,
      user.id,
      body.reason || 'Voided by Security Engineer due to confirmed exploit',
    );
  }

  @Post('settlement-halt')
  async toggleSettlementHalt(
    @CurrentUser() user: AuthUser,
    @Body() body: { enabled: boolean; reason?: string },
  ) {
    if (typeof body.enabled !== 'boolean') {
      throw new BadRequestException('Boolean parameter "enabled" is required');
    }
    return this.securityService.toggleSettlementHalt(user.id, body.enabled, body.reason);
  }

  @Post('clear-lock')
  async clearLock(
    @CurrentUser() user: AuthUser,
    @Body() body: { lockKey: string },
  ) {
    if (!body.lockKey || typeof body.lockKey !== 'string') {
      throw new BadRequestException('String parameter "lockKey" is required');
    }
    return this.securityService.clearLock(body.lockKey, user.id);
  }
}
