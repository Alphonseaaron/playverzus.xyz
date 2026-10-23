'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Headphones,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Send,
  Lock,
  MessageSquare,
  Search,
  Filter,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../../lib/api';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';

interface StaffMember {
  id: string;
  username: string;
  role: string;
}

interface TicketListItem {
  id: string;
  ticket_number: number;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  assigned_staff?: StaffMember | null;
}

interface TicketMessage {
  id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
}

interface TicketDetail extends TicketListItem {
  message: string;
  match_id?: string | null;
  metadata?: Record<string, unknown> | null;
  messages: TicketMessage[];
}

export default function AdminSupportPage() {
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Ticket Drawer / Detail
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // New message state
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Quick delegation selection state
  const [delegatingStaffId, setDelegatingStaffId] = useState<string>('');

  // Fetch current user
  const { data: currentUser } = useQuery<{ id: string; username: string; role: string } | null>({
    queryKey: ['admin-current-user'],
    queryFn: () => apiClient<{ id: string; username: string; role: string }>('/profile/me').catch(() => null),
    staleTime: 60000,
  });

  // Fetch staff list for ticket delegation
  const { data: staffList = [], isLoading: loadingStaff } = useQuery<StaffMember[]>({
    queryKey: ['admin-support-staff-list'],
    queryFn: () => apiClient<StaffMember[]>('/support/admin/staff').catch(() => []),
    staleTime: 60000,
  });

  // Fetch tickets list with filters
  const {
    data: tickets = [],
    isLoading: loadingTickets,
    refetch: refetchTickets,
  } = useQuery<TicketListItem[]>({
    queryKey: [
      'admin-support-tickets',
      statusFilter,
      priorityFilter,
      assignmentFilter,
      categoryFilter,
      searchQuery,
      currentUser?.id,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      if (assignmentFilter === 'UNASSIGNED') {
        params.set('assignedTo', 'UNASSIGNED');
      } else if (assignmentFilter === 'ME' && currentUser?.id) {
        params.set('assignedTo', currentUser.id);
      } else if (assignmentFilter !== 'ALL') {
        params.set('assignedTo', assignmentFilter);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      return apiClient<TicketListItem[]>(`/support/admin/tickets${queryString}`);
    },
    refetchInterval: 15000,
  });

  // Fetch full details of selected ticket
  const {
    data: selectedTicket,
    isLoading: loadingDetail,
    refetch: refetchDetail,
  } = useQuery<TicketDetail | null>({
    queryKey: ['admin-support-ticket-detail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      return apiClient<TicketDetail>(`/support/tickets/${selectedTicketId}`);
    },
    enabled: Boolean(selectedTicketId),
    refetchInterval: 10000,
  });

  // Delegate mutation
  const delegateMutation = useMutation({
    mutationFn: async ({ ticketId, staffId }: { ticketId: string; staffId: string | null }) => {
      return apiClient(`/support/admin/tickets/${ticketId}/delegate`, {
        method: 'PATCH',
        body: JSON.stringify({ staffId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket-detail', selectedTicketId] });
      setDelegatingStaffId('');
    },
  });

  // Status/Priority mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status, priority }: { ticketId: string; status: string; priority?: string }) => {
      return apiClient(`/support/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, priority }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket-detail', selectedTicketId] });
    },
  });

  // Send Reply / Internal Note mutation
  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, message, isInternalNote }: { ticketId: string; message: string; isInternalNote: boolean }) => {
      return apiClient(`/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message, isInternalNote }),
      });
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket-detail', selectedTicketId] });
    },
  });

  // Metrics
  const totalCount = tickets.length;
  const unassignedCount = tickets.filter((t) => !t.assigned_to && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'WAITING_USER').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;
    replyMutation.mutate({
      ticketId: selectedTicketId,
      message: replyText.trim(),
      isInternalNote,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning" className="text-[10px]">OPEN</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="copper" className="text-[10px]">IN PROGRESS</Badge>;
      case 'WAITING_USER':
        return <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400/40">WAITING USER</Badge>;
      case 'RESOLVED':
        return <Badge variant="success" className="text-[10px]">RESOLVED</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary" className="text-[10px]">CLOSED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="destructive" className="text-[10px] font-bold">URGENT</Badge>;
      case 'HIGH':
        return <Badge variant="warning" className="text-[10px]">HIGH</Badge>;
      case 'NORMAL':
        return <Badge variant="secondary" className="text-[10px]">NORMAL</Badge>;
      case 'LOW':
        return <Badge variant="outline" className="text-[10px]">LOW</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="copper" className="font-mono text-[10px] tracking-wider">
              STAFF OPERATIONS & DELEGATION
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">LIVE TICKET DESK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Headphones className="w-7 h-7 text-primary" />
            Support Desk & Task Delegation
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Triage player inquiries, assign tickets to dedicated staff specialists, and coordinate resolution with private internal notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchTickets();
              if (selectedTicketId) refetchDetail();
            }}
            className="text-xs font-bold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Queue
          </Button>
          <Link href="/support" target="_blank">
            <Button variant="secondary" size="sm" className="text-xs font-bold gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Public Portal
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 border-border">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5 text-primary" />
            Active In View
          </div>
          <div className="text-2xl font-black text-foreground mt-1.5 font-mono">
            {totalCount}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Matching current filters</p>
        </Card>

        <Card className="p-4 bg-amber-500/5 border-amber-500/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5" />
            Unassigned
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1.5 font-mono">
            {unassignedCount}
          </div>
          <p className="text-[10px] text-amber-500/80 mt-0.5">Needs staff assignment</p>
        </Card>

        <Card className="p-4 bg-blue-500/5 border-blue-500/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            In Progress
          </div>
          <div className="text-2xl font-black text-blue-300 mt-1.5 font-mono">
            {inProgressCount}
          </div>
          <p className="text-[10px] text-blue-400/80 mt-0.5">Under active investigation</p>
        </Card>

        <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1.5 font-mono">
            {resolvedCount}
          </div>
          <p className="text-[10px] text-emerald-400/80 mt-0.5">Closed ticket archive</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-card border-border shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search subject, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter tickets by status"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_USER">Waiting User</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Assignment Filter */}
          <div>
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              aria-label="Filter tickets by assignment"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Assignments</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {currentUser && <option value="ME">Assigned to Me (@{currentUser.username})</option>}
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  Staff: @{s.username} ({s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter tickets by category"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Categories</option>
              <option value="ACCOUNT">Account & KYC</option>
              <option value="BILLING_USDC">Billing & USDC</option>
              <option value="MATCH_DISPUTE">Match Dispute</option>
              <option value="TOURNAMENT">Tournaments</option>
              <option value="TECHNICAL">Technical & Anti-Cheat</option>
              <option value="GENERAL">General Support</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter tickets by priority"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="NORMAL">Normal Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Split View: Left Queue List / Right Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Ticket Queue Table / List */}
        <div className={`space-y-3 ${selectedTicketId ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
            <span>TICKET QUEUE ({tickets.length})</span>
            <span className="text-[11px] font-mono">Auto-refreshes 15s</span>
          </div>

          {loadingTickets ? (
            <div className="py-20 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Loading tickets queue...</p>
            </div>
          ) : tickets.length === 0 ? (
            <Card className="p-12 text-center bg-card border-dashed">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-foreground">All Clear!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                No tickets matching the current filter criteria.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => {
                const isSelected = selectedTicketId === t.id;
                return (
                  <Card
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-3.5 cursor-pointer transition border text-left hover:border-primary/50 ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-foreground font-mono">
                            #{t.ticket_number}
                          </span>
                          {getStatusBadge(t.status)}
                          {getPriorityBadge(t.priority)}
                          <span className="text-[10px] font-mono text-muted-foreground uppercase bg-secondary/80 px-1.5 py-0.5 rounded">
                            {t.category}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {t.subject}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          <span>By: <strong className="text-foreground">{t.name}</strong></span>
                          <span>•</span>
                          <span>{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Delegation Badge */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {t.assigned_staff ? (
                          <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            @{t.assigned_staff.username}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] font-mono flex items-center gap-1">
                            <UserX className="w-3 h-3" />
                            Unassigned
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Selected Ticket Workspace & Delegation Action Panel */}
        {selectedTicketId && (
          <div className="lg:col-span-7 space-y-4">
            {loadingDetail || !selectedTicket ? (
              <Card className="p-16 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                <p className="text-xs text-muted-foreground">Loading ticket thread #{selectedTicketId.slice(0, 8)}...</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Header & Quick Action Card */}
                <Card className="p-5 bg-card border-border shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-foreground font-mono">
                          TICKET #{selectedTicket.ticket_number}
                        </span>
                        {getStatusBadge(selectedTicket.status)}
                        {getPriorityBadge(selectedTicket.priority)}
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {selectedTicket.category}
                        </Badge>
                      </div>
                      <h2 className="text-lg font-black text-foreground">
                        {selectedTicket.subject}
                      </h2>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTicketId(null)}
                      className="text-xs self-start sm:self-auto"
                    >
                      Close View
                    </Button>
                  </div>

                  {/* Requester Info Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-b border-border text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">Requester</span>
                      <strong className="text-foreground">{selectedTicket.name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">Email</span>
                      <span className="text-foreground font-mono text-[11px] truncate block">{selectedTicket.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">Account ID</span>
                      <span className="text-foreground font-mono text-[11px]">
                        {selectedTicket.user_id ? `${selectedTicket.user_id.slice(0, 8)}...` : 'Guest'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-mono">Created</span>
                      <span className="text-foreground">{new Date(selectedTicket.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Delegation & Assignment Control Panel */}
                  <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Assign & Delegate Ticket
                        </span>
                      </div>
                      {selectedTicket.assigned_staff && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => delegateMutation.mutate({ ticketId: selectedTicket.id, staffId: null })}
                          disabled={delegateMutation.isPending}
                          className="text-[11px] h-7 text-destructive hover:text-destructive"
                        >
                          Unassign Staff
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={delegatingStaffId || (selectedTicket.assigned_to || '')}
                        onChange={(e) => setDelegatingStaffId(e.target.value)}
                        aria-label="Delegate ticket to staff member"
                        className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">-- Select Staff Specialist --</option>
                        {staffList.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            @{staff.username} ({staff.role})
                          </option>
                        ))}
                      </select>

                      <Button
                        variant="default"
                        size="sm"
                        disabled={
                          delegateMutation.isPending ||
                          !delegatingStaffId ||
                          delegatingStaffId === selectedTicket.assigned_to
                        }
                        onClick={() =>
                          delegateMutation.mutate({
                            ticketId: selectedTicket.id,
                            staffId: delegatingStaffId,
                          })
                        }
                        className="font-bold text-xs gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {delegateMutation.isPending ? 'Delegating...' : 'Confirm Delegation'}
                      </Button>
                    </div>

                    {/* Status & Priority Rapid Switchers */}
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">Status:</span>
                        <select
                          value={selectedTicket.status}
                          onChange={(e) =>
                            updateStatusMutation.mutate({
                              ticketId: selectedTicket.id,
                              status: e.target.value,
                            })
                          }
                          aria-label="Update ticket status"
                          className="h-8 rounded-md border border-input bg-background px-2 py-0.5 text-xs shadow-sm w-full"
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="WAITING_USER">WAITING USER</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">Priority:</span>
                        <select
                          value={selectedTicket.priority}
                          onChange={(e) =>
                            updateStatusMutation.mutate({
                              ticketId: selectedTicket.id,
                              status: selectedTicket.status,
                              priority: e.target.value,
                            })
                          }
                          aria-label="Update ticket priority"
                          className="h-8 rounded-md border border-input bg-background px-2 py-0.5 text-xs shadow-sm w-full"
                        >
                          <option value="LOW">LOW</option>
                          <option value="NORMAL">NORMAL</option>
                          <option value="HIGH">HIGH</option>
                          <option value="URGENT">URGENT</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Conversation History / Thread */}
                <Card className="p-5 bg-card border-border shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      Conversation History & Internal Notes
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {1 + (selectedTicket.messages?.length || 0)} Entries
                    </Badge>
                  </div>

                  <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                    {/* Original Ticket Description */}
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">
                          {selectedTicket.name} <span className="text-muted-foreground font-normal">(Initial Inquiry)</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(selectedTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {selectedTicket.message}
                      </p>
                    </div>

                    {/* Subsequent Replies & Internal Notes */}
                    {selectedTicket.messages?.map((msg) => {
                      if (msg.is_internal_note) {
                        return (
                          <div
                            key={msg.id}
                            className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-amber-500" />
                                <span className="font-bold text-amber-400">
                                  {msg.sender_name} ({msg.sender_role})
                                </span>
                                <Badge variant="warning" className="text-[9px] uppercase py-0 px-1 font-mono">
                                  INTERNAL STAFF NOTE (HIDDEN)
                                </Badge>
                              </div>
                              <span className="text-[10px] text-amber-400/80 font-mono">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-amber-200/90 leading-relaxed whitespace-pre-wrap font-mono">
                              {msg.message}
                            </p>
                          </div>
                        );
                      }

                      const isStaffReply = ['SUPPORT', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(msg.sender_role);

                      return (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-xl border space-y-1.5 ${
                            isStaffReply
                              ? 'bg-primary/5 border-primary/20 ml-4'
                              : 'bg-secondary/40 border-border mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              {msg.sender_name}
                              {isStaffReply && (
                                <Badge variant="copper" className="text-[9px] py-0 px-1 font-mono">
                                  {msg.sender_role}
                                </Badge>
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                            {msg.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply & Internal Note Form */}
                  <form onSubmit={handleSendReply} className="pt-3 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                          <input
                            type="checkbox"
                            checked={isInternalNote}
                            onChange={(e) => setIsInternalNote(e.target.checked)}
                            className="rounded border-input text-amber-500 focus:ring-amber-500"
                          />
                          <span className={isInternalNote ? 'text-amber-400 font-bold flex items-center gap-1' : 'text-muted-foreground'}>
                            {isInternalNote && <Lock className="w-3 h-3" />}
                            Write Private Internal Staff Note
                          </span>
                        </label>
                      </div>

                      {/* Quick templates */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setReplyText('Thank you for reaching out. Our staff has investigated the match log and we are verifying your USDC balance now.')}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline"
                        >
                          + Match Log Template
                        </button>
                      </div>
                    </div>

                    <Textarea
                      rows={3}
                      placeholder={
                        isInternalNote
                          ? 'Enter private internal note visible ONLY to staff & admins (audit trail)...'
                          : 'Type reply visible to the player...'
                      }
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className={`text-xs ${
                        isInternalNote
                          ? 'border-amber-500/50 bg-amber-500/5 focus:border-amber-500'
                          : ''
                      }`}
                    />

                    <div className="flex justify-between items-center">
                      <p className="text-[11px] text-muted-foreground">
                        {isInternalNote
                          ? '🔒 Internal notes will NOT be emailed or shown to user.'
                          : 'Public response will be logged and dispatched to the ticket owner.'}
                      </p>

                      <Button
                        type="submit"
                        size="sm"
                        disabled={replyMutation.isPending || !replyText.trim()}
                        className={`text-xs font-bold gap-1.5 ${
                          isInternalNote ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        {replyMutation.isPending
                          ? 'Posting...'
                          : isInternalNote
                          ? 'Post Internal Note'
                          : 'Send Response'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
