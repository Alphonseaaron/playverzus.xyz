import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { SupportService, CreateTicketDto, ReplyTicketDto } from './support.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Public or Authenticated ticket submission
   */
  @Post('tickets')
  async createTicket(
    @Body() body: CreateTicketDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.supportService.createTicket(user?.id || null, body);
  }

  /**
   * Authenticated user: View own tickets
   */
  @UseGuards(SupabaseAuthGuard)
  @Get('my-tickets')
  async getMyTickets(@CurrentUser() user: AuthUser) {
    return this.supportService.getUserTickets(user.id);
  }

  /**
   * Fetch ticket details and conversation thread
   */
  @UseGuards(SupabaseAuthGuard)
  @Get('tickets/:id')
  async getTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const isStaff = ['SUPPORT', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);
    return this.supportService.getTicket(id, user.id, isStaff);
  }

  /**
   * Reply to an open ticket
   */
  @UseGuards(SupabaseAuthGuard)
  @Post('tickets/:id/reply')
  async addReply(
    @Param('id') id: string,
    @Body() body: ReplyTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.supportService.addReply(
      id,
      user.id,
      user.username || 'User',
      user.role,
      body,
    );
  }

  // ─── Staff & Admin Delegation Desk ────────────────────────────────────────

  /**
   * Query all platform tickets (Staff / Admin only)
   */
  @UseGuards(SupabaseAuthGuard)
  @Get('admin/tickets')
  async adminListTickets(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    this.assertStaffClearance(user);
    return this.supportService.adminListTickets({
      status,
      priority,
      assignedTo,
      category,
      search,
    });
  }

  /**
   * Delegate a ticket to a staff member (Staff / Admin only)
   */
  @UseGuards(SupabaseAuthGuard)
  @Patch('admin/tickets/:id/delegate')
  async delegateTicket(
    @Param('id') id: string,
    @Body() body: { staffId: string | null },
    @CurrentUser() user: AuthUser,
  ) {
    this.assertStaffClearance(user);
    return this.supportService.delegateTicket(
      id,
      body.staffId,
      user.id,
      user.username || 'Admin',
    );
  }

  /**
   * Update status / priority of a ticket (Staff / Admin only)
   */
  @UseGuards(SupabaseAuthGuard)
  @Patch('admin/tickets/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; priority?: string },
    @CurrentUser() user: AuthUser,
  ) {
    this.assertStaffClearance(user);
    return this.supportService.updateTicketStatus(id, body.status, body.priority);
  }

  /**
   * List available staff members to whom tickets can be assigned
   */
  @UseGuards(SupabaseAuthGuard)
  @Get('admin/staff')
  async listStaff(@CurrentUser() user: AuthUser) {
    this.assertStaffClearance(user);
    return this.supportService.listStaffMembers();
  }

  private assertStaffClearance(user: AuthUser) {
    if (!['SUPPORT', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Staff or Administrator operational clearance is required.');
    }
  }
}
