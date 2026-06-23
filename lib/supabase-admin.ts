import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ⚠️ SOLO servidor. Usa la service_role key (omite RLS).
// Importar ÚNICAMENTE desde route handlers (app/api/**). Nunca desde componentes cliente.
//
// Inicialización lazy: el cliente se crea en el primer request, no al cargar el módulo.
// Esto evita que el build falle cuando las env vars solo existen en Vercel (no en local).
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
