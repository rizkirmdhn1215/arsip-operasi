import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
    public: {
        Tables: {
            operations: {
                Row: {
                    id: string
                    name: string
                    date: string
                    year: number
                    month: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    date: string
                    year: number
                    month: number
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['operations']['Insert']>
            }
            operation_files: {
                Row: {
                    id: string
                    operation_id: string
                    name: string
                    size: number
                    file_type: string
                    storage_path: string
                    upload_date: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    operation_id: string
                    name: string
                    size: number
                    file_type: string
                    storage_path: string
                    upload_date: string
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['operation_files']['Insert']>
            }
        }
    }
}
