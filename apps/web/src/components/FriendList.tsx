'use client';

import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { CountryFlag } from './CountryFlag';
import { Users, Swords } from 'lucide-react';
import Link from 'next/link';

interface Friend {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  friendUsername?: string;
  friendCountryCode?: string;
}

interface FriendListProps {
  friends: Friend[];
  currentUserId: string;
}

export function FriendList({ friends, currentUserId }: FriendListProps) {
  if (friends.length === 0) {
    return (
      <Card className="p-12 text-center bg-card border-border">
        <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
          No Friends Added Yet
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Send a request using a player's ID above to start challenging friends to private duels.
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-xl">
      <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm uppercase font-mono font-bold text-foreground tracking-wider">
            Connected Competitors
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {friends.length} player{friends.length > 1 ? 's' : ''} on your roster
          </span>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px]">
          READY TO DUEL
        </Badge>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-border">
        {friends.map((f) => {
          const friendId = f.requesterId === currentUserId ? f.addresseeId : f.requesterId;
          const displayTag = f.friendUsername ? `@${f.friendUsername}` : `Player #${friendId.slice(0, 8)}`;
          const initials = (f.friendUsername || friendId).slice(0, 2).toUpperCase();

          return (
            <div key={f.id} className="p-4 flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarFallback className="bg-secondary text-primary font-bold text-xs font-mono">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CountryFlag
                      code={f.friendCountryCode}
                      fallbackSeed={f.friendUsername || friendId}
                      size="sm"
                    />
                    <span className="font-bold text-sm text-foreground truncate">
                      {displayTag}
                    </span>
                    <Badge variant="success" className="text-[9px] font-mono px-1 py-0">
                      ONLINE
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    ID: {friendId}
                  </span>
                </div>
              </div>

              <Link href={`/matches/new?opponent=${friendId}`}>
                <Button variant="secondary" size="sm" className="font-bold text-xs gap-1.5 flex-shrink-0 hover:bg-primary hover:text-primary-foreground transition-all">
                  <Swords className="w-3.5 h-3.5" />
                  <span>Challenge</span>
                </Button>
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
