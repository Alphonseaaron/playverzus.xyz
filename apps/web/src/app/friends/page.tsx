'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FriendList } from '../../components/FriendList';
import { apiClient } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Users, UserPlus } from 'lucide-react';
import { notifyUser } from '../../lib/notifications';

interface FriendItem {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
}

export default function FriendsPage() {
  const [addresseeId, setAddresseeId] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: me } = useQuery<{ id: string }>({
    queryKey: ['me'],
    queryFn: () => apiClient<{ id: string }>('/profile/me'),
  });

  const { data: friends, refetch } = useQuery<FriendItem[]>({
    queryKey: ['friends'],
    queryFn: () => apiClient<FriendItem[]>('/social/friends'),
  });

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addresseeId.trim()) return;
    setLoading(true);

    try {
      await apiClient('/social/friends/request', {
        method: 'POST',
        body: JSON.stringify({ addresseeId: addresseeId.trim() }),
      });
      notifyUser('Friend request sent!', { body: 'They will be notified.', type: 'match' });
      setAddresseeId('');
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notifyUser('Request failed', { body: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto my-6">
      {/* Page Header */}
      <Card className="p-6 sm:p-8 bg-card border-border shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center text-primary flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="copper">COMMUNITY & SOCIAL</Badge>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {friends?.length || 0} CONNECTIONS
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Friends & Squad Connections
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Connect with competitors to challenge them to private 1v1 duels or party lobbies.
            </p>
          </div>
        </div>
      </Card>

      {/* Add Friend Input */}
      <Card className="p-5 bg-card border-border shadow-sm">
        <form onSubmit={handleAddFriend} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Enter player user UUID or Gamer ID..."
              value={addresseeId}
              onChange={(e) => setAddresseeId(e.target.value)}
              className="text-xs"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !addresseeId.trim()}
            variant="default"
            className="font-bold text-xs gap-1.5 shadow-md shadow-primary/20 flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Sending...' : 'Send Friend Request'}</span>
          </Button>
        </form>
      </Card>

      {/* Friends List */}
      <FriendList friends={friends ?? []} currentUserId={me?.id ?? ''} />
    </div>
  );
}
