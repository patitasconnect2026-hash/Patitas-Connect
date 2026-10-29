// Prueba el SQL de supabase/ en una base Postgres 16 temporal (PGlite): sin Docker, sin Supabase y sin red.
// Uso (una sola vez, sin guardar nada en package.json):  npm i --no-save @electric-sql/pglite@0.2.17
//   node supabase/tests/probar_en_pglite.cjs            corre todos los supabase/tests/database/*.test.sql
//   node supabase/tests/probar_en_pglite.cjs paseos     corre solo los archivos cuyo nombre contiene «paseos»
// Aplica TODAS las migraciones de supabase/migrations/ y simula lo que Supabase ya trae (roles, auth.uid(), storage)
// con una versión mínima de pgTAP (ver base_pglite.mjs). No reemplaza `supabase test db`.
// Es CommonJS a propósito (se llama con node directo) y por eso carga el resto con import() dinámico.
async function main() {
  const { archivosDeMigraciones, archivosDePruebas, correrArchivoDePruebas } = await import('./base_pglite.mjs')
  const path = await import('node:path')
  const filtro = process.argv[2]
  for (const f of archivosDeMigraciones()) console.log('OK  ', 'migrations/' + path.basename(f))

  let total = 0
  let fallan = 0
  for (const archivo of archivosDePruebas(filtro)) {
    const r = await correrArchivoDePruebas(archivo)
    total += r.total
    fallan += r.fallan.length
    if (r.errorGeneral) {
      fallan += 1
      console.log('ERROR en', path.basename(archivo), ':', r.errorGeneral)
    }
    for (const x of r.fallan) console.log('NO  ', path.basename(archivo), x.n, x.descr, '|', x.detail)
    console.log(`${path.basename(archivo)}: ${r.total} pruebas, fallan: ${r.fallan.length}${r.errorGeneral ? ' (y hubo un error general)' : ''}`)
  }
  console.log(`pruebas: ${total}, fallan: ${fallan}`)
  if (fallan > 0) process.exitCode = 1
}

main().catch((e) => {
  console.log('FALLA', e instanceof Error ? e.message : e)
  process.exitCode = 1
})
