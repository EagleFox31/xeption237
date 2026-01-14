import { createClient } from '@supabase/supabase-js';

// Configuration Supabase pour Vite/Vercel
// Fallback values
const DEFAULT_URL = 'https://tawnusmfyvugqczaydat.supabase.co';
const DEFAULT_KEY = 'sb_publishable_aVbtIWpNtrLg_GLP7SbhEg_qk_JAa2H';

let supabaseUrl = DEFAULT_URL;
let supabaseKey = DEFAULT_KEY;

try {
  // Safe check for Vite environment variables
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    if (import.meta.env.VITE_SUPABASE_URL) {
        // @ts-ignore
        supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    }
    // @ts-ignore
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
        // @ts-ignore
        supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
  }
} catch (error) {
  // Silently fail to defaults
  console.warn('Supabase env detection failed, using defaults');
}

export const supabase = createClient(supabaseUrl, supabaseKey);