import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase = isSupabaseConfigured ? createClient(url, anonKey, { auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } }) : null;

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
};

export type DocumentRecord = {
  id: string;
  course_id: string;
  owner_id: string;
  title: string;
  description: string;
  kind: 'summary' | 'slides' | 'lecture' | 'practice' | 'exam';
  storage_path: string;
  file_name: string;
  mime_type: string;
  status: 'draft' | 'published' | 'hidden';
  created_at: string;
  profiles?: Pick<Profile, 'username' | 'display_name' | 'avatar_url'> | null;
};

export const kindLabels: Record<DocumentRecord['kind'], string> = {
  summary: 'สรุปที่เขียนเอง', slides: 'สไลด์ที่ทำเอง', lecture: 'โน้ตเลกเชอร์ที่เขียนเอง', practice: 'โจทย์ฝึกที่แต่งเอง', exam: 'แนวข้อสอบที่แต่งเอง',
};
