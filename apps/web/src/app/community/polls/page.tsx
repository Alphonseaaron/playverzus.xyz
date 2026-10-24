'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Vote,
  Sparkles,
  CheckCircle2,
  Clock,
  Hammer,
  Rocket,
  PlusCircle,
  ThumbsUp,
  MessageSquare,
  Users,
  ArrowRight,
  ShieldAlert,
  Flame,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { apiClient } from '../../../lib/api';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';

interface OptionBreakdown {
  index: number;
  text: string;
  votes: number;
  percent: number;
}

interface CommunityPoll {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'ACTIVE_VOTING' | 'PLANNED' | 'IN_DEVELOPMENT' | 'SHIPPED' | 'CLOSED';
  suggested_by_name?: string | null;
  totalVotes: number;
  userVotedOptionIndex: number | null;
  optionBreakdown: OptionBreakdown[];
  created_at: string;
  closes_at?: string | null;
}

interface UserProfile {
  id: string;
  username: string;
  role: string;
}

export default function CommunityPollsPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE_VOTING' | 'PLANNED' | 'IN_DEVELOPMENT' | 'SHIPPED'>('ACTIVE_VOTING');
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  // Suggestion form inputs
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionCategory, setSuggestionCategory] = useState('FEATURE');
  const [suggestionDescription, setSuggestionDescription] = useState('');
  const [suggestSuccess, setSuggestSuccess] = useState(false);

  // Authenticated user query
  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ['community-polls-current-user'],
    queryFn: () => apiClient<UserProfile>('/profile/me').catch(() => null),
    staleTime: 60000,
  });

  // Polls query
  const { data: polls = [], isLoading: loadingPolls, refetch: refetchPolls } = useQuery<CommunityPoll[]>({
    queryKey: ['community-polls-list', userProfile?.id],
    queryFn: () => apiClient<CommunityPoll[]>('/polls'),
    staleTime: 15000,
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      return apiClient(`/polls/${pollId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionIndex }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-polls-list'] });
    },
  });

  // Suggestion submission mutation
  const suggestMutation = useMutation({
    mutationFn: async (data: { title: string; category: string; description: string }) => {
      return apiClient('/polls/suggest', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setSuggestSuccess(true);
      setTimeout(() => {
        setSuggestSuccess(false);
        setShowSuggestModal(false);
        setSuggestionTitle('');
        setSuggestionDescription('');
      }, 2500);
    },
  });

  const handleVote = (pollId: string, optionIndex: number) => {
    if (!userProfile) {
      alert('Please sign in or register to cast your vote on community polls.');
      return;
    }
    voteMutation.mutate({ pollId, optionIndex });
  };

  const handleSuggestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionTitle.trim() || !suggestionDescription.trim()) return;
    suggestMutation.mutate({
      title: suggestionTitle.trim(),
      category: suggestionCategory,
      description: suggestionDescription.trim(),
    });
  };

  const filteredPolls = polls.filter((p) => {
    if (activeTab === 'ALL') return true;
    return p.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE_VOTING':
        return (
          <Badge variant="copper" className="text-[10px] gap-1 font-mono">
            <Flame className="w-3 h-3 text-purple-400" />
            VOTING LIVE
          </Badge>
        );
      case 'PLANNED':
        return (
          <Badge variant="warning" className="text-[10px] gap-1 font-mono">
            <Clock className="w-3 h-3" />
            PLANNED ON ROADMAP
          </Badge>
        );
      case 'IN_DEVELOPMENT':
        return (
          <Badge variant="default" className="text-[10px] gap-1 font-mono bg-blue-600 text-white">
            <Hammer className="w-3 h-3" />
            IN DEVELOPMENT
          </Badge>
        );
      case 'SHIPPED':
        return (
          <Badge variant="success" className="text-[10px] gap-1 font-mono">
            <Rocket className="w-3 h-3" />
            SHIPPED & LIVE
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-10 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="copper" className="font-mono text-[10px] tracking-wider uppercase">
                COMMUNITY-DRIVEN ROADMAP
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">1 PLAYER = 1 VOTE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Vote on Features & Shape Playverzus
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Have an idea for a new game title, tournament mode, or liquidity payout feature?
              Registered players vote on the product roadmap, and our engineering team builds the top-ranked community requests first.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            {userProfile ? (
              <Button
                onClick={() => setShowSuggestModal(true)}
                size="lg"
                className="font-bold gap-2 text-sm shadow-lg shadow-primary/20"
              >
                <PlusCircle className="w-4 h-4" />
                Suggest a Feature
              </Button>
            ) : (
              <Link href="/login?redirect=/community/polls">
                <Button size="lg" className="font-bold gap-2 text-sm shadow-lg shadow-primary/20">
                  <Vote className="w-4 h-4" />
                  Sign In to Vote & Propose
                </Button>
              </Link>
            )}

            {userProfile && ['SUPPORT', 'COMMUNITY_MANAGER', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile.role) && (
              <Link href="/admin/polls">
                <Button variant="outline" size="lg" className="font-bold gap-2 text-sm">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  Staff Poll Manager
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Status Pipeline Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'ACTIVE_VOTING', label: 'Voting Live', icon: Flame, count: polls.filter(p => p.status === 'ACTIVE_VOTING').length },
          { key: 'PLANNED', label: 'Planned Roadmap', icon: Clock, count: polls.filter(p => p.status === 'PLANNED').length },
          { key: 'IN_DEVELOPMENT', label: 'In Development', icon: Hammer, count: polls.filter(p => p.status === 'IN_DEVELOPMENT').length },
          { key: 'SHIPPED', label: 'Shipped & Live', icon: Rocket, count: polls.filter(p => p.status === 'SHIPPED').length },
          { key: 'ALL', label: 'All Items', icon: Layers, count: polls.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 flex-shrink-0 transition ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background/80 text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Polls Grid */}
      {loadingPolls ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center animate-spin mx-auto text-primary">
            <Vote className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-foreground">Loading community polls...</p>
        </div>
      ) : filteredPolls.length === 0 ? (
        <Card className="p-16 text-center border-dashed">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground">No Items in this Stage</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Be the first registered player to propose a game title or feature for community vote!
          </p>
          {userProfile && (
            <Button onClick={() => setShowSuggestModal(true)} size="sm" className="font-bold text-xs gap-1.5">
              <PlusCircle className="w-3.5 h-3.5" />
              Submit First Feature Idea
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPolls.map((poll) => {
            const hasVoted = poll.userVotedOptionIndex !== null && poll.userVotedOptionIndex !== undefined;
            const isVotingActive = poll.status === 'ACTIVE_VOTING';

            return (
              <Card key={poll.id} className="p-6 bg-card border-border shadow-md flex flex-col justify-between space-y-5">
                {/* Poll Header */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(poll.status)}
                      <span className="text-[10px] font-mono text-muted-foreground uppercase bg-secondary/80 px-2 py-0.5 rounded">
                        {poll.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span>{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}</span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                      {poll.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {poll.description}
                    </p>
                  </div>

                  {poll.suggested_by_name && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                      <Sparkles className="w-3 h-3 text-copper-400" />
                      <span>Suggested by community member: <strong className="text-foreground">@{poll.suggested_by_name}</strong></span>
                    </div>
                  )}
                </div>

                {/* Poll Options & Voting Bars */}
                <div className="space-y-2.5 pt-2 border-t border-border">
                  {poll.optionBreakdown.map((option) => {
                    const isSelected = hasVoted && poll.userVotedOptionIndex === option.index;

                    return (
                      <div
                        key={option.index}
                        className={`relative overflow-hidden rounded-xl border p-3 transition ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border/80 bg-secondary/30 hover:border-border'
                        }`}
                      >
                        {/* Vote percentage bar fill */}
                        <div
                          className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${
                            isSelected
                              ? 'bg-primary/25'
                              : 'bg-secondary/80'
                          }`}
                          style={{ width: `${option.percent}%` }}
                        />

                        {/* Content on top of bar */}
                        <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                            <span className={`font-semibold truncate ${isSelected ? 'text-primary font-bold' : 'text-foreground'}`}>
                              {option.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {option.votes} ({option.percent}%)
                            </span>

                            {isVotingActive && (
                              <Button
                                size="sm"
                                variant={isSelected ? 'default' : 'outline'}
                                disabled={voteMutation.isPending || (hasVoted && !isSelected)}
                                onClick={() => handleVote(poll.id, option.index)}
                                className="h-7 px-2.5 text-[11px] font-bold"
                              >
                                {isSelected ? 'Voted' : hasVoted ? 'Locked' : 'Vote'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer notes */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {hasVoted ? '✓ Your vote is recorded' : isVotingActive ? 'Select an option to cast your vote' : 'Voting has concluded for this stage'}
                  </span>
                  <span>{new Date(poll.created_at).toLocaleDateString()}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Feature Suggestion Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl relative">
            <button
              onClick={() => setShowSuggestModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            {suggestSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Feature Suggestion Received!</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Thank you! Our support and product team reviews all suggestions. If selected, it will be turned into an official live community poll.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSuggestSubmit} className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-primary font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    COMMUNITY PROPOSAL
                  </div>
                  <h3 className="text-xl font-black text-foreground">Propose a New Feature</h3>
                  <p className="text-xs text-muted-foreground">
                    Suggest a game, tournament prize structure, or platform tool you want built.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Feature Title</label>
                  <Input
                    placeholder="e.g., Chess 3-minute blitz tournaments or Mobile App push alerts"
                    value={suggestionTitle}
                    onChange={(e) => setSuggestionTitle(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Category</label>
                  <select
                    value={suggestionCategory}
                    onChange={(e) => setSuggestionCategory(e.target.value)}
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
                  <label className="text-xs font-bold text-foreground">Detailed Description & Benefits</label>
                  <Textarea
                    rows={4}
                    placeholder="Describe how this feature works and why other players will love it..."
                    value={suggestionDescription}
                    onChange={(e) => setSuggestionDescription(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSuggestModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={suggestMutation.isPending || !suggestionTitle.trim() || !suggestionDescription.trim()}
                    className="font-bold text-xs gap-1.5"
                  >
                    {suggestMutation.isPending ? 'Submitting...' : 'Submit to Staff Review'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
