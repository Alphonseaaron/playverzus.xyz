import { Injectable } from '@nestjs/common';
import { createServiceClient, TypedSupabaseClient } from '@playverzus/db';
import { MatchService as CoreMatchService, StreamIngestService, type LinkedStream } from '@playverzus/core';

@Injectable()
export class StreamService {
  private supabase: TypedSupabaseClient;
  private ingestService: StreamIngestService;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
    this.supabase = createServiceClient(url, key);
    const coreMatchService = new CoreMatchService({ client: this.supabase });
    this.ingestService = new StreamIngestService({ matchService: coreMatchService });
  }

  async linkStream(stream: LinkedStream) {
    const { data: match } = await this.supabase
      .from('matches')
      .select('*, game_profiles(*)')
      .eq('id', stream.matchId)
      .single();

    if (match && match.game_profiles) {
      const profile = {
        id: match.game_profiles.id,
        displayName: match.game_profiles.display_name,
        gameType: match.game_profiles.game_type,
        platform: match.game_profiles.platform,
        roi: match.game_profiles.roi as never,
        constraints: match.game_profiles.constraints as never,
        endKeywords: match.game_profiles.end_keywords ?? [],
        regexPattern: match.game_profiles.regex_pattern,
        approved: match.game_profiles.approved,
        isOfficial: match.game_profiles.is_official,
      };

      await this.ingestService.startIngest(stream, profile);
    }

    return { success: true, message: `Stream linked for ${stream.platform}` };
  }

  async getStatus(matchId: string) {
    const { data } = await this.supabase
      .from('score_frames')
      .select('source, count')
      .eq('match_id', matchId)
      .eq('source', 'STREAM_INGEST');

    return { matchId, active: true, framesCaptured: data?.length ?? 0 };
  }
}
