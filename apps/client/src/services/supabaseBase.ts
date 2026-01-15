import { supabase } from '../../supabaseClient';

export const assertNoError = (error: any, context: string) => {
  if (error) {
    const message = typeof error?.message === 'string' ? error.message : String(error);
    throw new Error(`${context}: ${message}`);
  }
};

export { supabase };
