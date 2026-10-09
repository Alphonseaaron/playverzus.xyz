import type { TypedSupabaseClient } from '@playverzus/db';
import { namedLogger } from '../logger';

const log = namedLogger('NotificationService');

export interface AppNotification {
  userId: string;
  type: 'MATCH_ACCEPTED' | 'SCORE_SUBMITTED' | 'MATCH_SETTLED' | 'TOURNAMENT_STARTING' | 'FRIEND_REQUEST';
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  constructor(private readonly client: TypedSupabaseClient) {}

  async notify(notification: AppNotification): Promise<void> {
    log.info({ notification }, 'dispatching notification');
    // Audit log can store notifications and trigger Supabase realtime
    const { error } = await this.client
      .from('audit_log')
      .insert({
        actor_id: notification.userId,
        action: `notify.${notification.type.toLowerCase()}`,
        entity_type: 'notification',
        metadata: {
          title: notification.title,
          body: notification.body,
          ...(notification.metadata ?? {}),
        },
      });

    if (error) {
      log.warn({ err: error.message }, 'failed to persist notification');
    }
  }
}
