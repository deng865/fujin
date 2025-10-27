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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          match_id: string
          message_type: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          match_id: string
          message_type?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          match_id?: string
          message_type?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      housing_posts: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          contact_info: string | null
          created_at: string | null
          description: string
          expire_at: string
          id: string
          images: Json | null
          is_visible: boolean | null
          location: Json
          rent_price: number
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          contact_info?: string | null
          created_at?: string | null
          description: string
          expire_at: string
          id?: string
          images?: Json | null
          is_visible?: boolean | null
          location: Json
          rent_price: number
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          contact_info?: string | null
          created_at?: string | null
          description?: string
          expire_at?: string
          id?: string
          images?: Json | null
          is_visible?: boolean | null
          location?: Json
          rent_price?: number
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "housing_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          company_name: string
          contact_info: string | null
          created_at: string | null
          description: string
          expire_at: string
          id: string
          is_visible: boolean | null
          job_type: string | null
          location: Json | null
          salary_range: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_name: string
          contact_info?: string | null
          created_at?: string | null
          description: string
          expire_at: string
          id?: string
          is_visible?: boolean | null
          job_type?: string | null
          location?: Json | null
          salary_range?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_name?: string
          contact_info?: string | null
          created_at?: string | null
          description?: string
          expire_at?: string
          id?: string
          is_visible?: boolean | null
          job_type?: string | null
          location?: Json | null
          salary_range?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          distance_km: number | null
          estimated_time_minutes: number | null
          id: string
          ride_id: string
          status: Database["public"]["Enums"]["match_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          distance_km?: number | null
          estimated_time_minutes?: number | null
          id?: string
          ride_id: string
          status?: Database["public"]["Enums"]["match_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          distance_km?: number | null
          estimated_time_minutes?: number | null
          id?: string
          ride_id?: string
          status?: Database["public"]["Enums"]["match_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_method: string
          payment_status: string | null
          post_id: string
          post_type: string
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_method: string
          payment_status?: string | null
          post_id: string
          post_type: string
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_method?: string
          payment_status?: string | null
          post_id?: string
          post_type?: string
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
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
          average_rating: number | null
          created_at: string | null
          id: string
          is_blocked: boolean | null
          location: Json | null
          name: string
          phone: string | null
          rating_sum: number | null
          total_ratings: number | null
          total_rides: number | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
          verified: boolean | null
          wechat_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          average_rating?: number | null
          created_at?: string | null
          id: string
          is_blocked?: boolean | null
          location?: Json | null
          name: string
          phone?: string | null
          rating_sum?: number | null
          total_ratings?: number | null
          total_rides?: number | null
          updated_at?: string | null
          user_type: Database["public"]["Enums"]["user_type"]
          verified?: boolean | null
          wechat_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          average_rating?: number | null
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          location?: Json | null
          name?: string
          phone?: string | null
          rating_sum?: number | null
          total_ratings?: number | null
          total_rides?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          verified?: boolean | null
          wechat_id?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rated_id: string
          rater_id: string
          rating: number | null
          ride_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rated_id: string
          rater_id: string
          rating?: number | null
          ride_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rated_id?: string
          rater_id?: string
          rating?: number | null
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          created_at: string | null
          current_location: Json | null
          departure_time: string | null
          description: string | null
          expire_at: string
          from_location: Json | null
          id: string
          is_visible: boolean | null
          passenger_count: number | null
          price_share: number | null
          ride_type: Database["public"]["Enums"]["ride_type"]
          seats_available: number | null
          status: Database["public"]["Enums"]["ride_status"] | null
          title: string
          to_location: Json | null
          updated_at: string | null
          user_id: string
          waypoints: Json | null
        }
        Insert: {
          created_at?: string | null
          current_location?: Json | null
          departure_time?: string | null
          description?: string | null
          expire_at: string
          from_location?: Json | null
          id?: string
          is_visible?: boolean | null
          passenger_count?: number | null
          price_share?: number | null
          ride_type: Database["public"]["Enums"]["ride_type"]
          seats_available?: number | null
          status?: Database["public"]["Enums"]["ride_status"] | null
          title: string
          to_location?: Json | null
          updated_at?: string | null
          user_id: string
          waypoints?: Json | null
        }
        Update: {
          created_at?: string | null
          current_location?: Json | null
          departure_time?: string | null
          description?: string | null
          expire_at?: string
          from_location?: Json | null
          id?: string
          is_visible?: boolean | null
          passenger_count?: number | null
          price_share?: number | null
          ride_type?: Database["public"]["Enums"]["ride_type"]
          seats_available?: number | null
          status?: Database["public"]["Enums"]["ride_status"] | null
          title?: string
          to_location?: Json | null
          updated_at?: string | null
          user_id?: string
          waypoints?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      match_status: "pending" | "confirmed"
      ride_status: "open" | "closed" | "matched"
      ride_type: "taxi" | "carpool"
      user_type: "passenger" | "driver"
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
  public: {
    Enums: {
      match_status: ["pending", "confirmed"],
      ride_status: ["open", "closed", "matched"],
      ride_type: ["taxi", "carpool"],
      user_type: ["passenger", "driver"],
    },
  },
} as const
