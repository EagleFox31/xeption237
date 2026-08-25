import { createClient } from '@supabase/supabase-js';

// Configuration Supabase pour Vite/Vercel
// Fallback values
const DEFAULT_URL = 'https://tawnusmfyvugqczaydat.supabase.co';
const DEFAULT_KEY = 'sb_publishable_aVbtIWpNtrLg_GLP7SbhEg_qk_JAa2H';

let supabaseUrl = DEFAULT_URL;
let supabaseKey = DEFAULT_KEY;

// Accès par PROPRIÉTÉ uniquement, jamais à `import.meta.env` en entier.
//
// Vite ne sait remplacer que `import.meta.env.MA_VAR`. Dès qu'un fichier teste
// ou manipule l'objet complet — ici un `if (import.meta.env)` défensif — le
// bundler renonce et inline TOUT l'objet, avec chaque variable VITE_ du projet.
//
// Mesuré le 2026-08-25 : cette seule ligne suffisait à livrer les clés Gemini et
// OpenRouter au navigateur, alors que plus aucun code applicatif ne les lisait.
// Supprimer le code qui utilise une clé ne suffit donc pas à la retirer du bundle.
try {
  // @ts-ignore — remplacé à la compilation, absent à l'exécution en Node
  const url = import.meta.env.VITE_SUPABASE_URL;
  // @ts-ignore
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url) supabaseUrl = url;
  if (key) supabaseKey = key;
} catch {
  // Contexte sans import.meta (tests Node) : on garde les valeurs par défaut.
  console.warn('Supabase env detection failed, using defaults');
}

export const supabase = createClient(supabaseUrl, supabaseKey);