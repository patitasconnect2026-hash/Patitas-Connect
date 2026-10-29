/**
 * Edge Function «resumen-ia» (Bloque 7): el botón «Resumen de apoyo con IA» de /admin llama aquí. Solo el equipo. La clave de la IA
 * está en los secretos de Supabase (`IA_CLAVE`; el modelo, opcional, en `IA_MODELO`) y se lee SOLO aquí: nunca está en el código,
 * ni en el navegador, ni en el chat. Paso a paso para ponerla: docs/PUBLICAR.md, «IA de apoyo en /admin».
 * Toda la lógica está en `../_shared/resumen.ts` (con pruebas); esto es solo el enchufe a Deno.
 */
import { atenderPedido } from '../_shared/resumen.ts'

const CABECERAS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECERAS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'pedido' }), { status: 405, headers: CABECERAS })
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim() || null
  const cuerpo = await req.json().catch(() => null)
  const salida = await atenderPedido(jwt, cuerpo, {
    secreto: (nombre) => Deno.env.get(nombre) ?? '',
    urlDeSupabase: Deno.env.get('SUPABASE_URL') ?? '',
    claveAnonima: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    fetch: (url, init) => fetch(url, init),
  })
  return new Response(JSON.stringify(salida.cuerpo), { status: salida.status, headers: CABECERAS })
})
