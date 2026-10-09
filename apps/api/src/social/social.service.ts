import { Injectable } from '@nestjs/common';
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
    return this.friendshipService.listFriends(userId);
  }

  async requestFriend(requesterId: string, addresseeId: string) {
    return this.friendshipService.sendRequest(requesterId, addresseeId);
  }

  async acceptFriend(friendshipId: string, userId: string) {
    return this.friendshipService.acceptRequest(friendshipId, userId);
  }

  async blockUser(requesterId: string, targetId: string) {
    return this.friendshipService.blockUser(requesterId, targetId);
  }
}
