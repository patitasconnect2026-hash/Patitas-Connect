// Base de datos temporal para probar el SQL de supabase/ SIN Supabase, SIN Docker y SIN red (PGlite = Postgres 16 en memoria).
// Instalar una vez, sin guardarlo en package.json:  npm i --no-save @electric-sql/pglite@0.2.17
//
// Lo usan: probar_en_pglite.cjs (las pruebas «quién ve qué» y las del paseo) y servidor_simulado.mjs (un Supabase de
// mentira para ver la app sin tocar el real). Simula lo que Supabase ya trae (roles, auth.uid(), storage) y una versión
// mínima de pgTAP. No reemplaza `supabase test db`.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const RAIZ_SUPABASE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const STUBS = `
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb, aud text, role text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'sub','')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
create schema tap;
create table tap.res(n serial, ok boolean, descr text, detail text);
grant usage on schema tap to public; grant all on tap.res to public; grant all on sequence tap.res_n_seq to public;
create function tap.plan(n int) returns text language sql as $$ select 'plan '||n $$;
create function tap.is(a anyelement, b anyelement, d text) returns text language plpgsql as $$ begin insert into tap.res(ok,descr,detail) values (a is not distinct from b, d, format('got=%s expected=%s',a,b)); return d; end $$;
create function tap.ok(a boolean, d text) returns text language plpgsql as $$ begin insert into tap.res(ok,descr,detail) values (coalesce(a,false), d, case when a then null else 'no se cumplió' end); return d; end $$;
create function tap.lives_ok(q text, d text) returns text language plpgsql as $$ begin execute q; insert into tap.res(ok,descr) values (true,d); return d; exception when others then insert into tap.res(ok,descr,detail) values (false,d,SQLSTATE||' '||SQLERRM); return d; end $$;
create function tap.throws_ok(q text, code text, msg text, d text) returns text language plpgsql as $$ begin execute q; insert into tap.res(ok,descr,detail) values (false,d,'no lanzó error'); return d; exception when others then insert into tap.res(ok,descr,detail) values (SQLSTATE=code, d, 'sqlstate='||SQLSTATE||' '||SQLERRM); return d; end $$;
grant execute on all functions in schema tap to public;
`

/** Los archivos de supabase/migrations/, en orden (por nombre). */
export function archivosDeMigraciones() {
  const dir = path.join(RAIZ_SUPABASE, 'migrations')
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => path.join(dir, f))
}

/**
 * Crea la base, le pone lo que Supabase ya trae y le aplica TODAS las migraciones, en orden.
 * Con `{ cantidad: 3 }` aplica solo las 3 primeras (para probar «¿qué migraciones faltan?» de docs/PUBLICAR.md).
 */
export async function crearBase({ cantidad } = {}) {
  const { PGlite } = await import('@electric-sql/pglite')
  const db = new PGlite()
  await db.exec(STUBS)
  const archivos = archivosDeMigraciones()
  for (const archivo of cantidad === undefined ? archivos : archivos.slice(0, cantidad)) {
    try {
      await db.exec(fs.readFileSync(archivo, 'utf8'))
    } catch (e) {
      throw new Error(`Falla ${path.basename(archivo)}: ${e instanceof Error ? e.message : String(e)}`, { cause: e })
    }
  }
  return db
}

/** Corre un archivo de pruebas estilo pgTAP en una base nueva y devuelve lo que salió. */
export async function correrArchivoDePruebas(archivo) {
  const db = await crearBase()
  let texto = fs.readFileSync(archivo, 'utf8')
  // El archivo de pruebas termina con finish() y rollback: aquí se lee el resultado de la tabla tap.res.
  texto = texto.replace(/select \* from finish\(\);?/i, '').replace(/^\s*rollback;\s*$/im, '')
  await db.exec('set search_path = public, tap;')
  let errorGeneral = null
  try {
    await db.exec(texto)
  } catch (e) {
    errorGeneral = String(e instanceof Error ? e.message : e).slice(0, 400)
  }
  const r = await db.query('select n, ok, descr, detail from tap.res order by n')
  await db.close()
  return { total: r.rows.length, fallan: r.rows.filter((x) => !x.ok), errorGeneral }
}

/** Los archivos *.test.sql de supabase/tests/database/ (o uno solo si se da su nombre). */
export function archivosDePruebas(filtro) {
  const dir = path.join(RAIZ_SUPABASE, 'tests', 'database')
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.test.sql') && (!filtro || f.includes(filtro)))
    .sort()
    .map((f) => path.join(dir, f))
}
