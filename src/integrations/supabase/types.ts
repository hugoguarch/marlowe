export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      action_queue: {
        Row: {
          brand_id: string | null
          created_at: string
          detail: string | null
          id: string
          kind: string
          label: string
          status: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          label: string
          status?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          label?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_queue_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_assets: {
        Row: {
          brand_id: string
          created_at: string
          file_name: string | null
          file_path: string
          id: string
          is_primary: boolean
          kind: string
          meta: Json
          mime_type: string | null
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          file_name?: string | null
          file_path: string
          id?: string
          is_primary?: boolean
          kind?: string
          meta?: Json
          mime_type?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          file_name?: string | null
          file_path?: string
          id?: string
          is_primary?: boolean
          kind?: string
          meta?: Json
          mime_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_assets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_brain: {
        Row: {
          audience: string | null
          brand_id: string
          created_at: string
          id: string
          learned: Json
          logo_url: string | null
          palette: Json
          personas: Json
          tone_of_voice: Json
          typography: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string | null
          brand_id: string
          created_at?: string
          id?: string
          learned?: Json
          logo_url?: string | null
          palette?: Json
          personas?: Json
          tone_of_voice?: Json
          typography?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string | null
          brand_id?: string
          created_at?: string
          id?: string
          learned?: Json
          logo_url?: string | null
          palette?: Json
          personas?: Json
          tone_of_voice?: Json
          typography?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_brain_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          daily_target: number
          id: string
          is_default: boolean
          logo_url: string | null
          name: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          daily_target?: number
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          daily_target?: number
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          brand_id: string | null
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          body: string
          brand_id?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          body?: string
          brand_id?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meta_connections: {
        Row: {
          ad_account_ids: string[]
          client_id: string
          fb_page_id: string | null
          fb_page_name: string | null
          ig_user_id: string | null
          ig_username: string | null
          updated_at: string
        }
        Insert: {
          ad_account_ids?: string[]
          client_id: string
          fb_page_id?: string | null
          fb_page_name?: string | null
          ig_user_id?: string | null
          ig_username?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_ids?: string[]
          client_id?: string
          fb_page_id?: string | null
          fb_page_name?: string | null
          ig_user_id?: string | null
          ig_username?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_meta_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "pulse_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_accounts: {
        Row: {
          access_token_ciphertext: string | null
          account_name: string | null
          brand_id: string | null
          brand_scope: string | null
          connected_at: string | null
          created_at: string
          expires_at: string | null
          external_account_id: string | null
          id: string
          meta: Json
          provider: string
          refresh_token_ciphertext: string | null
          scopes: string | null
          status: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext?: string | null
          account_name?: string | null
          brand_id?: string | null
          brand_scope?: string | null
          connected_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_account_id?: string | null
          id?: string
          meta?: Json
          provider: string
          refresh_token_ciphertext?: string | null
          scopes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          access_token_ciphertext?: string | null
          account_name?: string | null
          brand_id?: string | null
          brand_scope?: string | null
          connected_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_account_id?: string | null
          id?: string
          meta?: Json
          provider?: string
          refresh_token_ciphertext?: string | null
          scopes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_accounts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          brand_id: string | null
          caption: string | null
          channel: string
          created_at: string
          format: string
          id: string
          media_url: string | null
          render_url: string | null
          slides: Json
          status: string
          template: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          caption?: string | null
          channel?: string
          created_at?: string
          format?: string
          id?: string
          media_url?: string | null
          render_url?: string | null
          slides?: Json
          status?: string
          template?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          caption?: string | null
          channel?: string
          created_at?: string
          format?: string
          id?: string
          media_url?: string | null
          render_url?: string | null
          slides?: Json
          status?: string
          template?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_cache: {
        Row: {
          cache_key: string
          client_id: string
          fetched_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          client_id: string
          fetched_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          client_id?: string
          fetched_at?: string
          payload?: Json
        }
        Relationships: []
      }
      metrics: {
        Row: {
          brand_id: string | null
          captured_for: string
          created_at: string
          delta: number | null
          id: string
          metric: string
          platform: string
          user_id: string
          value: number
        }
        Insert: {
          brand_id?: string | null
          captured_for?: string
          created_at?: string
          delta?: number | null
          id?: string
          metric: string
          platform?: string
          user_id: string
          value?: number
        }
        Update: {
          brand_id?: string | null
          captured_for?: string
          created_at?: string
          delta?: number | null
          id?: string
          metric?: string
          platform?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metrics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          autonomy_level: string
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          autonomy_level?: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          autonomy_level?: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pulse_clients: {
        Row: {
          created_at: string
          goals: Json
          id: string
          logo_url: string | null
          name: string
          sector: string | null
          seed_terms: string[]
          status: string
        }
        Insert: {
          created_at?: string
          goals?: Json
          id?: string
          logo_url?: string | null
          name: string
          sector?: string | null
          seed_terms?: string[]
          status?: string
        }
        Update: {
          created_at?: string
          goals?: Json
          id?: string
          logo_url?: string | null
          name?: string
          sector?: string | null
          seed_terms?: string[]
          status?: string
        }
        Relationships: []
      }
      pulse_connections: {
        Row: {
          account_ref: string | null
          client_id: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_sync_at: string | null
          provider: string
          scopes: string | null
          status: string
          token_expires_at: string | null
        }
        Insert: {
          account_ref?: string | null
          client_id: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          provider: string
          scopes?: string | null
          status?: string
          token_expires_at?: string | null
        }
        Update: {
          account_ref?: string | null
          client_id?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          provider?: string
          scopes?: string | null
          status?: string
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pulse_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_metrics_daily: {
        Row: {
          channel: string
          client_id: string
          date: string
          metric: string
          site: string
          source: string
          value: number
        }
        Insert: {
          channel: string
          client_id: string
          date: string
          metric: string
          site?: string
          source?: string
          value?: number
        }
        Update: {
          channel?: string
          client_id?: string
          date?: string
          metric?: string
          site?: string
          source?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_metrics_daily_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pulse_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_posts: {
        Row: {
          caption: string | null
          channel: string
          client_id: string
          comments: number
          external_id: string | null
          format: string
          id: string
          likes: number
          permalink: string | null
          published_at: string
          reach: number
          saves: number
          shares: number
          source: string
          thumbnail_url: string | null
          views: number
        }
        Insert: {
          caption?: string | null
          channel: string
          client_id: string
          comments?: number
          external_id?: string | null
          format: string
          id?: string
          likes?: number
          permalink?: string | null
          published_at: string
          reach?: number
          saves?: number
          shares?: number
          source?: string
          thumbnail_url?: string | null
          views?: number
        }
        Update: {
          caption?: string | null
          channel?: string
          client_id?: string
          comments?: number
          external_id?: string | null
          format?: string
          id?: string
          likes?: number
          permalink?: string | null
          published_at?: string
          reach?: number
          saves?: number
          shares?: number
          source?: string
          thumbnail_url?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pulse_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_reviews: {
        Row: {
          author: string | null
          client_id: string
          created_at: string
          external_id: string | null
          id: string
          rating: number
          replied: boolean
          source: string
          text: string | null
        }
        Insert: {
          author?: string | null
          client_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          rating: number
          replied?: boolean
          source?: string
          text?: string | null
        }
        Update: {
          author?: string | null
          client_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          rating?: number
          replied?: boolean
          source?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pulse_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_user_access: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_user_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pulse_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule: {
        Row: {
          brand_id: string | null
          channel: string
          content_item_id: string | null
          created_at: string
          external_post_id: string | null
          id: string
          posted_at: string | null
          scheduled_for: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          channel?: string
          content_item_id?: string | null
          created_at?: string
          external_post_id?: string | null
          id?: string
          posted_at?: string | null
          scheduled_for?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          channel?: string
          content_item_id?: string | null
          created_at?: string
          external_post_id?: string | null
          id?: string
          posted_at?: string | null
          scheduled_for?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          business_name: string | null
          created_at: string
          email: string | null
          focus_areas: string[]
          founding_pilot: string | null
          id: string
          industry: string | null
          marketing_spend: string | null
          name: string
          trust_requirements: string | null
          website: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          focus_areas?: string[]
          founding_pilot?: string | null
          id?: string
          industry?: string | null
          marketing_spend?: string | null
          name: string
          trust_requirements?: string | null
          website?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          focus_areas?: string[]
          founding_pilot?: string | null
          id?: string
          industry?: string | null
          marketing_spend?: string | null
          name?: string
          trust_requirements?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      pulse_can_see: {
        Args: { _client: string; _uid: string }
        Returns: boolean
      }
      pulse_claim_admin: { Args: never; Returns: string }
      pulse_is_admin: { Args: { _uid: string }; Returns: boolean }
      pulse_my_role: { Args: never; Returns: string }
      pulse_series: {
        Args: {
          _bucket?: string
          _client: string
          _from: string
          _site?: string
          _to: string
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
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
