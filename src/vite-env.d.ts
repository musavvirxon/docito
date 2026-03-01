/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_BLOG_DEFAULT_AUTHOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
