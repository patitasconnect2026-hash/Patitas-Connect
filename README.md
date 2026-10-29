# Patitas Conectadas · prototipo v3

Marketplace de paseadores de perros para **San Isidro y Jesús María** (Lima). Es un prototipo 100 % frontend para mostrar a clientes y validar el negocio: no hay base de datos ni cobros reales. Incluye **la app del cliente (`/`)**, **la app del paseador (`/paseador`)** y un **panel interno de revisión (`/admin`)**.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Framer Motion · Lucide · Leaflet (mapas reales) · TypeScript.

> **Documentos:**
> - [`docs/INVESTIGACION-Y-PLAN.md`](docs/INVESTIGACION-Y-PLAN.md): mercado, ley, economía y plan de salida.
> - [`docs/FILTROS-Y-PERFIL-PASEADORES.md`](docs/FILTROS-Y-PERFIL-PASEADORES.md): los 8 filtros de seguridad sin costo, cómo medir la evaluación, uso de IA con supervisión y cómo armar un buen perfil.
> - [`docs/CAPACIDAD.md`](docs/CAPACIDAD.md): cuánta gente aguanta, pruebas de carga y simulación (`node docs/simulacion-capacidad.mjs`).

## Cómo correrlo

Necesitas [Node.js](https://nodejs.org) (versión LTS).

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Si da un error de Turbopack, usa `npx next dev --webpack`.
Desde el celular (mismo Wi-Fi) usa la dirección "Network" que muestra la terminal.

## Recorrido sugerido

**Demostración con dos pestañas** (lo más vistoso para mostrar a clientes y a inversionistas):

1. Pestaña A: la app del cliente en `/`. Toca "usar cuenta de demostración".
2. Pestaña B: la app del paseador en `/paseador`. Toca "Entrar como paseador de demostración".
3. En A, **"Ver demo del paseo en vivo"** (o reserva a un paseador). En B aparece el paseo con la ficha del perro.
4. En B, pide el **código de recojo** que ve el cliente en "En vivo", verifícalo, **inicia el paseo**, manda avisos (pipí, agua) y **fotos reales**. En A aparecen al instante en la bitácora y el chat.
5. En B toca **"Entregué a… en casa"**. En A se habilita **"Confirmar llegada"**; al deslizar, el pago se libera y en B suben las ganancias.
6. Cada pestaña puede chatear con la otra, con texto y fotos.

**Postulación de un paseador de verdad:**

1. En `/` toca **"Crear cuenta de paseador"** (debajo de "Crear mi cuenta"), o entra a `/paseador`. Son 8 pasos: celular con código (demo `482913`), 7 acuerdos (incluye mostrar el DNI), datos y selfie, perfil público, evaluación de situaciones, registros públicos, avales y videollamada, resumen.
2. En `/admin` revisa la postulación (respuestas, alertas, documentos) y toca **"Aprobar para paseos acompañados"**.
3. El paseador aparece en la app del cliente como **"Nuevo · en periodo de prueba"**, con su DNI oculto (botón "Ver completo" con compromiso y registro de accesos).

**App del cliente:**

1. **Crear cuenta:** celular + código, **mayor de 18** (fecha de nacimiento), datos, **términos aceptados bloque por bloque** y registro del perro con foto.
2. **Explorar:** paseadores ordenados según el **tamaño de tu perro**, con "Su paseo incluye", filtros y ♥ favoritos.
3. **Mapa**, **agendar** (6:00–21:00, sin mezclar tamaños), **pago en custodia**, **paseo en vivo** con ruta real, **chat con fotos**, SOS, **confirmar llegada** y **reseña verificada**.
4. **Seguridad:** los filtros reales de verificación. **Perfil:** perros, ficha, chapita QR y reseñas.

## Afiche para edificios

`/afiche?e=Nombre del edificio&c=CODIGO` genera un afiche A4 imprimible con un QR único por edificio. El QR abre la app con el código ya puesto y el descuento de bienvenida, así se mide qué edificio convierte mejor. Ejemplo: `/afiche?e=Torre Los Olivos&c=OLIVOS`.

## Estructura

```
app/               layout, fuentes (Fraunces + Figtree), manifest PWA, ícono (Chasqui), errores
  paseador/        app del paseador          admin/   panel interno de revisión
  marca/           hoja de marca (logos y mascota)   afiche/   afiche A4 con QR
components/
  PatitasApp.tsx   app del cliente: cuenta, navegación, reloj del paseo y conexión con el paseador
  PhoneFrame.tsx   marco de teléfono compartido por las dos apps
  Onboarding.tsx   crear cuenta (18+, términos, perro)
  Explore.tsx · WalkerCard.tsx · DniSheet.tsx · HeroHighFive.tsx
  LiveWalk.tsx · ChatSheet.tsx · ChatThread.tsx (chat con fotos, lo usan ambas apps) · SosSheet · ConfirmSheet
  walker/          WalkerApp · WalkerOnboarding (8 pasos) · QuizStep · ProfileBuilder · WalkerHome
  admin/           AdminPanel
  ui/              Chasqui (mascota), Logo, sellos, perros ilustrados, QR, hojas
lib/
  bus.ts           "bus" de demostración entre pestañas (localStorage): chat, paseo, avisos, presencia
  walkerStore.ts   postulación del paseador (guardada en el navegador)
  quiz.ts          evaluación de situaciones y su puntaje   legal.ts   términos en bloques (BORRADOR)
  geo.ts · schedule.ts · data.ts · walk.ts · route.ts · store.ts
docs/              investigación, filtros, capacidad y simulación
```

## Personalizar

- **Paseadores, precios y reseñas:** `lib/data.ts`. Cada paseador acepta `photo: 'https://…'` para usar una foto real.
- **Qué tamaños acepta cada paseador y en qué horarios trabaja:** `accepts` y `windows` en `lib/data.ts`.
- **Disponibilidad:** hoy es simulada y determinista (`lib/schedule.ts`). En producción vendría de la base de datos.
- **Colores:** `app/globals.css` (marca `#ea580c`, tinta `#0f172a`, papel crema `#fbf6ee`).

## Lo que es simulado

El pago, el GPS, la disponibilidad, las reseñas de ejemplo, las ilustraciones de fotos y el código por SMS. La cuenta, los perros, tus reseñas y la postulación del paseador se guardan **solo en tu navegador** (`localStorage`). El chat y el paseo entre las dos apps funcionan con el evento `storage` entre pestañas del **mismo navegador**: en producción eso lo reemplaza una base de datos con tiempo real (por ejemplo Supabase Realtime). "Cerrar sesión y reiniciar la demo" en Perfil lo borra. En modo local el panel `/admin` no tiene inicio de sesión. **Con `NEXT_PUBLIC_DATOS=servidor`** (más `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`) la app usa Supabase: cuentas, paseos, chat, fotos, pagos, postulaciones, casos, reseñas y «Borrar mi cuenta» viven en la base, y `/admin` pide la cuenta del equipo. Sin esas variables todo sigue como arriba. Los pasos y las migraciones: [`docs/PUBLICAR.md`](docs/PUBLICAR.md) y [`supabase/LEEME.md`](supabase/LEEME.md).

**Textos legales:** `lib/legal.ts` son **borradores**; deben revisarlos un abogado antes de usarse con clientes reales.

## Mapas

Se usan los mosaicos públicos de OpenStreetMap (sin clave, para demo). Para publicar, usa un proveedor con plan (MapTiler, Stadia, Mapbox) o servidor propio, y respeta la atribución. Los límites de los distritos y la ruta salen de OpenStreetMap (ODbL).

## Publicarlo

> **Ojo con Vercel:** su plan gratuito (Hobby) **no permite uso comercial**. Sirve para el prototipo y las demostraciones; para cobrar por paseos necesitan un plan de pago o un hosting que lo permita. Detalles en [`docs/CAPACIDAD.md`](docs/CAPACIDAD.md).

1. Sube esta carpeta a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio → **Deploy**.
3. Obtienes un enlace tipo `patitas-connect.vercel.app`. El QR del afiche y de la chapita usan ese dominio automáticamente.

> La app no mueve dinero: Patitas cobra a mano y el equipo lo marca en `/admin` (ver `docs/AVANCE.md`). Para encender el servidor (Supabase) sigue «Encender el servidor» en [`docs/PUBLICAR.md`](docs/PUBLICAR.md).
