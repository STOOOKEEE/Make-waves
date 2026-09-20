/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_ADMIN_API_BASE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Domaine déclaré dans Plausible, ex. tidetrade.xyz. */
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  /** URL du script fournie par Plausible Cloud ou l'instance auto-hébergée. */
  readonly VITE_PLAUSIBLE_SCRIPT_URL?: string;
  /** Endpoint facultatif, utile pour une instance/proxy auto-hébergé. */
  readonly VITE_PLAUSIBLE_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<
    Record<string, never>,
    Record<string, never>,
    unknown
  >;
  export default component;
}
