# Capacidad: cuánta gente aguanta Patitas Connect

Lo que sigue es una estimación hecha con **dos pruebas reales** (carga sobre la versión de producción y una simulación de un mes de paseos) más los **límites oficiales de los planes gratuitos**, verificados en octubre de 2026. No es una garantía: es una forma ordenada de saber dónde se rompería primero y qué hacer antes de que pase.

## Resumen en 5 líneas

1. **La página en sí casi no se puede caer**: todas las pantallas son estáticas (se sirven como archivos). En mi Mac aguantó ~4 500 visitas por segundo sin errores con 500 personas conectadas a la vez.
2. Lo que sí tiene límites es el **servicio de datos** (chat, GPS, fotos, reservas) cuando conecten una base de datos real. Con el plan **gratuito de Supabase** caben cómodamente **hasta ~200 clientes recurrentes**.
3. El primer límite que se toca es el **tamaño de la base de datos (500 MB)**, no la cantidad de gente conectada: con 200 clientes el pico fue de ~30 conexiones simultáneas (el límite es 200).
4. Las **fotos** (1 GB) son el segundo límite: por eso se reducen a ~60 KB y se borran a los 30 días.
5. **Importante:** el plan gratuito de Vercel (Hobby) **prohíbe uso comercial**. Si cobran por los paseos, necesitan un plan de pago o un hosting que lo permita (ver más abajo).

## 1. Prueba de carga (versión de producción, `next build` + `next start`)

Script: un generador de visitas sin dependencias, ejecutado en la misma computadora (por eso es una medición conservadora: el generador le quita CPU al servidor).

| Personas conectadas a la vez | Página | Visitas/seg | Tiempo típico (p50) | Peor 1 % (p99) | Errores |
|---|---|---|---|---|---|
| 50 | `/` | 4 729 | 9,5 ms | 19 ms | 0 |
| 200 | `/` | 5 147 | 38 ms | 53 ms | 0 |
| 500 | `/` | 4 678 | 90 ms | 149 ms | 0 |
| 1 000 | `/` | 4 472 | 124 ms | 172 ms | 279 (0,7 %) |
| 500 | `/paseador` | 4 444 | 90 ms | 153 ms | 0 |

- Lo que descarga una persona la primera vez: **~320 KB** (comprimido) la app del cliente y **~285 KB** la del paseador. Con 1 000 visitas nuevas al día son ~0,3 GB al día.
- Con 1 000 conexiones simultáneas empezaron errores de conexión (límites del sistema operativo y del proceso único). En producción real esto lo absorbe una red de distribución (CDN) y deja de ser problema.

**Qué significa:** la web no es el cuello de botella. Aunque salgan en un grupo de vecinos o en TikTok, hoy la parte visual aguantaría varias veces el tráfico que van a tener.

## 2. Simulación de un mes de paseos

Script: [`simulacion-capacidad.mjs`](simulacion-capacidad.mjs). Se corre con `node docs/simulacion-capacidad.mjs` y todos los supuestos están arriba del archivo para que los cambien.

Supuestos principales: cada cliente pasea **2,5 veces por semana**; **2,2 perros por paseo grupal**; 60 minutos; picos de **7–9 h y 17–19 h**; el paseador envía su ubicación **cada 30 s**; el 60 % de los dueños mira "En vivo"; 25 mensajes de chat/avisos y 4 fotos por paseo.

| Clientes recurrentes | Paseos/mes | Conexiones en el pico | Mensajes/seg en el pico | Mensajes/mes | Fotos (30 días) | Salida de datos/mes | Base de datos en 1 año | ¿Cabe en gratis? |
|---|---|---|---|---|---|---|---|---|
| 25 | 127 | 13 | 0,5 | 0,04 M | 30 MB | 0,15 GB | 47 MB | Sí |
| 100 | 494 | 21 | 0,8 | 0,17 M | 116 MB | 0,57 GB | 182 MB | Sí |
| 200 | 1 002 | 30 | 1,2 | 0,34 M | 235 MB | 1,15 GB | 371 MB | **Sí** |
| 300 | 1 482 | 40 | 1,6 | 0,50 M | 347 MB | 1,69 GB | 546 MB | No: base de datos |
| 600 | 2 957 | 67 | 2,7 | 1,01 M | 693 MB | 3,39 GB | 1 095 MB | No: base de datos |
| 1 200 | 5 949 | 126 | 5,1 | 2,02 M | 1 394 MB | 6,8 GB | 2 194 MB | No: todo |

**Cómo leerlo:** su plan de negocio habla de llegar a **100–150 clientes recurrentes en 6–9 meses**. Eso cabe en el plan gratuito con holgura (≈ 20–30 conexiones en el pico, 0,2 M mensajes de 2 M). Cuando pasen de ~250 clientes, hay que pasar a un plan de pago o reducir lo que se guarda.

Límites del plan gratuito de Supabase usados (fuente: [supabase.com/pricing](https://supabase.com/pricing) y [docs de Realtime](https://supabase.com/docs/guides/realtime/limits), octubre 2026): 200 conexiones Realtime simultáneas · 100 mensajes/s · 2 millones de mensajes/mes · 500 MB de base de datos · 1 GB de archivos · 5 GB de salida/mes · 50 000 usuarios activos/mes. **Los proyectos gratuitos se pausan tras 1 semana sin actividad.** El plan Pro parte de **US$ 25 al mes** (500 conexiones, 5 M de mensajes, 8 GB de base de datos, 100 GB de archivos y no se pausa).

## 3. Dónde se rompería primero (y qué hacer)

| Orden | Cuello de botella | Cuándo | Qué hacer desde el día 1 |
|---|---|---|---|
| 1 | **Base de datos 500 MB** | ~250 clientes en el primer año | Guardar **un punto de GPS por minuto** (no cada 30 s) en la base; el resto va solo por Realtime y no se guarda. Archivar o borrar la ruta de paseos de más de 90 días. Índices solo donde hagan falta. |
| 2 | **Fotos 1 GB** | ~400 clientes (con retención de 30 días) | Reducir al subir (ya lo hace la app: 640 px, JPEG 82 %). Borrar a los 30 días; el dueño puede "guardar" las que quiera (eso se paga aparte). |
| 3 | **Mensajes/mes 2 M** | ~1 000 clientes | Enviar la ubicación cada 30 s y solo mientras el dueño tiene abierta la pantalla "En vivo". No usar *presence* (cuenta como mensajes). |
| 4 | **Salida de datos 5 GB** | ~1 000 clientes | Las fotos pesan lo que más. Servirlas con caché del navegador. |
| 5 | **Conexiones 200** | ~1 500 clientes | Conectarse a Realtime solo cuando se abre "En vivo", y desconectar al salir. |

**Pico de la mañana:** la simulación usa horas pico reales de paseo (7–9 h y 17–19 h). El peor minuto con 1 200 clientes tuvo 126 conexiones y 5 mensajes por segundo: lejos de los 200 y 100 permitidos.

## 4. Dónde alojar la web (muy importante)

- **Vercel, plan Hobby (gratis): solo uso no comercial.** Según sus [reglas de uso justo](https://vercel.com/docs/limits/fair-use-guidelines) (revisadas en sept. 2026), cualquier sitio usado "para obtener ganancia de cualquiera que participe en la producción del proyecto" o que procese pagos requiere el plan Pro. Patitas cobra una comisión por paseo, así que **no pueden usar Hobby en producción**. Para el prototipo y las demostraciones sí.
- **Opciones**: (a) Vercel **Pro** (de pago por integrante; revisen el precio vigente en vercel.com/pricing); (b) **Cloudflare Pages** (plan gratuito con 500 despliegues al mes y 20 000 archivos; la página de límites no menciona restricción comercial, pero **confírmenlo en sus términos** antes de apoyarse en eso); (c) cualquier VPS pequeño. Esta app compila a páginas estáticas, así que cualquiera de las tres funciona.
- **Base de datos + chat + fotos**: Supabase Free para validar (lanzamiento suave con 30–50 clientes) y **pasar a Pro (US$ 25/mes) apenas haya dinero entrando**, para que no se pause y tener copias de seguridad diarias.

## 5. Lo que ya está hecho en el código para que "no pase nada raro"

- Páginas estáticas: no dependen de un servidor para mostrarse.
- Pantallas de error amables (`app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`) en vez de una página en blanco.
- Todo lo que se guarda en el navegador está protegido contra "sin espacio" y contra navegación privada; la app sigue funcionando sin guardar.
- Fotos reducidas antes de subirlas (640 px) y mensajes limitados a 500 caracteres.
- El chat y los eventos del paseo tienen **identificadores únicos** y se de-duplican, así que si llegan dos veces no se repiten.
- Cuentas nuevas de clientes: 18+, celular verificado, términos aceptados por bloques.

## 6. Lista antes de lanzar con clientes reales

1. Poner la base de datos real (Supabase) con **reglas de seguridad por fila** (cada dueño solo ve su perro, cada paseador solo ve sus paseos asignados).
2. **Límites por usuario**: máximo de mensajes por minuto y de fotos por paseo, para evitar bromistas o abuso.
3. Pasar a **hosting que permita uso comercial**.
4. Repetir esta simulación con datos reales del primer mes y ajustar los supuestos.
5. Hacer una **prueba de carga con la base real** antes de abrir al público (esta que ven aquí solo prueba la parte visual).
6. Crear alertas simples: base de datos al 70 %, fotos al 70 %, mensajes al 70 %.

## Qué NO prueban estas pruebas

- No prueban el servicio de datos real (todavía no existe: hoy el chat y el paseo se simulan en el navegador).
- La carga se generó desde la misma computadora que el servidor.
- Los supuestos de comportamiento (2,5 paseos por semana, 60 % mirando "En vivo", etc.) son **míos**: cámbienlos en el script con lo que vean en su primer mes.
