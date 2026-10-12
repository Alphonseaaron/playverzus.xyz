import { Injectable, BadRequestException } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { FriendshipService } from '@playverzus/core';

@Injectable()
export class SocialService {
  private supabase: TypedSupabaseClient;
  private friendshipService: FriendshipService;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
    this.friendshipService = new FriendshipService(this.supabase);
  }

  async listFriends(userId: string) {
    const friends = await this.friendshipService.listFriends(userId);
    if (!friends || friends.length === 0) return [];

    const friendIds = Array.from(
      new Set(
        friends
          .map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId))
          .filter(Boolean),
      ),
    );
    if (friendIds.length === 0) return friends;

    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, username, region')
      .in('id', friendIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        {
          username: p.username,
          countryCode: ((p as Record<string, unknown>).country_code as string) || p.region || undefined,
        },
      ]),
    );

    return friends.map((f) => {
      const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId;
      const prof = profileMap.get(friendId);
      return {
        ...f,
        friendUsername: prof?.username,
        friendCountryCode: prof?.countryCode,
      };
    });
  }

  async requestFriend(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }
    return this.friendshipService.sendRequest(requesterId, addresseeId);
  }

  async acceptFriend(friendshipId: string, userId: string) {
    return this.friendshipService.acceptRequest(friendshipId, userId);
  }

  async blockUser(requesterId: string, targetId: string) {
    if (requesterId === targetId) {
      throw new BadRequestException('You cannot block yourself');
    }
    return this.friendshipService.blockUser(requesterId, targetId);
  }
}
