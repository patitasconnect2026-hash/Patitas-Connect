# Patitas Connect

El nombre de la app es «Patitas Connect», como el logo oficial (`public/marca/logo-lockup.png`; constante `NOMBRE_APP` en `lib/config.ts`; no escribas el nombre a mano en los textos). Letra del logotipo y los titulares: Cinzel; colores: terracota (`brand`) y vino (`vino`), en `app/globals.css`. La carpeta, el paquete, las skills y las claves de `localStorage` (`patitas:…`) conservan su nombre actual.

Marketplace de paseadores de perros verificados en San Isidro y Jesús María (Lima). Equipo de 3 estudiantes, presupuesto cero, etapa de piloto sin cobros. Next.js 16, React 19, TypeScript, Tailwind 4.

## Qué skills usar y quién manda en qué
- `patitas-connect`: reglas del negocio, mecánicas y textos permitidos. Manda en QUÉ se construye.
- `buena-pagina`: calidad, pruebas, celular y pantallas simples. Manda en CÓMO se construye. Empieza por su sección 10 antes de tocar las mecánicas.
- Diseño (colores de marca, tipografías, logo, mascota): es de otra persona del equipo. Si hay diseños en Figma, ellos mandan. No se cambia la identidad.
- Si dos reglas chocan, para y pregunta.

## Cómo trabajar
- Al empezar, lee `docs/CONTEXTO.md` (el negocio y sus reglas) y `docs/AVANCE.md` (dónde vamos; es corto y se lee siempre). `docs/HISTORIAL.md` tiene el detalle de lo hecho: ábrelo solo cuando haga falta, no al empezar.
- Una tarea por vez: plan corto, espera el OK, cambia lo mínimo, comprueba, commit pequeño.
- Responde en español simple y explica cada paso: el equipo está aprendiendo.
- Nunca digas "listo" sin haber corrido las comprobaciones. Di siempre qué no pudiste probar.
- No hay empresa, RUC, pasarela de pagos ni servidor: lo que cuesta dinero queda simulado y marcado como simulado.
- Con Playwright usa solo la página local; no entres a cuentas personales.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
