import type { TypedSupabaseClient } from '@playverzus/db';
import { namedLogger } from '../logger';

const log = namedLogger('FriendshipService');

export interface FriendshipRecord {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  createdAt: Date;
}

export class FriendshipService {
  constructor(private readonly client: TypedSupabaseClient) {}

  async sendRequest(requesterId: string, addresseeId: string): Promise<FriendshipRecord> {
    const { data, error } = await this.client
      .from('friendships')
      .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'PENDING' })
      .select('*')
      .single();

    if (error) {
      log.warn({ error: error.message, requesterId, addresseeId }, 'friendship request failed');
      throw new Error(error.message);
    }

    return {
      id: data.id,
      requesterId: data.requester_id,
      addresseeId: data.addressee_id,
      status: data.status,
      createdAt: new Date(data.created_at),
    };
  }

  async acceptRequest(friendshipId: string, userId: string): Promise<void> {
    const { error } = await this.client
      .from('friendships')
      .update({ status: 'ACCEPTED', updated_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .eq('addressee_id', userId);

    if (error) throw new Error(error.message);
  }

  async blockUser(requesterId: string, targetId: string): Promise<void> {
    const { error } = await this.client
      .from('friendships')
      .upsert({
        requester_id: requesterId,
        addressee_id: targetId,
        status: 'BLOCKED',
        updated_at: new Date().toISOString(),
      });

    if (error) throw new Error(error.message);
  }

  async listFriends(userId: string): Promise<FriendshipRecord[]> {
    const { data, error } = await this.client
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'ACCEPTED');

    if (error || !data) return [];
    return data.map((f) => ({
      id: f.id,
      requesterId: f.requester_id,
      addresseeId: f.addressee_id,
      status: f.status,
      createdAt: new Date(f.created_at),
    }));
  }
}
