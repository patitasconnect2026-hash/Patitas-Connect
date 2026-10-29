import { defineConfig } from '@playwright/test'

// Prueba de humo: solo abre la página LOCAL, nunca cuentas personales.
// Usa el Chrome ya instalado en la computadora (no descarga navegadores).
const PUERTO = 3100

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    channel: 'chrome',
    viewport: { width: 390, height: 844 },
  },
  // Prueba sobre la versión de producción (build + start), como pide buena-pagina.
  webServer: {
    command: `npm run build && npx next start -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
