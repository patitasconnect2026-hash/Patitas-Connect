---
name: buena-pagina
description: Cómo construir y revisar pantallas web (Next.js, React, Tailwind) sin errores y simples en el celular; úsala siempre que crees o cambies pantallas, formularios, estilos o corrijas fallas.
---

# Buena página: simple, clara y sin errores

Esta skill dice CÓMO construir. La skill `patitas-connect` dice QUÉ construir (reglas del negocio, mecánicas, textos permitidos). Úsalas juntas; si chocan, para y pregunta.
Sobre el diseño: la identidad (colores de marca, tipografías, logo, mascota) es de quien diseña y no se cambia. Simplificar pantallas, subir contraste y tamaños de letra y aclarar textos SÍ está permitido con las reglas de la sección 6, mostrando antes el plan. Esto aclara la regla de `patitas-connect` de no cambiar estilos.

## 1. Cuatro principios
1. Entiende antes de tocar: lee el archivo, quién lo usa y si ya existe algo parecido que puedas reutilizar.
2. Un cambio chico por vez. No reescribas pantallas enteras ni muevas carpetas "para ordenar".
3. "Listo" significa que lo ejecutaste y lo miraste. Lo que no pudiste probar, lo dices.
4. Simple es quitar. Antes de agregar algo, pregunta qué sobra.

## 2. Ciclo de cada tarea
1. `git status`. Si el proyecto no tiene git, lo primero es `git init` y un commit base: sin eso no se puede volver atrás. Trabaja en una rama (`git switch -c nombre-corto`).
2. Plan en 5 líneas: qué cambias, en qué archivos y cómo lo vas a comprobar. Espera OK si toca varias pantallas o un archivo grande.
3. Cambia lo mínimo.
4. Comprueba (sección 3) y mira la pantalla (sección 4).
5. Commit pequeño, en español, que diga qué cambió y por qué.
6. Reporta (sección 9).
Si un error no se arregla en 3 intentos, para y explica qué probaste. No sigas a ciegas.

## 3. Comprobaciones: todas deben pasar antes de decir "listo"
- `npm run typecheck` (`tsc --noEmit`), `npm run lint`, `npm run test` y `npm run build`.
- Si faltan esos scripts, crearlos es la primera tarea: ESLint con la configuración de Next y Vitest, ambos gratis. Si una herramienta no funciona con las versiones instaladas (por ejemplo TypeScript 7), no cambies versiones sin preguntar: explica el problema y propón una alternativa.
- Consola del navegador limpia: cero `console.error`, cero avisos de hidratación, cero excepciones, tanto en `npm run dev` como en `npm run build && npm start`.
- Prohibido esconder problemas: nada de `any`, `@ts-ignore`, `eslint-disable` nuevos, `catch {}` vacío, ni borrar o aflojar una prueba para que pase.

## 4. Mirar la pantalla de verdad
- Corre la página y recórrela a 390×844, a 360×640 (celular chico) y a 320 px de ancho (sin scroll horizontal), y también en computadora.
- Usa Playwright (gratis) para abrir cada ruta en tamaño celular, recorrer el flujo principal, tomar capturas y FALLAR si hay `console.error`, `pageerror` o respuestas con error. Abre las capturas (son imágenes) y mira de verdad: texto cortado, botones tapados, desbordes.
- Playwright puede simular ubicación, permisos y cámara falsa (`--use-fake-device-for-media-stream`) para probar el flujo; no reemplaza un celular real.
- Recorre siempre: primera vez sin datos guardados; con datos de una versión anterior; recargar a mitad de un paso; botón atrás; doble toque en botones; permisos de cámara o ubicación denegados; conexión lenta.
- Accesibilidad: corre `@axe-core/playwright` o Lighthouse (sobre `npm run build && npm start`) y arregla lo crítico y serio. Los puntajes orientan; no son la meta.

## 5. Fallas típicas de este stack (revísalas siempre)
**Next.js y React**
- Hidratación: nada de `window`, `localStorage`, `Date.now()` ni `Math.random()` en el primer render de lo que se pinta en servidor. Lee lo guardado en un `useEffect` (o `useSyncExternalStore`) y muestra un estado de carga mientras tanto.
- Lo que usa `window`, Leaflet, cámara o GPS va en componente cliente. Leaflet se carga dentro de un efecto o con `next/dynamic` y `ssr: false` desde un componente cliente.
- Limpia al salir de la pantalla: `setInterval`/`setTimeout`, listeners (`storage`, `resize`), `clearWatch` del GPS, `stream.getTracks().forEach(t => t.stop())` de la cámara y suscripciones del bus. En desarrollo React ejecuta los efectos dos veces a propósito: si algo se duplica (timers, avisos, mensajes), falta limpieza.
- Datos guardados: `localStorage` siempre en `try/catch`, avisando al usuario si no se pudo guardar (no tragar el error); `JSON.parse` protegido; claves con versión (`patitas:v3:…`) y migración o descarte seguro cuando cambie la forma de los datos, porque los celulares de prueba conservan los datos viejos. Las fotos pesan: comprímelas, guarda pocas y maneja `QuotaExceededError`.
- Botones que cambian algo (reservar, confirmar, enviar): se desactivan mientras se procesan; un doble toque no duplica nada.
- Listas con `key` estable (el id, no el índice). No guardes en estado lo que se puede calcular.
- Dinero en céntimos (enteros) o redondeo una sola vez al final; se muestra con `Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })`. Los descuentos (10 %) no acumulan decimales.
- Fechas y horas en `America/Lima` (sin horario de verano) con `Intl.DateTimeFormat`, aunque el celular tenga otra zona. El horario de 6:00 a 21:00 se valida con la hora de Lima.
- Next 16 y React 19 cambian cosas que muchos tutoriales no dicen (por ejemplo, `params` y `searchParams` son asíncronos). Si no estás seguro de una API, lee la documentación de la versión instalada; no la escribas de memoria.
- Tailwind 4: la configuración vive en CSS (`@theme` en `app/globals.css`). No uses clases renombradas de Tailwind 3 (`shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`, `bg-opacity-50`→`bg-black/50`, `flex-shrink-0`→`shrink-0`). Usa los colores del tema; no escribas hex nuevos en los componentes.
- `next/image` con fotos de otro dominio exige declararlo en `next.config.ts` (`images.remotePatterns`); si no, da error. Fotos que vienen de la cámara o de `localStorage`: `<img>` normal con ancho y alto.
- Seguridad básica: nada de `dangerouslySetInnerHTML` con texto de usuarios; las variables `NEXT_PUBLIC_` se ven en el navegador, ahí no van claves; sin datos personales en `console.log`. Una contraseña que solo se comprueba en el navegador no protege nada: se comprueba en el servidor (ruta de Next) y se guarda una cookie `httpOnly`.

**Celular**
- Alturas con `dvh`, no `100vh`. Barras fijas abajo con `env(safe-area-inset-bottom)`.
- Campos de formulario con letra de 16 px o más: con menos, el iPhone hace zoom al tocar el campo. Usa `type`, `inputMode` y `autoComplete` correctos, y que el teclado no tape el campo ni el botón.
- Zonas táctiles de 44×44 px o más y separadas entre sí. Nada que dependa de `hover`. Todo gesto de deslizar tiene alternativa de toque.
- `PhoneFrame` (el marco de teléfono) solo aparece desde 640 px de ancho; en un celular real la app ocupa toda la pantalla. No lo rompas.
- Cámara y ubicación exigen HTTPS (localhost sirve). Explica para qué antes de pedir el permiso y, si lo niegan, muestra qué hacer sin romper nada.
- Conexión lenta (datos móviles): lo pesado (mapa) se carga solo cuando se usa; las imágenes tienen ancho y alto para que nada salte.

## 6. Simple a la vista
La identidad no se toca; ordenar, quitar y aclarar sí.
1. Una pantalla, un objetivo, UN botón principal. Lo demás es más discreto. Regla práctica: si hay más de 5 a 7 cosas tocables, divide o esconde lo secundario.
2. Prueba de 5 segundos: quien ve la pantalla debe entender para qué sirve y qué tocar. Si no puedes explicarla en una frase, está recargada.
3. Quita antes de agregar. Si dos cosas dicen lo mismo, deja una. Evita tarjetas dentro de tarjetas y borde + sombra + degradado a la vez: elige uno.
4. Jerarquía clara: un título, un subtítulo corto, el contenido. Máximo 3 tamaños de texto por pantalla. Lo que se lee para decidir (precios, horas, avisos, botones) va en 14 px o más; 11 a 12 px solo para etiquetas secundarias.
5. Espaciado con la escala de Tailwind (4, 8, 12, 16, 24…), igual en todas las pantallas. Agrupa lo relacionado y separa lo que no.
6. Contraste mínimo de 4,5:1 en texto normal (3:1 en texto grande: 24 px, o 18,7 px en negrita):
   - Texto gris: `text-ink/65` o más oscuro (5,4:1 sobre el fondo crema y 4,9:1 sobre `sand-2`). `text-ink/60` queda justo (4,6:1 sobre crema, pero 4,2:1 sobre `sand-2`) y de `/55` para abajo no pasa. Crea un color de texto secundario único (token en `@theme`) en vez de editar uno por uno.
   - Botón naranja con texto blanco: `bg-brand-700` (5,2:1). `bg-brand-600` con blanco da 3,6:1 y no pasa; con texto oscuro (`ink`) da 5,0:1.
   - Texto naranja sobre crema: `text-brand-700` (4,8:1); `text-brand` da 3,3:1.
   - El estado nunca va solo en color: agrega ícono o texto.
7. Textos: español de Perú, tuteo, frases cortas, verbo claro en los botones ("Reservar paseo", no "Continuar"). Un solo nombre para cada cosa. Sin tecnicismos. El título de la pestaña y la descripción (`metadata` en `app/layout.tsx`) dicen lo mismo que la pantalla.
8. Cada pantalla tiene sus cuatro estados: cargando, vacío (mensaje + qué hacer), error (qué pasó + qué hacer + reintentar) y éxito (confirmación clara). Nada de pantalla en blanco ni de spinner infinito.
9. Formularios: etiqueta visible (el placeholder no es etiqueta); error junto al campo, en lenguaje humano; no borrar lo escrito al fallar; pedir solo lo necesario; si son muchos campos, varios pasos que digan cuántos faltan.
10. Navegación: 4 o 5 destinos abajo como máximo; siempre se sabe dónde estás y cómo volver. Lo destructivo pide confirmación y "Cancelar" es más fácil de tocar que "Borrar".
11. Animaciones cortas (300 ms o menos) y con propósito; respeta "reducir movimiento". Nada se mueve sin parar.
12. Fotos livianas y con `alt`. Íconos de Lucide, todos del mismo estilo.

## 7. Accesibilidad básica
- `button` para acciones y `a` para navegar; nunca un `div` con `onClick`. Foco visible, orden de Tab lógico, `aria-label` en botones que solo tienen ícono, `aria-live` para avisos que aparecen solos, hojas y ventanas que se cierran con Esc y devuelven el foco.
- Pruébalo recorriendo la pantalla solo con la tecla Tab.

## 8. Qué NO hacer
- No reescribas archivos enteros. Los más grandes (`BookingSheet`, `WalkerHome`, `PatitasApp`, `Onboarding`, `WalkerOnboarding`, `LiveWalk`) se tocan por partes y con una prueba antes.
- No agregues librerías sin necesidad; si hace falta una, que sea gratis, mantenida y liviana, y pregunta antes.
- No cambies versiones de Next, React, TypeScript ni Tailwind sin preguntar.
- No inventes datos reales ni dejes claves, `console.log` o TODO sueltos.
- Nada destructivo (`rm -rf`, `git reset --hard`, `git push --force`, borrar ramas) sin permiso.
- No digas "listo", "sin errores" ni "perfecto" sin haber corrido la sección 3.

## 9. Cómo reportar
Máximo 10 líneas, en español simple:
1. Qué cambié (archivos).
2. Qué comprobé y el resultado (tipos, lint, pruebas, build, consola, capturas en celular).
3. Qué NO pude probar y cómo probarlo en un celular real, paso a paso.
4. Riesgos o dudas.
5. Siguiente paso sugerido.

## 10. Primera vez en este proyecto
Haz esto antes de las tareas de mecánicas de `patitas-connect`.
A. `git init` y commit base (revisa que `.gitignore` excluya `node_modules`, `.next` y `.env*`).
B. `npm install`, `npm run build` y `npm run dev`. Anota los errores y avisos que ya existen. No arregles todavía.
C. Agrega los scripts de la sección 3 y un test de humo con Playwright (cada ruta a 390×844; falla ante errores de consola).
D. Entrega un informe corto con una lista priorizada: (1) lo que rompe, (2) fallas en celular, (3) lo que confunde, (4) pulido. Cada punto con archivo y cómo se arregla. Espera OK y arregla de a uno.

Hallazgos conocidos al 9 de octubre de 2026 (confírmalos antes de arreglar; pueden haber cambiado):
1. No es repositorio git, no hay scripts `lint`, `test` ni `typecheck` y no hay marco de pruebas.
2. Los campos usan letra de 15 px (`inputBase` en `lib/ui.ts` y el chat) y de 14 px (áreas de texto de reseñas y notas): el iPhone hace zoom al tocarlos. Subir a 16 px.
3. Contraste: casi 200 usos de `text-ink/30` a `/55` (incluye los placeholders) y botones `bg-brand-600` con `text-white` (3,6:1).
4. Letra muy chica: unos 100 usos de `text-[11px]` y `text-[12px]`, y etiquetas de 11,5 px en gris claro (por ejemplo, en el formulario de tarjeta).
5. El título de la pestaña y la descripción (`app/layout.tsx`) y el panel de escritorio de `PhoneFrame` dicen "Paseos seguros", "pago en custodia" y "GPS en tiempo real": cámbialos según la sección 6 de `patitas-connect`.
6. `BookingSheet` pide pagar dentro de la app (tarjeta con número, vencimiento y CVV, o Yape y Plin) aunque el piloto no cobra por la app. Según `patitas-connect` (pago acordado) se reemplaza; mientras tanto no guardes esos datos en ningún sitio.
7. Cinco efectos con `react-hooks/exhaustive-deps` desactivado (`LiveMap`, `useLeaflet`, `BookingSheet`, `WalkerOnboarding`, `lib/bus.ts`): revisa que no usen datos viejos.
8. Archivos grandes: `BookingSheet` (unas 740 líneas), `WalkerHome` (650), `PatitasApp` (620).

Lo que ya está bien y no debe romperse: `lang="es"` y `viewportFit: 'cover'`, alturas con `dvh`, Leaflet cargado dentro de un efecto, `MotionConfig reducedMotion="user"`, `:focus-visible`, `localStorage` con `try/catch`, fotos comprimidas antes de guardar y `strict` activo en TypeScript.
