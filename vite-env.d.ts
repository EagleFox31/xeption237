// reference types="vite/client" removed to fix resolution error

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_GEMINI_CREDIBILITY_MODEL: string;
  readonly VITE_OPENROUTER_API_KEY: string;
  readonly VITE_OPENROUTER_VISION_MODEL: string;
  readonly VITE_DEEPSEEK_API_KEY: string;
  readonly VITE_ENABLE_TROC_AI: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
