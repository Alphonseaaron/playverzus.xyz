import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { BrevoService } from '../mail/brevo.service';
import { PushService } from '../push/push.service';

export interface CreateTicketDto {
  name: string;
  email: string;
  subject: string;
  message: string;
  category?: string;
  priority?: string;
  matchId?: string;
}

export interface ReplyTicketDto {
  message: string;
  isInternalNote?: boolean;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private supabase: TypedSupabaseClient;

  constructor(
    private readonly brevo: BrevoService,
    private readonly push: PushService,
  ) {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
  }

  /**
   * Submit a new player support inquiry and generate unique tracking ticket.
   */
  async createTicket(userId: string | null, dto: CreateTicketDto) {
    if (!dto.email || !dto.name || !dto.subject || !dto.message) {
      throw new BadRequestException('Please complete all required fields: name, email, subject, message.');
    }

    const ticketId = `PVZ-${Date.now().toString(36).toUpperCase()}`;
    const category = dto.category || 'GENERAL';
    const priority = dto.priority || 'NORMAL';

    // 1. Insert Support Ticket Record
    const { error: ticketError } = await this.supabase
      .from('support_tickets')
      .insert({
        id: ticketId,
        user_id: userId || null,
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        subject: dto.subject.trim(),
        category,
        priority,
        status: 'OPEN',
        message: dto.message.trim(),
        metadata: { matchId: dto.matchId || null },
      });

    if (ticketError) {
      this.logger.error({ ticketError, ticketId }, 'Failed to insert support ticket');
      // If table doesn't exist yet, we still return the ticketId after email dispatch
    }

    // 2. Insert First Message in Conversation Log
    try {
      await this.supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: userId || null,
          sender_name: dto.name.trim(),
          sender_role: 'USER',
          message: dto.message.trim(),
          is_internal_note: false,
        });
    } catch {
      // Non-fatal if messages table insert fails
    }

    // 3. Dispatch confirmation emails via Brevo
    try {
      await this.brevo.handleSupportInquiry({
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
        category,
        matchId: dto.matchId,
      });
    } catch (mailErr) {
      this.logger.warn({ mailErr }, 'Failed to dispatch email confirmation via Brevo');
    }

    return {
      success: true,
      ticketId,
      message: `Support ticket #${ticketId} created. You will receive an email confirmation at ${dto.email}.`,
    };
  }

  /**
   * List tickets opened by the authenticated player.
   */
  async getUserTickets(userId: string) {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .select('id, subject, category, priority, status, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  /**
   * Fetch a single ticket with full message history.
   */
  async getTicket(ticketId: string, userId?: string, isStaff = false) {
    const { data: ticket, error } = await this.supabase
      .from('support_tickets')
      .select('*, assigned_staff:assigned_to(id, username, role)')
      .eq('id', ticketId)
      .maybeSingle();

    if (error || !ticket) {
      throw new NotFoundException(`Ticket #${ticketId} was not found.`);
    }

    // Ensure non-staff cannot read someone else's ticket
    if (!isStaff && ticket.user_id && ticket.user_id !== userId) {
      throw new NotFoundException(`Ticket #${ticketId} was not found.`);
    }

    // Fetch conversation messages
    let messageQuery = this.supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    // Non-staff cannot see internal notes
    if (!isStaff) {
      messageQuery = messageQuery.eq('is_internal_note', false);
    }

    const { data: messages } = await messageQuery;

    return {
      ...ticket,
      messages: messages || [],
    };
  }

  /**
   * Post a reply or staff internal note on a ticket.
   */
  async addReply(
    ticketId: string,
    senderId: string,
    senderName: string,
    senderRole: string,
    reply: ReplyTicketDto,
  ) {
    if (!reply.message || reply.message.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty.');
    }

    const isStaff = ['SUPPORT', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(senderRole);
    const isInternalNote = isStaff && Boolean(reply.isInternalNote);

    const { data: inserted, error } = await this.supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        sender_name: senderName,
        sender_role: isStaff ? (senderRole === 'SUPPORT' ? 'STAFF' : senderRole) : 'USER',
        message: reply.message.trim(),
        is_internal_note: isInternalNote,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Update ticket status
    if (!isInternalNote) {
      const nextStatus = isStaff ? 'WAITING_USER' : 'IN_PROGRESS';
      await this.supabase
        .from('support_tickets')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      // If staff replied, notify player via push notification
      const { data: ticket } = await this.supabase
        .from('support_tickets')
        .select('user_id, email, subject')
        .eq('id', ticketId)
        .maybeSingle();

      if (isStaff && ticket?.user_id) {
        await this.push.sendToUser(ticket.user_id, {
          title: `Support Ticket #${ticketId} Update`,
          body: `Our support team has replied: "${reply.message.slice(0, 80)}..."`,
          type: 'support',
          url: `/support?ticket=${ticketId}`,
        });
      }
    }

    return inserted;
  }

  /**
   * Delegate a ticket to a staff member or unassign it (Staff / Admin only).
   */
  async delegateTicket(ticketId: string, staffId: string | null, adminId: string, adminUsername: string) {
    let staffName = 'Unassigned';

    if (staffId) {
      const { data: staff } = await this.supabase
        .from('profiles')
        .select('username')
        .eq('id', staffId)
        .maybeSingle();

      staffName = staff?.username || 'Staff Member';
    }

    const nextStatus = staffId ? 'ASSIGNED' : 'OPEN';

    const { data, error } = await this.supabase
      .from('support_tickets')
      .update({
        assigned_to: staffId || null,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select('*, assigned_staff:assigned_to(id, username, role)')
      .single();

    if (error) throw new BadRequestException(error.message);

    // Log internal note documenting the delegation
    await this.supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: adminId,
        sender_name: adminUsername,
        sender_role: 'SYSTEM',
        message: `📋 Ticket delegated to @${staffName} by @${adminUsername}`,
        is_internal_note: true,
      });

    // Notify assigned staff member
    if (staffId) {
      await this.push.sendToUser(staffId, {
        title: 'New Support Ticket Delegated to You',
        body: `Ticket #${ticketId} has been assigned to your queue by @${adminUsername}.`,
        type: 'support',
        url: `/admin/support?ticket=${ticketId}`,
      });
    }

    return {
      success: true,
      ticket: data,
      message: `Ticket #${ticketId} delegated to ${staffName}.`,
    };
  }

  /**
   * Update status or priority of a ticket (Staff / Admin only).
   */
  async updateTicketStatus(ticketId: string, status: string, priority?: string) {
    const payload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (priority) payload.priority = priority;

    const { data, error } = await this.supabase
      .from('support_tickets')
      .update(payload)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Admin & Staff Desk: Query and filter all platform tickets.
   */
  async adminListTickets(params: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    category?: string;
    search?: string;
  }) {
    let query = this.supabase
      .from('support_tickets')
      .select('*, assigned_staff:assigned_to(id, username, role)')
      .order('updated_at', { ascending: false });

    if (params.status && params.status !== 'ALL') {
      query = query.eq('status', params.status);
    }
    if (params.priority && params.priority !== 'ALL') {
      query = query.eq('priority', params.priority);
    }
    if (params.category && params.category !== 'ALL') {
      query = query.eq('category', params.category);
    }
    if (params.assignedTo) {
      if (params.assignedTo === 'UNASSIGNED') {
        query = query.is('assigned_to', null);
      } else {
        query = query.eq('assigned_to', params.assignedTo);
      }
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      query = query.or(`subject.ilike.%${q}%,name.ilike.%${q}%,email.ilike.%${q}%,id.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  }

  /**
   * List available staff members to whom tickets can be delegated.
   */
  async listStaffMembers() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, username, role, avatar_url')
      .in('role', [
        'SUPPORT',
        'REVIEWER',
        'TOURNAMENT_ADMIN',
        'FINANCE_AUDITOR',
        'COMMUNITY_MANAGER',
        'ADMIN',
        'SUPER_ADMIN',
      ])
      .order('username', { ascending: true });

    if (error) return [];
    return data || [];
  }
}
