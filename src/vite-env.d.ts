/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_AI_PROVIDER?: string;
  readonly VITE_AGNES_API_KEY?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_API_BASE?: string;
  readonly VITE_OPENAI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
