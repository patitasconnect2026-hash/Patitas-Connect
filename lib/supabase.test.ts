/**
 * Revisa los archivos SQL de supabase/ COMO TEXTO (no hay base de datos para correrlos todavía).
 * Comprueba las reglas del equipo: todo con reglas, nadie ve nada por defecto, los estados son los del código y
 * ninguna clave está escrita. Las pruebas de comportamiento («quién ve qué») están en
 * supabase/tests/database/quien_ve_que.test.sql y necesitan Docker y la herramienta de Supabase.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ESTADOS, TRANSICIONES } from './paseo'
import { ESTADOS_PAGO, TRANSICIONES_PAGO } from './pagos'
import { COMPROBACIONES } from './verificacion'

const RAIZ = path.resolve(__dirname, '..')
const DIR = path.join(RAIZ, 'supabase', 'migrations')
const archivos = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()
const quitarComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '')
const SQL = quitarComentarios(archivos.map((f) => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n'))
const SIN_REGLAS_A_PROPOSITO = ['transiciones_paseo', 'transiciones_pago']

const lista = (texto: string) => [...texto.matchAll(/'([^']+)'/g)].map((m) => m[1])
const tablas = [...SQL.matchAll(/create table public\.(\w+)/g)].map((m) => m[1])
const politicas = [...SQL.matchAll(/create policy (\w+) on ([\w.]+) for (\w+) to (\w+)([\s\S]*?);/g)].map((m) => ({ nombre: m[1], tabla: m[2].replace('public.', ''), para: m[3], rol: m[4], cuerpo: m[5] }))

describe('supabase/: las migraciones existen y están en orden', () => {
  it('son quince archivos con fecha: tablas, reglas, almacén de fotos, los dos arreglos del paso 8, las notas del equipo y el DNI corregible (paso 7b), la videollamada solo con la hora, borrar mi cuenta, las reseñas, la integridad, «Pedir paseo», las respuestas escritas del examen la ubicación de las fotos, el registro de la IA de apoyo y los permisos de service_role; las tres primeras ya están aplicadas', () => {
    expect(archivos).toHaveLength(15)
    expect(archivos.map((a) => a.replace(/^\d+_/, ''))).toEqual(['tablas.sql', 'reglas.sql', 'fotos_almacen.sql', 'fotos_paso_8.sql', 'postulaciones_paso_7b.sql', 'dni_paso_7b.sql', 'videollamada_solo_hora.sql', 'borrar_mi_cuenta.sql', 'resenas.sql', 'integridad.sql', 'pedidos.sql', 'respuestas_escritas.sql', 'ubicacion_y_sospechas.sql', 'usos_ia.sql', 'permisos_service_role.sql'])
    // Siempre en orden de fecha: una migración nueva nunca va antes de una ya aplicada.
    expect([...archivos].sort()).toEqual(archivos)
  })
})

describe('supabase/: nadie ve nada por defecto', () => {
  it('todas las tablas tienen reglas de fila activadas', () => {
    expect(tablas.length).toBeGreaterThan(15)
    for (const t of tablas) expect(SQL, t).toMatch(new RegExp(`alter table public\\.${t} enable row level security`))
  })

  it('toda tabla tiene alguna regla explícita, salvo las dos tablas de reglas internas', () => {
    for (const t of tablas) {
      if (SIN_REGLAS_A_PROPOSITO.includes(t)) continue
      expect(politicas.some((p) => p.tabla === t), `${t} sin reglas`).toBe(true)
    }
  })

  it('ninguna regla abre algo a todos: ni «true», ni «anon», ni «public»', () => {
    for (const p of politicas) {
      expect(p.rol, p.nombre).toBe('authenticated')
      expect(p.cuerpo, p.nombre).not.toMatch(/\b(using|with check)\s*\(\s*true\s*\)/i)
    }
    expect(SQL).not.toMatch(/grant [^;]* to (anon|public)\b/i)
    expect(SQL).toMatch(/revoke all on all tables in schema public from anon/)
  })

  it('las funciones que llama la app no las puede llamar alguien sin sesión', () => {
    for (const f of ['mover_pago', 'verificar_codigo_recojo']) {
      expect(SQL).toMatch(new RegExp(`revoke all on function public\\.${f}\\([^)]*\\) from public, anon`))
      expect(SQL).toMatch(new RegExp(`grant execute on function public\\.${f}\\([^)]*\\) to authenticated`))
    }
    expect(SQL).toMatch(/revoke all on function public\.fotos_para_borrar\(\) from public, anon, authenticated/)
  })
})

describe('supabase/: quién ve qué (lo que decidió el equipo)', () => {
  const de = (tabla: string, para?: string) => politicas.filter((p) => p.tabla === tabla && (!para || p.para === para))

  it('el DNI completo lo lee solo el equipo y está en una tabla aparte', () => {
    const ver = de('datos_dni', 'select')
    expect(ver).toHaveLength(1)
    expect(ver[0].cuerpo).toMatch(/privado\.es_equipo\(\)/)
    expect(ver[0].cuerpo).not.toMatch(/auth\.uid\(\)/)
    expect(SQL).not.toMatch(/create table public\.postulaciones[^;]*\bdni\b/)
  })

  it('en la vista pública solo salen los últimos 3 dígitos y nunca la palabra «verificado»', () => {
    const vista = SQL.slice(SQL.indexOf('create view public.paseadores_publicos'), SQL.indexOf('revoke all on public.paseadores_publicos'))
    expect(vista).toMatch(/right\(d\.dni, 3\)/)
    expect((vista.match(/d\.dni/g) ?? []).length).toBe(1)
    expect(vista).not.toMatch(/verificad/i)
    // solo los aprobados: las cinco casillas y el cobro registrado
    for (const c of ['dni', 'distrito', 'celular', 'consultas', 'examen']) expect(vista).toMatch(new RegExp(`c\\.${c}\\b`))
    expect(vista).toMatch(/cobros_paseador/)
  })

  it('el Yape o Plin del paseador no lo ve la familia', () => {
    for (const p of de('cobros_paseador', 'select')) {
      expect(p.cuerpo).toMatch(/paseador_id = \(select auth\.uid\(\)\)/)
      expect(p.cuerpo).not.toMatch(/familia/)
    }
  })

  it('la casa y la ficha del perro solo las ve el paseador después de aceptar', () => {
    expect(de('casas', 'select')[0].cuerpo).toMatch(/privado\.paseador_ve_familia\(familia_id\)/)
    expect(de('perros', 'select')[0].cuerpo).toMatch(/privado\.paseador_ve_perro\(id\)/)
    const fn = SQL.slice(SQL.indexOf('create function privado.paseador_ve_familia'), SQL.indexOf('create function privado.paseador_ve_perro'))
    expect(fn).toMatch(/'aceptado', 'en_camino', 'en_paseo', 'entregado', 'en_disputa'/)
    expect(fn).not.toMatch(/'solicitado'|'rechazado'|'expirado'/)
  })

  it('el celular y el apellido no se muestran entre familia y paseador', () => {
    for (const p of de('datos_personales', 'select')) expect(p.cuerpo).toMatch(/id = \(select auth\.uid\(\)\) or privado\.es_equipo\(\)/)
    const vista = SQL.slice(SQL.indexOf('create view public.paseadores_publicos'), SQL.indexOf('revoke all on public.paseadores_publicos'))
    // (`c.celular` es la casilla «celular confirmado» del equipo, no el número)
    expect(vista).not.toMatch(/datos_personales|\bcp\.celular|telefono|phone/i)
    expect(vista).toMatch(/left\(btrim\(p\.apellido\), 1\)/)
  })

  it('el paseador no lee el código de recojo: la base lo compara', () => {
    expect(de('codigos_recojo', 'select')[0].cuerpo).toMatch(/es_familia_de/)
    expect(de('codigos_recojo', 'select')[0].cuerpo).not.toMatch(/paseador/)
    expect(SQL).toMatch(/create function public\.verificar_codigo_recojo/)
  })

  it('los pagos no se escriben directo: ni reglas de insertar, cambiar o borrar, ni permiso', () => {
    expect(de('pagos').map((p) => p.para)).toEqual(['select'])
    expect(SQL).toMatch(/revoke insert, update, delete on public\.pagos from authenticated/)
  })

  it('los mensajes y la bitácora no se editan ni se borran (tampoco el equipo)', () => {
    for (const t of ['mensajes', 'bitacora']) expect(de(t).map((p) => p.para).sort()).toEqual(['insert', 'select'])
    expect(SQL).toMatch(/revoke update, delete on public\.mensajes, public\.bitacora from authenticated/)
    // el equipo solo lee los mensajes: no hay regla suya para escribir
    expect(de('mensajes', 'insert')[0].cuerpo).not.toMatch(/es_equipo/)
  })

  it('el rol «equipo» no se pide al registrarse ni se cambia desde la app', () => {
    expect(SQL).toMatch(/when 'paseador' then 'paseador'::public\.rol_usuario else 'familia'::public\.rol_usuario/)
    expect(SQL).toMatch(/create trigger bloquear_cambio_de_rol before update on public\.perfiles/)
    expect(SQL).toMatch(/auth\.uid\(\) is not null then\s+raise exception 'El rol no se puede cambiar/)
  })

  it('solo el equipo marca las comprobaciones y resuelve casos', () => {
    for (const p of [...de('comprobaciones', 'insert'), ...de('comprobaciones', 'update')]) expect(p.cuerpo).toMatch(/es_equipo/)
    expect(SQL).toMatch(/Resolver un caso lo hace el equipo/)
  })
})

describe('supabase/: los estados son los del código', () => {
  const enumDe = (nombre: string) => lista(SQL.match(new RegExp(`create type public\\.${nombre} as enum \\(([^)]*)\\)`))![1])

  it('estado del paseo = ESTADOS de lib/paseo.ts', () => {
    expect(enumDe('estado_paseo')).toEqual([...ESTADOS])
  })
  it('estado del pago = ESTADOS_PAGO de lib/pagos.ts', () => {
    expect(enumDe('estado_pago')).toEqual([...ESTADOS_PAGO])
  })
  it('tipo de caso = TipoCaso de lib/casos.ts', () => {
    expect(enumDe('tipo_caso')).toEqual(['disputa', 'entrega_sin_confirmar', 'pago'])
  })
  it('las cinco casillas = las comprobaciones de lib/verificacion.ts (menos la sexta, que se deduce)', () => {
    const cols = SQL.match(/create table public\.comprobaciones \(([\s\S]*?)\n\);/)![1]
    const esperadas = COMPROBACIONES.map((c) => c.id).filter((id) => id !== 'primerPaseo')
    for (const id of esperadas) expect(cols, id).toMatch(new RegExp(`\\b${id}\\b boolean`))
    expect([...cols.matchAll(/^\s+(\w+) boolean/gm)].map((m) => m[1])).toEqual(esperadas)
  })
  it('la bitácora usa los EventKind de lib/types.ts', () => {
    const tipos = fs.readFileSync(path.join(RAIZ, 'lib', 'types.ts'), 'utf8')
    const kinds = lista(tipos.slice(tipos.indexOf('export type EventKind'), tipos.indexOf('export interface TimelineEntry')))
    const sql = lista(SQL.match(/create table public\.bitacora[\s\S]*?tipo text not null check \(tipo in \(([^)]*)\)/)![1])
    expect(sql).toEqual(kinds)
  })

  it('transiciones del paseo = TRANSICIONES de lib/paseo.ts', () => {
    const filas = [...SQL.matchAll(/\('(\w+)', '(\w+)', '(\w+)', '\{([\w,]+)\}'\)/g)]
      .filter((m) => (ESTADOS as readonly string[]).includes(m[2]))
      .map((m) => `${m[1]}|${m[2]}|${m[3]}|${m[4].split(',').sort().join(',')}`)
    const esperadas = TRANSICIONES.flatMap((t) => t.de.filter((d) => d !== null).map((d) => `${t.accion}|${d}|${t.a}|${[...t.quien].sort().join(',')}`)).filter((f) => !f.startsWith('solicitar|'))
    expect(filas.sort()).toEqual(esperadas.sort())
  })

  it('transiciones del pago = TRANSICIONES_PAGO de lib/pagos.ts', () => {
    const seccion = SQL.slice(SQL.indexOf('insert into public.transiciones_pago'))
    const filas = [...seccion.matchAll(/\('(\w+)', '\{([\w,]+)\}', '(\w+)', '(\w+)', (?:'\{([\w,]+)\}'|null), (true|false)\)/g)].map((m) => ({
      accion: m[1],
      de: m[2].split(',').sort(),
      a: m[3],
      quien: m[4],
      paseo: m[5] ? m[5].split(',').sort() : null,
      pideNota: m[6] === 'true',
    }))
    const esperadas = TRANSICIONES_PAGO.map((t) => ({
      accion: t.accion,
      de: [...t.de].sort(),
      a: t.a,
      quien: t.quien,
      paseo: t.paseo ? [...t.paseo].sort() : null,
      pideNota: !!t.pideNota,
    }))
    expect(filas).toEqual(esperadas)
  })

  it('el paseador no se paga a sí mismo: «pagar_al_paseador» y «no_encontrado» son del equipo', () => {
    for (const t of TRANSICIONES_PAGO.filter((x) => x.accion !== 'ver_pago')) expect(t.quien).toBe('equipo')
    expect(SQL).toMatch(/v_t\.quien = 'equipo' and not privado\.es_equipo\(\)/)
    expect(SQL).toMatch(/v_t\.quien = 'paseador' and v_uid <> v_pago\.paseador_id/)
  })
})

describe('supabase/: sin claves ni contraseñas escritas', () => {
  const crudo = [...archivos.map((f) => fs.readFileSync(path.join(DIR, f), 'utf8')), fs.readFileSync(path.join(RAIZ, 'supabase', 'scripts', 'borrar_fotos_vencidas.mjs'), 'utf8'), fs.readFileSync(path.join(RAIZ, 'supabase', 'scripts', 'crear_cuenta_equipo.mjs'), 'utf8')].join('\n')

  it('no hay tokens, claves ni URLs de proyecto en los archivos', () => {
    expect(crudo).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/)
    expect(crudo).not.toMatch(/sb_(secret|publishable)_/)
    expect(crudo).not.toMatch(/\.supabase\.co\/[a-z]/)
    expect(crudo).not.toMatch(/postgres(ql)?:\/\/\S+:\S+@/)
  })

  it('el script de borrado lee la clave de la terminal y nunca la escribe ni la imprime', () => {
    const script = fs.readFileSync(path.join(RAIZ, 'supabase', 'scripts', 'borrar_fotos_vencidas.mjs'), 'utf8')
    expect(script).toMatch(/process\.env\.SUPABASE_SERVICE_ROLE_KEY/)
    expect(script).not.toMatch(/console\.\w+\([^)]*clave/)
  })

  it('el script de la cuenta del equipo lee la clave de la terminal y no imprime ni la clave ni la contraseña', () => {
    const script = fs.readFileSync(path.join(RAIZ, 'supabase', 'scripts', 'crear_cuenta_equipo.mjs'), 'utf8')
    expect(script).toMatch(/process\.env\.SUPABASE_SERVICE_ROLE_KEY/)
    expect(script).not.toMatch(/console\.\w+\([^)]*(clave|contrasena|repetida)\b/)
    expect(script).not.toMatch(/process\.argv/)
  })

  it('el archivo .env.local queda fuera de Git', () => {
    expect(fs.readFileSync(path.join(RAIZ, '.gitignore'), 'utf8')).toMatch(/^\.env\*$/m)
  })
})
