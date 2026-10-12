'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  MessageSquare,
  Swords,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Crown,
  Plus,
  X,
  Send,
} from 'lucide-react';
import { usePartyStore } from '../lib/partyStore';
import { useGameStore } from '../lib/gameStore';
import { apiClient } from '../lib/api';
import { notifyUser } from '../lib/notifications';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { CountryFlag } from './CountryFlag';

export function PartyBar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    members,
    maxSlots,
    status,
    isChatOpen,
    messages,
    inviteCode,
    toggleReady,
    setQueueStatus,
    toggleChat,
    sendMessage,
    setUserProfile,
  } = usePartyStore();

  const { activeGame } = useGameStore();

  const { data: userProfile } = useQuery<{ id: string; username: string; rating?: number; country_code?: string; region?: string } | null>({
    queryKey: ['party-bar-profile'],
    queryFn: () => apiClient<{ id: string; username: string; rating?: number; country_code?: string; region?: string }>('/profile/me').catch(() => null),
    staleTime: 60000,
  });

  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Sync real profile into party member state
  useEffect(() => {
    if (userProfile?.username) {
      setUserProfile(userProfile.username, userProfile.rating ?? 1000);
    }
  }, [userProfile, setUserProfile]);

  const emptySlotsCount = Math.max(0, maxSlots - members.length);
  const me = members.find((m) => m.id === 'me') || members[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    notifyUser('Squad Invite Copied!', {
      body: `Code ${inviteCode} copied to clipboard. Share with your teammates.`,
      sound: 'score',
      type: 'party',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActionClick = () => {
    if (!userProfile) {
      router.push('/login');
      return;
    }
    if (status === 'IN_QUEUE') {
      setQueueStatus('IDLE');
    } else {
      setQueueStatus('IN_QUEUE');
      router.push(`/matches/new${activeGame ? `?profileId=${activeGame.id}` : ''}`);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(me?.username || 'You', chatInput);
    setChatInput('');
  };

  // Hide squad bar on public marketing landing page and admin panel
  if (pathname === '/' || pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* Slide-Up Party Chat Drawer */}
      {isChatOpen && (
        <div className="fixed bottom-16 sm:bottom-20 right-3 sm:right-6 z-50 w-80 sm:w-96 bg-card border border-border rounded-t-2xl shadow-2xl flex flex-col overflow-hidden text-foreground animate-in slide-in-from-bottom duration-200">
          <div className="p-3 bg-muted/60 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-bold text-xs">Squad Comms</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {members.length} in squad
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 text-muted-foreground hover:text-foreground"
              onClick={toggleChat}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-3 h-64 overflow-y-auto flex flex-col gap-2 scrollbar-thin text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-2.5 rounded-lg ${
                  m.sender === 'SYSTEM'
                    ? 'bg-primary/10 border border-primary/20 text-muted-foreground text-[11px]'
                    : m.sender === (me?.username || 'You')
                    ? 'bg-primary/20 ml-6 text-foreground font-medium'
                    : 'bg-muted mr-6 text-foreground'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span className="font-semibold">{m.sender}</span>
                  <span>{m.timestamp}</span>
                </div>
                <p className="leading-snug">{m.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="p-2.5 bg-muted/40 border-t border-border flex gap-2">
            <Input
              type="text"
              placeholder="Party message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="h-8 text-xs bg-background"
            />
            <Button type="submit" size="sm" className="h-8 px-3 gap-1">
              <Send className="w-3 h-3" />
            </Button>
          </form>
        </div>
      )}

      {/* When Minimized: Sleek Floating Squad Pill */}
      {isMinimized ? (
        <div className="fixed bottom-4 right-4 z-40">
          <Button
            variant="secondary"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full shadow-2xl border border-border hover:border-primary/50 text-xs font-bold"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Squad ({members.length}/{maxSlots})</span>
            <span className="text-primary font-mono">· Duel</span>
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      ) : (
        /* Main Bottom Dock Bar */
        <aside
          aria-label="Party dock"
          className="fixed bottom-0 left-0 lg:left-64 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border h-16 flex items-center justify-between px-3 sm:px-6 text-foreground shadow-2xl"
        >
          {/* Left: Party Info & Active Game */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-mono">
                Squad ({members.length}/{maxSlots})
              </span>
              <span className="text-xs font-bold text-foreground truncate max-w-[130px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="truncate">{activeGame?.displayName || 'Select Game'}</span>
              </span>
            </div>

            {/* Member Slots */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {members.map((member) => {
                const displayName = member.id === 'me' && userProfile?.username ? userProfile.username : member.username;
                const displayElo = member.id === 'me' && userProfile?.rating ? userProfile.rating : member.elo;
                const displayLevel = Math.min(10, Math.max(1, Math.floor(displayElo / 200) + 1));
                const memberCountry = member.id === 'me' ? userProfile?.country_code || userProfile?.region : undefined;

                return (
                  <div
                    key={member.id}
                    className="relative group cursor-pointer flex-shrink-0"
                    title={`${displayName} (Lvl ${displayLevel} · ${displayElo} Elo)`}
                    onClick={() => member.id === 'me' && toggleReady()}
                  >
                    <div
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs bg-muted transition ${
                        member.isReady ? 'border-emerald-500 text-emerald-400' : 'border-primary text-foreground'
                      }`}
                    >
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Country Flag Pip */}
                    <span className="absolute -bottom-1 -left-1">
                      <CountryFlag code={memberCountry} fallbackSeed={displayName} size="xs" />
                    </span>

                    {/* Level Badge Pip */}
                    <span className="absolute -bottom-1 -right-1 bg-background border border-border px-1 rounded text-[9px] font-mono font-bold text-muted-foreground">
                      {displayLevel}
                    </span>

                    {/* Leader Crown */}
                    {member.isLeader && (
                      <Crown className="w-3 h-3 text-amber-400 absolute -top-2 left-1/2 -translate-x-1/2" />
                    )}
                  </div>
                );
              })}

              {/* Responsive Empty Slot Add Button */}
              {emptySlotsCount > 0 && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="w-9 h-9 rounded-full border border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary flex items-center justify-center text-xs font-bold transition bg-muted/40 flex-shrink-0"
                  title="Click to copy squad invite code to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Toggle Party Chat */}
            <Button
              variant={isChatOpen ? 'default' : 'secondary'}
              size="sm"
              onClick={toggleChat}
              className="gap-1.5 h-9"
              title="Toggle squad chat"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-xs">Chat</span>
            </Button>

            {/* Ready Status Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleReady()}
              className={`gap-1.5 h-9 font-bold text-xs ${
                me?.isReady
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                  : 'border-border text-muted-foreground'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${me?.isReady ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
              <span className="hidden sm:inline">{me?.isReady ? 'READY' : 'NOT READY'}</span>
            </Button>

            {/* Master "PLAY VS" Button */}
            <Button
              variant={status === 'IN_QUEUE' ? 'destructive' : 'default'}
              size="sm"
              onClick={handleActionClick}
              className="h-9 px-4 font-bold tracking-wider uppercase gap-1.5 shadow-sm"
            >
              <Swords className="w-4 h-4" />
              <span>{status === 'IN_QUEUE' ? 'IN QUEUE' : 'PLAY 1V1'}</span>
            </Button>

            {/* Minimize Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
              title="Minimize squad dock"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </aside>
      )}
    </>
  );
}
