import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Intentamos obtener las variables de la inyección en RootLayout (window.__ENV)
  // o de process.env (fallback estándar).
  const supabaseUrl = (typeof window !== "undefined" && (window as any).__ENV?.NEXT_PUBLIC_SUPABASE_URL)
    || process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey = (typeof window !== "undefined" && (window as any).__ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase credentials missing (Runtime/Build). Missing in layout injection or process.env.");
  }

  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}
