import { Injectable, NotFoundException } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';

@Injectable()
export class ReviewService {
  private supabase: TypedSupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
  }

  async getQueue() {
    const { data, error } = await this.supabase
      .from('review_tasks')
      .select('*, score_frames(*), matches(*)')
      .eq('status', 'PENDING')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw new Error(error.message);
    return data;
  }

  async resolveTask(
    taskId: string,
    reviewerId: string,
    status: 'APPROVED' | 'REJECTED' | 'CORRECTED',
    note?: string,
    correctedValue?: string,
  ) {
    const { data, error } = await this.supabase.rpc('resolve_review_task', {
      p_task_id: taskId,
      p_reviewer: reviewerId,
      p_status: status,
      p_corrected: correctedValue ?? null,
      p_note: note ?? null,
    });

    if (error) throw new NotFoundException(error.message);
    return data;
  }
}
