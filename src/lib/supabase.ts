/**
 * Placeholder para integração futura com Supabase.
 *
 * Migração de autenticação (ver também src/lib/auth-service.ts):
 * - AuthProvider → consumir supabase.auth.onAuthStateChange()
 * - register/login/logout → métodos Supabase Auth
 * - profiles table → knowledgeLevel, mainLanguage, xp, level
 */

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL ?? '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey)
}

// export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey)
