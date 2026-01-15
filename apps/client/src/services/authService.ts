import type { Session } from '@supabase/supabase-js';
import { assertNoError, supabase } from './supabaseBase';

export type AuthUserLite = { id: string; email?: string | null; user_metadata?: any };

export const authService = {
  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    assertNoError(error, 'authService.getSession');
    return data.session;
  },

  onAuthStateChange(cb: (event: string, session: Session | null) => void): { unsubscribe: () => void } {
    const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
    return { unsubscribe: () => data.subscription.unsubscribe() };
  },

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    assertNoError(error, 'authService.signInWithPassword');
    return data;
  },

  async signUp(params: { name: string; email: string; password: string; role: string }) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.name,
          role: params.role,
        },
      },
    });
    assertNoError(error, 'authService.signUp');
    return data;
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    assertNoError(error, 'authService.signOut');
  },
};
