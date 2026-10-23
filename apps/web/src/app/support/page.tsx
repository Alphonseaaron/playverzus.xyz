'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  LifeBuoy,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Mail,
  User,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

interface TicketSummary {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
}

interface TicketDetail extends TicketSummary {
  name: string;
  email: string;
  message: string;
  messages: TicketMessage[];
  assigned_staff?: { id: string; username: string; role: string } | null;
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'NEW_TICKET' | 'MY_TICKETS'>('NEW_TICKET');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [priority, setPriority] = useState('NORMAL');
  const [matchId, setMatchId] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  // Reply input
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Current authenticated user
  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ['support-current-user'],
    queryFn: () => apiClient<UserProfile>('/profile/me').catch(() => null),
    staleTime: 60000,
  });

  // User's tickets query
  const { data: myTickets = [], isLoading: loadingTickets, refetch: refetchTickets } = useQuery<TicketSummary[]>({
    queryKey: ['my-support-tickets'],
    queryFn: async () => {
      if (!userProfile) return [];
      try {
        return await apiClient<TicketSummary[]>('/support/my-tickets');
      } catch {
        return [];
      }
    },
    enabled: Boolean(userProfile),
    staleTime: 10000,
  });

  // Ticket details query
  const { data: ticketDetail, isLoading: loadingDetail, refetch: refetchDetail } = useQuery<TicketDetail | null>({
    queryKey: ['ticket-detail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      return await apiClient<TicketDetail>(`/support/tickets/${selectedTicketId}`);
    },
    enabled: Boolean(selectedTicketId),
    refetchInterval: 5000,
  });

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await apiClient<{ success: boolean; ticketId: string }>('/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim() || userProfile?.username || 'Player',
          email: email.trim() || userProfile?.email || 'player@playverzus.xyz',
          subject: subject.trim(),
          category,
          priority,
          matchId: matchId.trim() || undefined,
          message: message.trim(),
        }),
      });

      setSubmittedTicketId(res.ticketId);
      setSubject('');
      setMessage('');
      setMatchId('');
      if (userProfile) refetchTickets();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit ticket. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicketId || !replyText.trim()) return;
    try {
      setIsReplying(true);
      await apiClient(`/support/tickets/${selectedTicketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText.trim() }),
      });
      setReplyText('');
      refetchDetail();
      refetchTickets();
    } catch (err: any) {
      alert(err?.message || 'Failed to send reply.');
    } finally {
      setIsReplying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning" className="text-[10px]">Awaiting Staff</Badge>;
      case 'ASSIGNED':
      case 'IN_PROGRESS':
        return <Badge variant="default" className="text-[10px]">Staff Reviewing</Badge>;
      case 'WAITING_USER':
        return <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">Action Required</Badge>;
      case 'RESOLVED':
        return <Badge variant="success" className="text-[10px]">Resolved</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary" className="text-[10px]">Closed</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto min-w-0 pb-16">
      {/* Header Banner */}
      <Card className="p-6 sm:p-8 bg-card border border-border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="copper">24/7 Player Concierge</Badge>
              <span className="text-xs text-muted-foreground font-mono">Response Time &lt; 15 mins</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Help Center & Support Desk
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Need assistance with deposits, withdrawals, match disputes, or rules? Our staff is here to help.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/community/polls">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs font-bold">
              <span>Community Feature Polls</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* Tabs / View Selector */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => {
            setActiveTab('NEW_TICKET');
            setSelectedTicketId(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'NEW_TICKET' && !selectedTicketId
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Open New Inquiry</span>
        </button>

        {userProfile && (
          <button
            onClick={() => {
              setActiveTab('MY_TICKETS');
              setSelectedTicketId(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'MY_TICKETS' || selectedTicketId
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>My Support Tickets</span>
            {myTickets.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-background/30 rounded-full text-[10px]">
                {myTickets.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Ticket Details View */}
      {selectedTicketId && ticketDetail ? (
        <Card className="p-6 bg-card border-border space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedTicketId(null)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to My Tickets</span>
              </button>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs text-primary">#{ticketDetail.id}</span>
                <h2 className="text-lg font-bold text-foreground">{ticketDetail.subject}</h2>
                {getStatusBadge(ticketDetail.status)}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                <span>Category: <strong className="text-foreground">{ticketDetail.category}</strong></span>
                <span>Assigned Staff: <strong className="text-foreground">{ticketDetail.assigned_staff?.username ? `@${ticketDetail.assigned_staff.username}` : 'Concierge Queue'}</strong></span>
              </div>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
            {ticketDetail.messages.map((m) => {
              const isStaff = m.sender_role === 'STAFF' || m.sender_role === 'ADMIN';
              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                    isStaff
                      ? 'bg-primary/10 border-primary/30 ml-4'
                      : 'bg-secondary/60 border-border mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {m.sender_name}
                      </span>
                      {isStaff && (
                        <Badge variant="copper" className="text-[9px] py-0 px-1">
                          STAFF
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {m.message}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Reply Form */}
          {ticketDetail.status !== 'CLOSED' ? (
            <div className="space-y-3 pt-4 border-t border-border">
              <Textarea
                placeholder="Type your response to support staff..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                className="text-xs"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!replyText.trim() || isReplying}
                  onClick={handleSendReply}
                  className="gap-1.5 font-bold"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isReplying ? 'Sending...' : 'Send Reply'}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted/40 rounded-xl text-center text-xs text-muted-foreground font-mono">
              This support ticket has been closed. If you have a new question, please open a new inquiry.
            </div>
          )}
        </Card>
      ) : activeTab === 'MY_TICKETS' ? (
        /* My Tickets List */
        <Card className="p-6 bg-card border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Your Previous Inquiries</h2>
            <Button size="sm" variant="secondary" onClick={() => refetchTickets()} className="text-xs">
              Refresh
            </Button>
          </div>

          {loadingTickets ? (
            <div className="p-8 text-center text-xs text-muted-foreground font-mono">
              Loading ticket history...
            </div>
          ) : myTickets.length > 0 ? (
            <div className="space-y-2">
              {myTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className="p-4 rounded-xl bg-secondary/40 border border-border hover:border-primary/50 transition cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">#{t.id}</span>
                      <h3 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {t.subject}
                      </h3>
                      {getStatusBadge(t.status)}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                      <span>Category: {t.category}</span>
                      <span>Updated: {new Date(t.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs text-muted-foreground">You have no active support tickets.</p>
              <Button size="sm" onClick={() => setActiveTab('NEW_TICKET')}>
                Submit An Inquiry
              </Button>
            </div>
          )}
        </Card>
      ) : (
        /* Submit New Ticket Form */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 p-6 sm:p-8 bg-card border-border space-y-6">
            {submittedTicketId ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-foreground">Inquiry Successfully Received!</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                  Your support ticket reference is <strong className="text-emerald-400 font-mono">#{submittedTicketId}</strong>.
                  Our player concierge team has been alerted and will respond shortly.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <Button size="sm" onClick={() => setSelectedTicketId(submittedTicketId)}>
                    View Ticket
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setSubmittedTicketId(null)}>
                    Submit Another
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-foreground">Describe Your Issue</h2>
                  <p className="text-xs text-muted-foreground">
                    Provide detailed information so our team can resolve your inquiry on the first touchpoint.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Your Name</label>
                    <Input
                      required
                      placeholder="Alex Mercer"
                      value={name || userProfile?.username || ''}
                      onChange={(e) => setName(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Contact Email</label>
                    <Input
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={email || userProfile?.email || ''}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border text-foreground rounded-lg text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="GENERAL">General Support</option>
                      <option value="DEPOSIT_WITHDRAWAL">Deposit / Withdrawal (USDC)</option>
                      <option value="MATCH_DISPUTE">Match Dispute / Score Audit</option>
                      <option value="TOURNAMENT">Tournament Bracket Issue</option>
                      <option value="KYC">Identity Verification (KYC)</option>
                      <option value="BUG_REPORT">Technical Bug Report</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border text-foreground rounded-lg text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="LOW">Low - General Question</option>
                      <option value="NORMAL">Normal - Standard Inquiry</option>
                      <option value="HIGH">High - Payment / Cashier</option>
                      <option value="URGENT">Urgent - Active Match Dispute</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Match ID (Optional)</label>
                    <Input
                      placeholder="e.g. m_8a39f1..."
                      value={matchId}
                      onChange={(e) => setMatchId(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Subject</label>
                  <Input
                    required
                    placeholder="Brief summary of your request..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Detailed Message</label>
                  <Textarea
                    required
                    rows={5}
                    placeholder="Provide all relevant details (game, round, wallet address, screenshot details)..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={isSubmitting} className="font-bold gap-2">
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Submitting Inquiry...' : 'Submit Support Ticket'}</span>
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* Quick Support FAQs Card */}
          <div className="space-y-4">
            <Card className="p-5 bg-card border-border space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                Frequently Asked
              </h3>
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">How fast are USDC withdrawals?</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Withdrawals process directly on-chain through Crossmint. Once cleared, funds settle in seconds.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">How does score verification work?</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Our AI autonomous OCR scans final victory frames directly. If both players agree, match prizes disburse instantly.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">Have a feature you want added?</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Check out our Community Polls page to vote on upcoming features and submit ideas!
                  </p>
                  <Link href="/community/polls" className="text-primary hover:underline font-bold inline-flex items-center gap-1 mt-1">
                    <span>Vote on Features</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-card border-border space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-foreground">Official Support Channels</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Direct email: <a href="mailto:support@playverzus.xyz" className="text-primary hover:underline font-mono">support@playverzus.xyz</a>
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
