export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GameTypeEnum =
  | 'HIGH_SCORE'
  | 'LOW_TIME'
  | 'SURVIVAL'
  | 'HEAD_TO_HEAD'
  | 'BINARY_RESULT'
  | 'COMPOSITE_STAT'
  | 'PROGRESSION'
  | 'PHYSICAL';

export type PlatformEnum = 'MOBILE' | 'PC' | 'CONSOLE' | 'WEB' | 'PHYSICAL';
export type MatchFormatEnum = 'BO1' | 'BO3' | 'BO5';
export type MatchStatusEnum =
  | 'DRAFT'
  | 'OPEN'
  | 'ACCEPTED'
  | 'LIVE'
  | 'CAPTURING'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'DISPUTED'
  | 'REVIEW'
  | 'SETTLED'
  | 'CANCELLED';

export type TournamentFormatEnum = 'SINGLE_ELIM' | 'DOUBLE_ELIM' | 'ROUND_ROBIN' | 'SWISS';
export type TournamentStatusEnum = 'REGISTRATION' | 'CHECKIN' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type RoleEnum =
  | 'PLAYER'
  | 'REVIEWER'
  | 'ADMIN'
  | 'SUPER_ADMIN'
  | 'SUPPORT'
  | 'TOURNAMENT_ADMIN'
  | 'FINANCE_AUDITOR'
  | 'COMMUNITY_MANAGER';
export type KycStatusEnum = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type FriendshipStatusEnum = 'PENDING' | 'ACCEPTED' | 'BLOCKED';
export type DisputeStatusEnum = 'OPEN' | 'REVIEW' | 'RESOLVED';
export type ReviewStatusEnum = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
export type ScoreSourceEnum = 'CLIENT_OCR' | 'SERVER_OCR' | 'STREAM_INGEST' | 'MANUAL';
export type LockStatusEnum = 'LOCKED' | 'RELEASED' | 'REFUNDED';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          region: string | null;
          phone: string | null;
          trust_score: number;
          role: RoleEnum;
          kyc_status: KycStatusEnum;
          kyc_provider_ref: string | null;
          geoblock_region: string | null;
          is_banned: boolean;
          ban_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          region?: string | null;
          phone?: string | null;
          trust_score?: number;
          role?: RoleEnum;
          kyc_status?: KycStatusEnum;
          kyc_provider_ref?: string | null;
          geoblock_region?: string | null;
          is_banned?: boolean;
          ban_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: FriendshipStatusEnum;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: FriendshipStatusEnum;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['friendships']['Insert']>;
      };
      game_profiles: {
        Row: {
          id: string;
          display_name: string;
          game_type: GameTypeEnum;
          platform: PlatformEnum;
          roi: Json;
          constraints: Json;
          end_keywords: string[];
          regex_pattern: string | null;
          submitted_by: string | null;
          approved: boolean;
          approved_by: string | null;
          is_official: boolean;
          play_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          display_name: string;
          game_type: GameTypeEnum;
          platform: PlatformEnum;
          roi: Json;
          constraints?: Json;
          end_keywords?: string[];
          regex_pattern?: string | null;
          submitted_by?: string | null;
          approved?: boolean;
          approved_by?: string | null;
          is_official?: boolean;
          play_count?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['game_profiles']['Insert']>;
      };
      matches: {
        Row: {
          id: string;
          profile_id: string;
          format: MatchFormatEnum;
          status: MatchStatusEnum;
          player_a: string | null;
          player_b: string | null;
          winner: string | null;
          score_a: Json | null;
          score_b: Json | null;
          confidence: number | null;
          verified_by: string | null;
          tournament_id: string | null;
          room_code: string | null;
          entry_fee: number;
          prize_pool: number;
          sponsored_by: string | null;
          no_show_deadline: string | null;
          bracket_round: number | null;
          bracket_position: number | null;
          bracket_parent_id: string | null;
          next_match_id: string | null;
          is_losers_bracket: boolean;
          created_by: string | null;
          created_at: string;
          started_at: string | null;
          settled_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          format?: MatchFormatEnum;
          status?: MatchStatusEnum;
          player_a?: string | null;
          player_b?: string | null;
          winner?: string | null;
          score_a?: Json | null;
          score_b?: Json | null;
          confidence?: number | null;
          verified_by?: string | null;
          tournament_id?: string | null;
          room_code?: string | null;
          entry_fee?: number;
          prize_pool?: number;
          sponsored_by?: string | null;
          no_show_deadline?: string | null;
          bracket_round?: number | null;
          bracket_position?: number | null;
          bracket_parent_id?: string | null;
          next_match_id?: string | null;
          is_losers_bracket?: boolean;
          created_by?: string | null;
          created_at?: string;
          started_at?: string | null;
          settled_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
      };
      score_frames: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          raw_text: string;
          parsed: Json | null;
          confidence: number;
          is_verified: boolean;
          is_final: boolean;
          image_hash: string | null;
          source: ScoreSourceEnum;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          raw_text: string;
          parsed?: Json | null;
          confidence: number;
          is_verified?: boolean;
          is_final?: boolean;
          image_hash?: string | null;
          source?: ScoreSourceEnum;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['score_frames']['Insert']>;
      };
      tournaments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          profile_id: string;
          format: TournamentFormatEnum;
          size: number;
          entry_fee: number;
          prize_pool: number;
          prize_distribution: Json;
          status: TournamentStatusEnum;
          starts_at: string | null;
          checkin_opens_at: string | null;
          checkin_closes_at: string | null;
          no_show_minutes: number;
          sponsored_by: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          profile_id: string;
          format: TournamentFormatEnum;
          size: number;
          entry_fee?: number;
          prize_pool?: number;
          prize_distribution?: Json;
          status?: TournamentStatusEnum;
          starts_at?: string | null;
          checkin_opens_at?: string | null;
          checkin_closes_at?: string | null;
          no_show_minutes?: number;
          sponsored_by?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tournaments']['Insert']>;
      };
      tournament_entries: {
        Row: {
          id: string;
          tournament_id: string;
          user_id: string;
          seed: number | null;
          checked_in: boolean;
          eliminated: boolean;
          final_placement: number | null;
          prize_awarded: number;
          joined_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          user_id: string;
          seed?: number | null;
          checked_in?: boolean;
          eliminated?: boolean;
          final_placement?: number | null;
          prize_awarded?: number;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tournament_entries']['Insert']>;
      };
      sponsors: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          contact_email: string | null;
          website_url: string | null;
          funded_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          contact_email?: string | null;
          website_url?: string | null;
          funded_amount?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sponsors']['Insert']>;
      };
      ratings: {
        Row: {
          id: string;
          user_id: string;
          game_type: GameTypeEnum;
          rating: number;
          games_played: number;
          wins: number;
          losses: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_type: GameTypeEnum;
          rating?: number;
          games_played?: number;
          wins?: number;
          losses?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ratings']['Insert']>;
      };
      wallets: {
        Row: {
          user_id: string;
          balance: number;
          locked: number;
          lifetime_earned: number;
          currency: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          locked?: number;
          lifetime_earned?: number;
          currency?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['wallets']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          balance_after: number;
          reason: string;
          metadata: Json;
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          balance_after: number;
          reason: string;
          metadata?: Json;
          idempotency_key?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      locks: {
        Row: {
          id: string;
          user_id: string;
          match_id: string | null;
          tournament_id: string | null;
          amount: number;
          status: LockStatusEnum;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id?: string | null;
          tournament_id?: string | null;
          amount: number;
          status?: LockStatusEnum;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['locks']['Insert']>;
      };
      disputes: {
        Row: {
          id: string;
          match_id: string;
          raised_by: string;
          reason: string;
          evidence: string | null;
          status: DisputeStatusEnum;
          resolution: string | null;
          resolved_by: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          match_id: string;
          raised_by: string;
          reason: string;
          evidence?: string | null;
          status?: DisputeStatusEnum;
          resolution?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['disputes']['Insert']>;
      };
      review_tasks: {
        Row: {
          id: string;
          score_frame_id: string | null;
          match_id: string;
          assigned_to: string | null;
          status: ReviewStatusEnum;
          reviewer_note: string | null;
          corrected_value: string | null;
          priority: number;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          score_frame_id?: string | null;
          match_id: string;
          assigned_to?: string | null;
          status?: ReviewStatusEnum;
          reviewer_note?: string | null;
          corrected_value?: string | null;
          priority?: number;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['review_tasks']['Insert']>;
      };
      training_dataset: {
        Row: {
          id: string;
          profile_id: string | null;
          image_hash: string | null;
          ground_truth: string;
          predicted: string | null;
          confidence: number | null;
          source: string | null;
          is_used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          image_hash?: string | null;
          ground_truth: string;
          predicted?: string | null;
          confidence?: number | null;
          source?: string | null;
          is_used?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['training_dataset']['Insert']>;
      };
      seasons: {
        Row: {
          id: string;
          name: string;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          starts_at: string;
          ends_at: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['seasons']['Insert']>;
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      wallet_credit: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_reason: string;
          p_metadata?: Json;
          p_idem?: string | null;
        };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      wallet_debit: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_reason: string;
          p_metadata?: Json;
          p_idem?: string | null;
        };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      wallet_lock: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_match_id?: string | null;
          p_tournament_id?: string | null;
        };
        Returns: Database['public']['Tables']['locks']['Row'];
      };
      wallet_settle: {
        Args: {
          p_match_id: string;
          p_winner_id: string;
          p_amount?: number | null;
        };
        Returns: void;
      };
      wallet_refund: {
        Args: {
          p_match_id: string;
        };
        Returns: void;
      };
      wallet_refund_tournament: {
        Args: {
          p_tournament_id: string;
        };
        Returns: void;
      };
      create_match: {
        Args: {
          p_creator: string;
          p_profile_id: string;
          p_player_a: string;
          p_player_b: string | null;
          p_format?: MatchFormatEnum;
          p_room_code?: string | null;
        };
        Returns: Database['public']['Tables']['matches']['Row'];
      };
      accept_match: {
        Args: {
          p_match_id: string;
          p_user_id: string;
        };
        Returns: Database['public']['Tables']['matches']['Row'];
      };
      start_match: {
        Args: {
          p_match_id: string;
        };
        Returns: Database['public']['Tables']['matches']['Row'];
      };
      submit_score: {
        Args: {
          p_match_id: string;
          p_player_id: string;
          p_raw_text: string;
          p_confidence: number;
          p_is_final: boolean;
          p_image_hash?: string | null;
          p_source?: ScoreSourceEnum;
          p_parsed?: Json | null;
        };
        Returns: Database['public']['Tables']['score_frames']['Row'];
      };
      create_tournament: {
        Args: {
          p_creator: string;
          p_name: string;
          p_profile_id: string;
          p_format: TournamentFormatEnum;
          p_size: number;
          p_entry_fee?: number;
          p_prize_pool?: number;
          p_starts_at?: string | null;
          p_prize_distribution?: Json;
        };
        Returns: Database['public']['Tables']['tournaments']['Row'];
      };
      join_tournament: {
        Args: {
          p_tournament_id: string;
          p_user_id: string;
        };
        Returns: Database['public']['Tables']['tournament_entries']['Row'];
      };
      checkin_tournament: {
        Args: {
          p_tournament_id: string;
          p_user_id: string;
        };
        Returns: Database['public']['Tables']['tournament_entries']['Row'];
      };
      update_rating: {
        Args: {
          p_user_id: string;
          p_game_type: GameTypeEnum;
          p_won: boolean;
        };
        Returns: Database['public']['Tables']['ratings']['Row'];
      };
      enqueue_review_task: {
        Args: {
          p_score_frame_id: string;
          p_match_id: string;
          p_priority: number;
        };
        Returns: Database['public']['Tables']['review_tasks']['Row'];
      };
      resolve_review_task: {
        Args: {
          p_task_id: string;
          p_reviewer: string;
          p_status: ReviewStatusEnum;
          p_corrected?: string | null;
          p_note?: string | null;
        };
        Returns: Database['public']['Tables']['review_tasks']['Row'];
      };
      create_season: {
        Args: {
          p_name: string;
          p_starts_at: string;
          p_ends_at: string;
        };
        Returns: Database['public']['Tables']['seasons']['Row'];
      };
      reset_season_ratings: {
        Args: {
          p_season_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      game_type_enum: GameTypeEnum;
      platform_enum: PlatformEnum;
      match_format_enum: MatchFormatEnum;
      match_status_enum: MatchStatusEnum;
      tournament_format_enum: TournamentFormatEnum;
      tournament_status_enum: TournamentStatusEnum;
      role_enum: RoleEnum;
      kyc_status_enum: KycStatusEnum;
      friendship_status_enum: FriendshipStatusEnum;
      dispute_status_enum: DisputeStatusEnum;
      review_status_enum: ReviewStatusEnum;
      score_source_enum: ScoreSourceEnum;
      lock_status_enum: LockStatusEnum;
    };
  };
}
