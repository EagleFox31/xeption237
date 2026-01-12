
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://tawnusmfyvugqczaydat.supabase.co';
const supabaseKey = 'sb_publishable_aVbtIWpNtrLg_GLP7SbhEg_qk_JAa2H'; // Note: In a real vite project, use import.meta.env

export const supabase = createClient(supabaseUrl, supabaseKey);
