import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['lib/**/*.test.ts', 'components/**/*.test.{ts,tsx}'],
    environment: 'node',
    // Las pruebas de punta a punta con PGlite y el cliente de Supabase por HTTP hacen muchas idas y vueltas: con todo el
    // proyecto corriendo a la vez en una máquina chica pueden pasar los 5 s de siempre. Un tiempo mayor no esconde nada:
    // solo cuenta cuando algo falla de verdad.
    testTimeout: 60_000,
  },
})
