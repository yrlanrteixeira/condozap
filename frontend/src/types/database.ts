/**
 * Database Types para Supabase
 * Gerado a partir do schema PostgreSQL
 *
 * Para atualizar: npx supabase gen types typescript --project-id your-project-id > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      condominiums: {
        Row: {
          id: string
          name: string
          cnpj: string
          address: string
          towers: string[]
          whatsapp_phone: string | null
          whatsapp_business_id: string | null
          plan: 'STANDARD' | 'ENTERPRISE' | 'PARTNER'
          status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          cnpj: string
          address: string
          towers: string[]
          whatsapp_phone?: string | null
          whatsapp_business_id?: string | null
          plan?: 'STANDARD' | 'ENTERPRISE' | 'PARTNER'
          status?: 'TRIAL' | 'ACTIVE' | 'SUSPENDED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string
          address?: string
          towers?: string[]
          whatsapp_phone?: string | null
          whatsapp_business_id?: string | null
          plan?: 'STANDARD' | 'ENTERPRISE' | 'PARTNER'
          status?: 'TRIAL' | 'ACTIVE' | 'SUSPENDED'
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'SUPER_ADMIN' | 'PROFESSIONAL_SYNDIC' | 'ADMIN' | 'SYNDIC' | 'RESIDENT'
          permission_scope: 'GLOBAL' | 'LOCAL'
          resident_id: string | null
          mfa_enabled: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string // Supabase auth.users.id
          email: string
          name: string
          role: 'SUPER_ADMIN' | 'PROFESSIONAL_SYNDIC' | 'ADMIN' | 'SYNDIC' | 'RESIDENT'
          permission_scope?: 'GLOBAL' | 'LOCAL'
          resident_id?: string | null
          mfa_enabled?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'SUPER_ADMIN' | 'PROFESSIONAL_SYNDIC' | 'ADMIN' | 'SYNDIC' | 'RESIDENT'
          permission_scope?: 'GLOBAL' | 'LOCAL'
          resident_id?: string | null
          mfa_enabled?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_condominiums: {
        Row: {
          user_id: string
          condominium_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          condominium_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          condominium_id?: string
          created_at?: string
        }
      }
      residents: {
        Row: {
          id: string
          condominium_id: string
          name: string
          phone: string
          tower: string
          floor: string
          unit: string
          type: 'OWNER' | 'TENANT'
          consent_whatsapp: boolean
          consent_data_processing: boolean
          created_at: string
        }
        Insert: {
          id?: string
          condominium_id: string
          name: string
          phone: string
          tower: string
          floor: string
          unit: string
          type?: 'OWNER' | 'TENANT'
          consent_whatsapp?: boolean
          consent_data_processing?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          condominium_id?: string
          name?: string
          phone?: string
          tower?: string
          floor?: string
          unit?: string
          type?: 'OWNER' | 'TENANT'
          consent_whatsapp?: boolean
          consent_data_processing?: boolean
          created_at?: string
        }
      }
      complaints: {
        Row: {
          id: number
          condominium_id: string
          resident_id: string
          category: string
          content: string
          status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
          priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null
          is_anonymous: boolean
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          condominium_id: string
          resident_id: string
          category: string
          content: string
          status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
          priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null
          is_anonymous?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          condominium_id?: string
          resident_id?: string
          category?: string
          content?: string
          status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
          priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null
          is_anonymous?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          condominium_id: string
          type: 'TEXT' | 'TEMPLATE' | 'IMAGE'
          scope: 'ALL' | 'TOWER' | 'FLOOR' | 'UNIT'
          target_tower: string | null
          target_floor: string | null
          target_unit: string | null
          content: string
          whatsapp_message_id: string | null
          whatsapp_status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | null
          batch_id: string | null
          recipient_count: number
          sent_by: string
          sent_at: string
        }
        Insert: {
          id?: string
          condominium_id: string
          type: 'TEXT' | 'TEMPLATE' | 'IMAGE'
          scope: 'ALL' | 'TOWER' | 'FLOOR' | 'UNIT'
          target_tower?: string | null
          target_floor?: string | null
          target_unit?: string | null
          content: string
          whatsapp_message_id?: string | null
          whatsapp_status?: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | null
          batch_id?: string | null
          recipient_count?: number
          sent_by: string
          sent_at?: string
        }
        Update: {
          id?: string
          condominium_id?: string
          type?: 'TEXT' | 'TEMPLATE' | 'IMAGE'
          scope?: 'ALL' | 'TOWER' | 'FLOOR' | 'UNIT'
          target_tower?: string | null
          target_floor?: string | null
          target_unit?: string | null
          content?: string
          whatsapp_message_id?: string | null
          whatsapp_status?: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | null
          batch_id?: string | null
          recipient_count?: number
          sent_by?: string
          sent_at?: string
        }
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
  }
}
