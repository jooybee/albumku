import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export const isCloudEnabled = Boolean(
  url && key && !url.includes('placeholder')
);

export const supabase: SupabaseClient | null = isCloudEnabled
  ? createClient(url!, key!)
  : null;

export interface CloudPhoto {
  id: string;
  event_id: string;
  guest_name: string;
  storage_path: string;
  public_url: string;
  preset_id: string | null;
  preset_name: string | null;
  created_at: string;
}