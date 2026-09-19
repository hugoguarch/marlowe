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
    PostgrestVersion: "14.5"
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
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
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
      connected_accounts: {
        Row: {
          account_name: string | null
          brand_id: string | null
          connected_at: string | null
          created_at: string
          id: string
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          brand_id?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          provider: string
          status?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          brand_id?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          provider?: string
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
      schedule: {
        Row: {
          brand_id: string | null
          channel: string
          content_item_id: string | null
          created_at: string
          id: string
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
          id?: string
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
          id?: string
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
      [_ in never]: never
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
