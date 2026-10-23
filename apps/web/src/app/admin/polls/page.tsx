'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Vote,
  Sparkles,
  PlusCircle,
  Clock,
  Hammer,
  Rocket,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Flame,
  User,
  ArrowRight,
  Filter,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';
import { apiClient } from '../../../lib/api';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';

interface Suggestion {
  id: string;
  user_id: string;
  username: string;
  title: string;
  description: string;
  category: string;
  status: 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED_TO_POLL';
  created_at: string;
}

interface PollOption {
  index: number;
  text: string;
  votes: number;
  percent: number;
}

interface AdminPoll {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'ACTIVE_VOTING' | 'PLANNED' | 'IN_DEVELOPMENT' | 'SHIPPED' | 'CLOSED';
  suggested_by_name?: string | null;
  totalVotes: number;
  options: string[];
  optionBreakdown: PollOption[];
  created_at: string;
}

export default function AdminPollsPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'SUGGESTIONS' | 'POLLS'>('SUGGESTIONS');
  const [suggestionFilter, setSuggestionFilter] = useState<string>('ALL');
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);

  // Create Poll Form State
  const [pollTitle, setPollTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [pollCategory, setPollCategory] = useState('FEATURE');
  const [pollOptions, setPollOptions] = useState<string[]>(['Yes, prioritize this!', 'No, work on something else']);
  const [suggestedByName, setSuggestedByName] = useState<string>('');
  const [suggestedById, setSuggestedById] = useState<string>('');

  // Fetch suggestions
  const {
    data: suggestions = [],
    isLoading: loadingSuggestions,
    refetch: refetchSuggestions,
  } = useQuery<Suggestion[]>({
    queryKey: ['admin-polls-suggestions', suggestionFilter],
    queryFn: async () => {
      const q = suggestionFilter !== 'ALL' ? `?status=${suggestionFilter}` : '';
      return apiClient<Suggestion[]>(`/polls/admin/suggestions${q}`);
    },
    refetchInterval: 15000,
  });

  // Fetch all polls
  const {
    data: polls = [],
    isLoading: loadingPolls,
    refetch: refetchPolls,
  } = useQuery<AdminPoll[]>({
    queryKey: ['admin-polls-list'],
    queryFn: () => apiClient<AdminPoll[]>('/polls'),
    refetchInterval: 15000,
  });

  // Create Poll Mutation
  const createPollMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string;
      category: string;
      options: string[];
      suggestedBy?: string;
      suggestedByName?: string;
    }) => {
      return apiClient('/polls/admin/create-poll', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setShowCreatePollModal(false);
      setPollTitle('');
      setPollDescription('');
      setPollOptions(['Yes, prioritize this!', 'No, work on something else']);
      setSuggestedByName('');
      setSuggestedById('');
      queryClient.invalidateQueries({ queryKey: ['admin-polls-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-polls-suggestions'] });
      setActiveTab('POLLS');
    },
  });

  // Update Poll Roadmap Status Mutation
  const updatePollStatusMutation = useMutation({
    mutationFn: async ({ pollId, status }: { pollId: string; status: string }) => {
      return apiClient(`/polls/admin/${pollId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-polls-list'] });
    },
  });

  // Promote a suggestion into the create poll modal
  const handlePromoteSuggestion = (s: Suggestion) => {
    setPollTitle(s.title);
    setPollDescription(s.description);
    setPollCategory(s.category);
    setSuggestedByName(s.username);
    setSuggestedById(s.user_id);
    setPollOptions(['Strongly Support', 'Support with Modifications', 'Not at this time']);
    setShowCreatePollModal(true);
  };

  const handleAddOption = () => {
    setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`]);
  };

  const handleUpdateOption = (index: number, val: string) => {
    const next = [...pollOptions];
    next[index] = val;
    setPollOptions(next);
  };

  const handleRemoveOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== index));
  };

  const handleCreatePollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollTitle.trim() || !pollDescription.trim() || pollOptions.length < 2) return;

    createPollMutation.mutate({
      title: pollTitle.trim(),
      description: pollDescription.trim(),
      category: pollCategory,
      options: pollOptions.filter((o) => o.trim().length > 0),
      suggestedBy: suggestedById || undefined,
      suggestedByName: suggestedByName || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="copper" className="font-mono text-[10px] tracking-wider uppercase">
              STAFF PRODUCT MANAGEMENT
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">POLLS & ROADMAP DESK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Vote className="w-7 h-7 text-primary" />
            Community Suggestions & Live Polls
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review player-submitted proposals, promote them into official community voting polls, and update product roadmap phases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setPollTitle('');
              setPollDescription('');
              setSuggestedByName('');
              setSuggestedById('');
              setShowCreatePollModal(true);
            }}
            size="sm"
            className="font-bold text-xs gap-1.5 shadow-md shadow-primary/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Launch New Poll
          </Button>

          <Link href="/community/polls" target="_blank">
            <Button variant="secondary" size="sm" className="font-bold text-xs gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Public Polls View
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Tabs: Suggestions vs Active Polls */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('SUGGESTIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'SUGGESTIONS'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Player Proposals ({suggestions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('POLLS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'POLLS'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Vote className="w-3.5 h-3.5" />
          <span>Official Community Polls ({polls.length})</span>
        </button>
      </div>

      {/* TAB 1: Player Proposals / Suggestions */}
      {activeTab === 'SUGGESTIONS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4 bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Filter Status:</span>
              <select
                value={suggestionFilter}
                onChange={(e) => setSuggestionFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="ALL">All Proposals</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="CONVERTED_TO_POLL">Converted to Poll</option>
                <option value="REJECTED">Archived / Rejected</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSuggestions()}
              className="text-xs font-bold gap-1.5 h-8"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
          </div>

          {loadingSuggestions ? (
            <div className="py-20 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Loading community suggestions...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <Card className="p-14 text-center border-dashed">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <h3 className="text-base font-bold text-foreground">No Proposals Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                No user suggestions match the current status filter.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((s) => (
                <Card key={s.id} className="p-5 bg-card border-border shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {s.category}
                      </Badge>
                      <Badge
                        variant={
                          s.status === 'CONVERTED_TO_POLL'
                            ? 'success'
                            : s.status === 'ACCEPTED'
                            ? 'copper'
                            : s.status === 'REJECTED'
                            ? 'secondary'
                            : 'warning'
                        }
                        className="text-[10px] font-mono"
                      >
                        {s.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <h3 className="text-base font-bold text-foreground">{s.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {s.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      <span>By: <strong className="text-foreground">@{s.username}</strong></span>
                      <span>•</span>
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>

                    {s.status !== 'CONVERTED_TO_POLL' && (
                      <Button
                        size="sm"
                        onClick={() => handlePromoteSuggestion(s)}
                        className="font-bold text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Promote to Live Poll
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Official Community Polls & Roadmap Status */}
      {activeTab === 'POLLS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-card border border-border rounded-xl p-3">
            <span className="text-xs font-bold text-muted-foreground">
              MANAGE ACTIVE ROADMAP POLLS ({polls.length})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchPolls()}
              className="text-xs font-bold gap-1.5 h-8"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
          </div>

          {loadingPolls ? (
            <div className="py-20 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Loading active community polls...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {polls.map((poll) => (
                <Card key={poll.id} className="p-5 bg-card border-border shadow-md space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {poll.category}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">
                        {poll.totalVotes} total votes
                      </span>
                    </div>
                    <h3 className="text-base font-black text-foreground">{poll.title}</h3>
                    <p className="text-xs text-muted-foreground">{poll.description}</p>
                    {poll.suggested_by_name && (
                      <p className="text-[11px] text-muted-foreground">
                        Origin: Propose by <strong>@{poll.suggested_by_name}</strong>
                      </p>
                    )}
                  </div>

                  {/* Options & Votes breakdown */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    {poll.optionBreakdown.map((opt) => (
                      <div key={opt.index} className="text-xs space-y-1">
                        <div className="flex justify-between text-muted-foreground font-mono text-[11px]">
                          <span className="text-foreground font-semibold">{opt.text}</span>
                          <span>{opt.votes} votes ({opt.percent}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${opt.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Roadmap Phase Controller */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-muted-foreground">Roadmap Phase:</span>
                    <select
                      value={poll.status}
                      onChange={(e) =>
                        updatePollStatusMutation.mutate({
                          pollId: poll.id,
                          status: e.target.value,
                        })
                      }
                      aria-label="Update poll roadmap status"
                      className="h-8 rounded-md border border-input bg-background px-3 text-xs shadow-sm"
                    >
                      <option value="ACTIVE_VOTING">ACTIVE VOTING</option>
                      <option value="PLANNED">PLANNED (APPROVED)</option>
                      <option value="IN_DEVELOPMENT">IN DEVELOPMENT</option>
                      <option value="SHIPPED">SHIPPED & LIVE</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create / Promote Poll */}
      {showCreatePollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl relative">
            <button
              onClick={() => setShowCreatePollModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleCreatePollSubmit} className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-mono text-primary font-bold">
                  <Vote className="w-3.5 h-3.5" />
                  OFFICIAL COMMUNITY POLL CREATION
                </div>
                <h3 className="text-xl font-black text-foreground">Launch Community Poll</h3>
                <p className="text-xs text-muted-foreground">
                  Publish a voting initiative for registered players to rank priorities.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Poll Title</label>
                <Input
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  placeholder="e.g. Add Counter-Strike 2 5v5 Tournaments"
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Category</label>
                <select
                  value={pollCategory}
                  onChange={(e) => setPollCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="NEW_GAME">New Game Title</option>
                  <option value="TOURNAMENT">Tournament Mechanics & Tiers</option>
                  <option value="PAYMENTS_USDC">USDC & Cashier</option>
                  <option value="UI_UX">User Experience & Mobile</option>
                  <option value="COMMUNITY">Social, Clans & Matchmaking</option>
                  <option value="FEATURE">General Platform Feature</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Description & Context</label>
                <Textarea
                  rows={3}
                  value={pollDescription}
                  onChange={(e) => setPollDescription(e.target.value)}
                  placeholder="Explain the proposal and why players should vote on it..."
                  required
                  className="text-xs"
                />
              </div>

              {/* Voting Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Voting Options (Minimum 2)</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddOption}
                    className="text-[11px] h-7 gap-1"
                  >
                    <PlusCircle className="w-3 h-3" />
                    Add Option
                  </Button>
                </div>

                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-4">{idx + 1}.</span>
                    <Input
                      value={opt}
                      onChange={(e) => handleUpdateOption(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="text-xs flex-1"
                      required
                    />
                    {pollOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(idx)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {suggestedByName && (
                <div className="p-3 bg-secondary/50 rounded-lg text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">Original Community Requester:</span>
                  <Badge variant="copper" className="font-mono">
                    @{suggestedByName}
                  </Badge>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreatePollModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createPollMutation.isPending || !pollTitle.trim() || !pollDescription.trim()}
                  className="font-bold text-xs gap-1.5"
                >
                  {createPollMutation.isPending ? 'Publishing...' : 'Publish to Community'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
