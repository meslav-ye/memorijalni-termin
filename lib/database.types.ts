export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      group_members: {
        Row: {
          group_id: string
          joined_at: string | null
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          default_capacity: number
          default_min_players: number
          description: string | null
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_capacity?: number
          default_min_players?: number
          description?: string | null
          id?: string
          invite_code?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_capacity?: number
          default_min_players?: number
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          group_id: string
          id: string
          maps_url: string | null
          name: string
        }
        Insert: {
          address?: string | null
          group_id: string
          id?: string
          maps_url?: string | null
          name: string
        }
        Update: {
          address?: string | null
          group_id?: string
          id?: string
          maps_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          assist_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          elapsed_seconds: number
          id: string
          match_id: string
          scorer_id: string | null
          team: Database["public"]["Enums"]["team_side"] | null
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          assist_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          elapsed_seconds?: number
          id?: string
          match_id: string
          scorer_id?: string | null
          team?: Database["public"]["Enums"]["team_side"] | null
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          assist_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          elapsed_seconds?: number
          id?: string
          match_id?: string
          scorer_id?: string | null
          team?: Database["public"]["Enums"]["team_side"] | null
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "match_events_assist_id_fkey"
            columns: ["assist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_scorer_id_fkey"
            columns: ["scorer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lineup: {
        Row: {
          is_goalkeeper: boolean
          match_id: string
          team: Database["public"]["Enums"]["team_side"]
          user_id: string
        }
        Insert: {
          is_goalkeeper?: boolean
          match_id: string
          team: Database["public"]["Enums"]["team_side"]
          user_id: string
        }
        Update: {
          is_goalkeeper?: boolean
          match_id?: string
          team?: Database["public"]["Enums"]["team_side"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_lineup_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineup_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_signups: {
        Row: {
          cancelled_at: string | null
          id: string
          manual_order: number | null
          match_id: string
          signed_up_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          id?: string
          manual_order?: number | null
          match_id: string
          signed_up_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          id?: string
          manual_order?: number | null
          match_id?: string
          signed_up_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_signups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_signups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          capacity: number
          created_at: string
          created_by: string
          ended_at: string | null
          group_id: string
          id: string
          location_id: string | null
          location_text: string | null
          min_players: number
          notes: string | null
          paused_at: string | null
          score_a: number
          score_b: number
          season_id: string
          started_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["match_status"]
          total_paused_seconds: number
        }
        Insert: {
          capacity?: number
          created_at?: string
          created_by: string
          ended_at?: string | null
          group_id: string
          id?: string
          location_id?: string | null
          location_text?: string | null
          min_players?: number
          notes?: string | null
          paused_at?: string | null
          score_a?: number
          score_b?: number
          season_id: string
          started_at?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["match_status"]
          total_paused_seconds?: number
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string
          ended_at?: string | null
          group_id?: string
          id?: string
          location_id?: string | null
          location_text?: string | null
          min_players?: number
          notes?: string | null
          paused_at?: string | null
          score_a?: number
          score_b?: number
          season_id?: string
          started_at?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["match_status"]
          total_paused_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_ratings: {
        Row: {
          group_id: string
          matches_played: number
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          matches_played?: number
          rating?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          matches_played?: number
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          can_create_groups: boolean
          created_at: string
          full_name: string
          id: string
          is_goalkeeper: boolean
          nickname: string
        }
        Insert: {
          avatar_url?: string | null
          can_create_groups?: boolean
          created_at?: string
          full_name?: string
          id: string
          is_goalkeeper?: boolean
          nickname?: string
        }
        Update: {
          avatar_url?: string | null
          can_create_groups?: boolean
          created_at?: string
          full_name?: string
          id?: string
          is_goalkeeper?: boolean
          nickname?: string
        }
        Relationships: []
      }
      rating_history: {
        Row: {
          id: string
          match_id: string
          rating_after: number
          rating_before: number
          user_id: string
        }
        Insert: {
          id?: string
          match_id: string
          rating_after: number
          rating_before: number
          user_id: string
        }
        Update: {
          id?: string
          match_id?: string
          rating_after?: number
          rating_before?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          ends_on: string
          group_id: string
          id: string
          name: string
          starts_on: string
        }
        Insert: {
          ends_on: string
          group_id: string
          id?: string
          name: string
          starts_on: string
        }
        Update: {
          ends_on?: string
          group_id?: string
          id?: string
          name?: string
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_rating: {
        Args: { p_group: string; p_rating: number; p_user: string }
        Returns: undefined
      }
      broj_mojih_grupa: { Args: never; Returns: number }
      is_group_admin: { Args: { g: string }; Returns: boolean }
      is_group_member: { Args: { g: string }; Returns: boolean }
      is_in_lineup: { Args: { m: string }; Returns: boolean }
      match_group: { Args: { m: string }; Returns: string }
      smijem_otvarati_grupe: { Args: never; Returns: boolean }
    }
    Enums: {
      event_type: "goal" | "own_goal" | "keeper_change" | "pause" | "resume"
      match_status:
        | "najavljen"
        | "zakljucan"
        | "u_tijeku"
        | "zavrsen"
        | "otkazan"
      member_role: "admin" | "member"
      member_status: "pending" | "active" | "removed"
      team_side: "A" | "B"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      event_type: ["goal", "own_goal", "keeper_change", "pause", "resume"],
      match_status: [
        "najavljen",
        "zakljucan",
        "u_tijeku",
        "zavrsen",
        "otkazan",
      ],
      member_role: ["admin", "member"],
      member_status: ["pending", "active", "removed"],
      team_side: ["A", "B"],
    },
  },
} as const

