// reference types="vite/client" removed to fix resolution error

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // plus d'autres variables d'environnement...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
