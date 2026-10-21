import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, type Profile } from './supabase';

type AuthState = { user: User | null; profile: Profile | null; loading: boolean; refreshProfile: () => Promise<void> };
const AuthContext = createContext<AuthState>({ user: null, profile: null, loading: true, refreshProfile: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(id: string) {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('id,username,display_name,bio,avatar_url,created_at').eq('id', id).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!alive) return;
      setUser(data.user);
      if (data.user) await loadProfile(data.user.id);
      if (alive) setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      if (session?.user) void loadProfile(session.user.id);
      else setProfile(null);
      setLoading(false);
    });
    return () => { alive = false; subscription.subscription.unsubscribe(); };
  }, []);

  return <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
