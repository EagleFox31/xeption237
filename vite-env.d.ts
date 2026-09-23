// reference types="vite/client" removed to fix resolution error

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ENABLE_TROC_AI: string;
  readonly VITE_GTM_ID?: string;
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
