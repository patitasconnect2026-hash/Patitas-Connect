# Cómo publicar la app con HTTPS, sin gastar

**Para qué sirve este documento:** comparar dos opciones gratuitas y dejar los pasos escritos. **Actualización (11 de octubre de 2026): la app ya se publicó en Vercel, plan gratis** (ver `docs/AVANCE.md`). Las opciones de abajo siguen como comparación; dónde publicar es decisión del equipo. **Actualización (15 de octubre de 2026): los pasos para encender el servidor (`NEXT_PUBLIC_DATOS=servidor`) están justo debajo** y no cambian dónde se publica.

**Por qué hace falta:** la ubicación y la cámara solo funcionan con HTTPS (o en `localhost` de la propia computadora). Desde un celular, `http://192.168.x.x:3000` no sirve.

> ## ⚠ El equipo debe confirmar si el plan gratis permite uso comercial
> Ninguna de las páginas oficiales que leí lo dice (ni que sí ni que no). **No lo supongas.** Antes de publicar, lee las condiciones de uso de la opción que elijan. Ahora pesa más: Patitas **cobra a familias** (aunque sea a mano), así que ya no es solo una demostración. Y antes de cobrar a familias reales hay que **consultar a un contador y a un abogado** (ver `docs/AVANCE.md`).

## Encender el servidor (`NEXT_PUBLIC_DATOS=servidor`): lista de pasos

**Qué es:** hoy la app publicada funciona en **modo local** (todo se guarda en el navegador de cada persona). Con tres variables, la misma app usa Supabase: cuentas con correo, paseos, chat, fotos, pagos, postulaciones, reportes, reseñas y «Borrar mi cuenta», **entre celulares distintos**. Sin `NEXT_PUBLIC_DATOS`, la cuenta de demostración y el paseador de ejemplo siguen igual que hoy.

**Esta lista solo deja los pasos escritos.** Nadie la ha ejecutado: no se tocó Vercel, ni Supabase, ni ninguna cuenta, y no se usó ninguna clave. Cada paso lo hace una persona del equipo con su propia cuenta.

> ⚠ **Encender el servidor no es abrirlo a familias reales.** Con servidor, la dirección de la casa, la ficha del perro y el contacto de emergencia viven en un servicio de un tercero. Antes de usar datos de familias reales hay que cerrar lo de «Lo que falta y NO es código» en `docs/AVANCE.md` (abogado y textos legales, revisión veterinaria del curso, SOS, correo propio, plan de hosting).

### 1. Las tres variables
En Vercel: tu proyecto → **Settings** → **Environment Variables**. Para probar en tu computadora: copia `.env.local.ejemplo` con el nombre `.env.local` (Git no lo sube).

| Variable | Qué poner | ¿Es secreta? |
|---|---|---|
| `NEXT_PUBLIC_DATOS` | `servidor` | No |
| `NEXT_PUBLIC_SUPABASE_URL` | La **Project URL** (Supabase → Configuración del proyecto → Claves API): `https://<tu-proyecto>.supabase.co` | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clave **pública** de esa misma página («anon» o «publishable») | No: el navegador la usa y las reglas de la base la protegen |

- **La clave «service_role» o «secret» NUNCA va aquí, ni en otra variable, ni en un archivo del proyecto.** Si se pega por error en estas variables, la app la rechaza y se queda en modo local.
- Si falta una variable o la dirección no empieza con `https://`, la app se queda en **modo local** y no muestra ningún error. La señal de que el servidor está encendido: la portada dice **«Entrar o crear cuenta»**.
- Las variables `NEXT_PUBLIC_…` quedan escritas dentro de la página **al compilarla**. Después de cambiarlas hay que **publicar otra vez** (en Vercel: Deployments → ⋯ → Redeploy, o el comando de `docs/AVANCE.md`, fila «Dónde publicar»; los nombres del panel pueden cambiar un poco).

### 2. Las migraciones (el SQL), una por una y en orden
Son 15 archivos de `supabase/migrations/`. **Las tres primeras ya se aplicaron** (están juntas en `APLICAR-EN-SUPABASE.sql`, según `supabase/LEEME.md`). Las demás se aplican **aparte, una por una y en este orden**. Nunca se edita una ya aplicada: si algo cambia, se escribe una migración nueva.

| # | Archivo | Qué hace |
|---|---|---|
| 1 | `20261014120000_tablas` | Las tablas |
| 2 | `20261014120100_reglas` | Quién ve qué |
| 3 | `20261014120200_fotos_almacen` | El almacén privado de fotos |
| 4 | `20261014130000_fotos_paso_8` | Que la paseadora cambie su foto de hoy y que la ruta de cada foto sea la de su paseo |
| 5 | `20261014140000_postulaciones_paso_7b` | Las notas internas del equipo, en una tabla aparte |
| 6 | `20261014150000_dni_paso_7b` | Que la paseadora corrija su DNI sin poder volver a leerlo |
| 7 | `20261015100000_videollamada_solo_hora` | La videollamada guarda solo la hora |
| 8 | `20261015110000_borrar_mi_cuenta` | «Borrar mi cuenta» |
| 9 | `20261015120000_resenas` | Reseñas y calificación |
| 10 | `20261015130000_integridad` | Reglas más estrictas: un paseo ya pedido no cambia, un pago pendiente frena otro paseo, el pago guarda quién del equipo lo marcó, y más |
| 11 | `20261016100000_pedidos` | «Pedir paseo»: los pedidos de las familias, las respuestas de los paseadores y cuántos paseadores lo vieron (solo cifras) |
| 12 | `20261016200000_respuestas_escritas` | Las respuestas escritas del examen del paseador: solo las lee el equipo y se borran con la cuenta |
| 13 | `20261016300000_ubicacion_y_sospechas` | La hora oficial y la precisión de las fotos, las fotos «sospechosas» (solo el equipo) y la ubicación del paseo mientras pasea (se borra al entregar) |
| 14 | `20261016400000_usos_ia` | El registro de cada uso de la IA de apoyo (qué persona del equipo y cuándo; no guarda lo que se envió ni lo que respondió) |
| 15 | `20261022100000_permisos_service_role` | Los permisos de la clave de servicio (`service_role`) en las tablas nuevas, y quitarle todo a `anon` en ellas. No cambia lo que ve ninguna persona |

**Cómo aplicar cada una:** Supabase → **SQL Editor** → **New query** → pega el contenido del archivo → **Run**. Espera el «Success» antes de pasar a la siguiente. Si sale un error, **para**: no corras la siguiente y copia el mensaje completo para quien programa. No corras dos veces la misma.

**¿Cuáles faltan?** Pega esto en una consulta nueva y toca **Run**. Solo lee (no cambia nada). Cuando todo está aplicado salen 15 filas con «sí»:

```sql
select orden, migracion, case when aplicada then 'sí' else 'FALTA' end as aplicada
from (values
  (1, '20261014120000_tablas', to_regclass('public.paseos') is not null),
  (2, '20261014120100_reglas', to_regprocedure('privado.es_equipo()') is not null),
  (3, '20261014120200_fotos_almacen', exists (select 1 from storage.buckets where id = 'fotos' and not public) and exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'fotos_almacen_ver')),
  (4, '20261014130000_fotos_paso_8', exists (select 1 from pg_constraint where conname = 'fotos_ruta_coincide')),
  (5, '20261014140000_postulaciones_paso_7b', to_regclass('public.notas_revision') is not null),
  (6, '20261014150000_dni_paso_7b', to_regprocedure('public.guardar_dni(text)') is not null),
  (7, '20261015100000_videollamada_solo_hora', to_regclass('public.postulaciones') is not null and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'postulaciones' and column_name = 'referencias')),
  (8, '20261015110000_borrar_mi_cuenta', to_regprocedure('public.borrar_mi_cuenta()') is not null),
  (9, '20261015120000_resenas', to_regclass('public.resenas') is not null and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'paseadores_publicos' and column_name = 'resenas_n')),
  (10, '20261015130000_integridad', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pagos' and column_name = 'marcado_por')),
  (11, '20261016100000_pedidos', to_regclass('public.pedidos') is not null and to_regprocedure('public.contadores_pedido(text)') is not null),
  (12, '20261016200000_respuestas_escritas', to_regclass('public.respuestas_escritas') is not null and to_regprocedure('public.guardar_respuestas_examen(jsonb)') is not null),
  (13, '20261016300000_ubicacion_y_sospechas', to_regclass('public.ubicacion_en_vivo') is not null and to_regclass('public.fotos_sospechas') is not null),
  (14, '20261016400000_usos_ia', to_regclass('public.usos_ia') is not null),
  (15, '20261022100000_permisos_service_role', case when to_regclass('public.usos_ia') is not null then has_table_privilege('service_role', 'public.usos_ia', 'DELETE') and not has_table_privilege('anon', 'public.usos_ia', 'SELECT') else false end)
) as t(orden, migracion, aplicada)
order by orden;
```

### 3. La cuenta del equipo
Sin una cuenta con el rol «equipo» nadie abre `/admin` ni aprueba paseadores. Se crea a mano, una por persona: los pasos están en `supabase/LEEME.md`, «Crear una cuenta del equipo». La comprobación de quién tiene acceso también está ahí.

### 4. Las direcciones de inicio de sesión
Supabase → **Authentication** → **URL Configuration**:
- **Site URL:** la dirección de la app tal cual, sin nada después (hoy `https://patitas-connect.vercel.app`).
- **Redirect URLs:** esa misma dirección y `<dirección>/acceso/nueva-contrasena`. Para probar en tu computadora, agrega también `http://localhost:3000` y `http://localhost:3000/acceso/nueva-contrasena`.

Si falta alguna, el enlace del correo vuelve a otra parte.

### 5. El correo de confirmación (decisión del equipo)
El correo gratis de Supabase manda **2 por hora en todo el proyecto**, y lo gastan la confirmación de la cuenta y «Olvidé mi contraseña». Alcanza para probar; no alcanza para que varias familias se registren el mismo día. Las dos salidas están en `supabase/LEEME.md`, «Pendiente del equipo: el correo de confirmación». Hasta que se decida, no se rompe nada.

**El plan gratis de Supabase** (según `docs/PLAN-SERVIDOR.md`, sección 6, leído el 13 de octubre de 2026; las cifras pueden cambiar): el proyecto **se pausa tras 1 semana sin actividad** y **no incluye copias de seguridad automáticas**. Que alguien del equipo entre al menos una vez por semana y exporte los datos a mano.

### 6. El borrado de fotos viejas y de archivos de cuentas borradas (a mano)
Las fotos se borran a los 7 días, y los archivos de una cuenta borrada también, **solo si alguien corre el script**. Si nadie lo corre, **no se borran**. Se hace desde la carpeta del proyecto, en la terminal, con Node:

```
SUPABASE_URL=https://<tu-proyecto>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<clave de servicio> node supabase/scripts/borrar_fotos_vencidas.mjs
```

- **Sin `--hacerlo` el script solo muestra** lo que borraría. Córrelo así la primera vez y revisa la lista. Para borrar de verdad, agrega `--hacerlo` al final.
- La clave de servicio («service_role» o «secret», en Claves API) **se salta todas las reglas**. Se escribe **solo ahí, en la terminal**: no va en un archivo, ni en Vercel, ni en un chat.
- Esa llamada al almacén real **no se pudo probar** (ver abajo). Por eso, la primera vez, sin `--hacerlo`.

### 7. Antes de publicar: las comprobaciones
En tu computadora, desde la carpeta del proyecto (la base de pruebas se instala una sola vez con `npm i --no-save @electric-sql/pglite@0.2.17`):

```
npm run typecheck
npm run test
node supabase/tests/probar_en_pglite.cjs
npm run lint
npm run test:humo
```

Todas deben pasar; el lint no debe subir de 20 problemas. Para ver las páginas **compiladas en modo servidor** sin tocar el Supabase real: `node supabase/tests/servidor_simulado.mjs` en una terminal y, en otra, `NEXT_PUBLIC_DATOS=servidor NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=clave-inventada npm run test:humo`.

### 8. La primera prueba con dos celulares
La hace una persona del equipo con cuentas de prueba (no con familias reales):
1. **Familia:** crea la cuenta, confirma el correo y completa «Cuéntanos de ti» (casa y perro).
2. **Paseador** (otro celular): crea la cuenta y envía su postulación.
3. **Equipo** (`/admin`, con su cuenta): abre la postulación, marca las **cinco casillas** y aprueba. El paseador aparece solo en «Explorar» de la familia.
4. **Familia:** pide un paseo. **Paseador:** acepta, sale, toma una foto de control, escribe en el chat y entrega al perro.
5. **Familia:** toca «Recibí a [perro]» y ve «Paga a Patitas». **Paseador:** «Vi el pago». **Equipo:** «Pagado al paseador». (En una prueba no se mueve dinero.)
6. **Familia:** deja su reseña. Otra familia ve la calificación en la tarjeta del paseador.
7. **Reporte:** abre uno con «Hubo un problema» y resuélvelo en `/admin`.
8. **Borrar mi cuenta:** debe negarse si hay un pago pendiente o un reporte abierto; si no, la borra.

### 9. Volver al modo local
Borra `NEXT_PUBLIC_DATOS` (o déjala vacía) en Vercel y publica otra vez. No se borra nada de la base: la app vuelve a guardar todo en cada teléfono. La demostración y el paseador de ejemplo nunca pasan por el servidor.

### 10. Lo que no se pudo probar contra el Supabase real
Todo se probó con servidores simulados y la base de pruebas (PGlite), sin red y sin claves. Falta probar con el proyecto real:
- Que cada migración se aplique sin errores en el panel (en la base de pruebas sí).
- El inicio de sesión de verdad, los correos (2 por hora), CORS, los tiempos con datos móviles y el sondeo con dos celulares (batería, pestaña en segundo plano, Safari de iPhone).
- El almacén real: subir y ver fotos, y el script de borrado con `--hacerlo`.
- «Borrar mi cuenta» borra de verdad la cuenta de acceso (la base de pruebas lo imita). Si el almacén real no dejara borrar a quien es dueño de un archivo, la función se deshace entera y la persona ve un aviso.
- GPS y cámara reales (ver el final de este documento).

## Avisos con la app cerrada (Bloque 3: qué hace falta y dónde se enchufa)

**Hoy:** la app avisa (sonido corto, vibración y una insignia con el número) **solo mientras está abierta**. Pregunta por pedidos y ofertas nuevos cada `segundosEntreConsultas` segundos (`lib/config.ts`; hoy 5). **Con el navegador cerrado, todavía no hay aviso.** Eso es lo que dice la app y lo que hay que decirle al equipo y a las familias del piloto. En un iPhone el sonido y la vibración pueden no funcionar aunque la app esté abierta (Safari no deja vibrar); la insignia siempre se ve.

**Lo que haría falta para avisar con la app cerrada** (no está hecho; hay dos caminos):
1. **Web Push** (gratis, con claves propias): (a) generar un par de claves VAPID **una vez** (`npx web-push generate-vapid-keys`); la clave pública va en una variable `NEXT_PUBLIC_…` y la **privada solo en los secretos de Supabase** (nunca en el código ni en el chat); (b) un *service worker* en `public/` que muestre la notificación; (c) una tabla nueva, en una migración nueva, con la suscripción de cada persona (solo ella la lee); (d) una Edge Function de Supabase que, cuando se crea un pedido o una oferta, mande el aviso a quien corresponde. En iPhone solo funciona si la persona agrega la app a su pantalla de inicio.
2. **App nativa** (Android o iPhone): avisos del sistema, pero exige cuenta de tienda y revisión; es una decisión del equipo.

**Dónde se enchufa en el código:** `lib/avisos.ts` decide si toca avisar (`debeAvisar`, `idsNuevos`), `lib/avisosSonido.ts` hace el sonido y la vibración, y el hook `useAvisoDeNuevos` (`lib/datos/index.ts`) los junta cuando llega un id nuevo. Un aviso con la app cerrada se agregaría como una función más junto a `sonar()` y `vibrar()`, y la decisión de mandarlo viviría en el servidor (paso (d)), no en el teléfono.

## IA de apoyo en /admin (Bloque 7): paso a paso

**Qué es.** Un botón «Resumen de apoyo con IA» en la pantalla del equipo (`/admin`), junto a las respuestas escritas del examen. Resume en 5 líneas lo que dijo la persona, señala cosas para revisar y sugiere preguntas para la videollamada. **Nunca dice «apto» ni «no apto» y no decide:** siempre aparece «Ayuda para el equipo. Decide una persona.» Antes de enviar se quitan el nombre, el DNI, el teléfono y el correo. Cada uso queda registrado (quién del equipo y cuándo).

**Está APAGADA por defecto** (`iaApoyoActivada: false` en `lib/config.ts`). Si alguien aprieta el botón apagada, la app dice que está apagada. Si está encendida pero falta la clave, dice «Falta poner la clave de la IA».

**La clave NUNCA va en el código, en el navegador ni en el chat.** La pone la persona dueña de la cuenta de la IA, **solo en los secretos de Supabase**. Pasos:

1. **Aplica la migración 14** (`20261016400000_usos_ia`) como las demás (sección 2).
2. **Consigue una clave** en la cuenta de la IA (hoy la función está escrita para Anthropic: `https://console.anthropic.com` → API keys). Tiene costo por uso; pon un límite de gasto en esa cuenta. No la pegues en ningún chat ni archivo del proyecto.
3. **Pon la clave como secreto de Supabase.** Opción A (en la web): Supabase → **Edge Functions** → **Secrets** (o *Project Settings → Edge Functions → Secrets*) → **Add new secret** → nombre `IA_CLAVE`, valor: la clave → Save. Opción B (con la CLI de Supabase en tu computadora): `supabase secrets set IA_CLAVE=<la clave>`. Opcional: otro secreto `IA_MODELO` con el nombre del modelo (por defecto, uno económico).
4. **Sube la función** `resumen-ia` (está en `supabase/functions/resumen-ia/`): con la CLI, `supabase functions deploy resumen-ia`; o en la web, Edge Functions → **Deploy a new function** y pega el contenido de `index.ts` y de `_shared/resumen.ts`. Supabase le da solo la dirección del proyecto y la clave pública a la función (no hay que ponerlas).
5. **Aviso de privacidad:** el borrador para el paseador está en `docs/AVISO-IA-PASEADOR-BORRADOR.md` y está **PENDIENTE de revisión con la abogada (paso 10)**. Hasta que la revise **no se enciende**: pon `iaAvisoRevisado: true` en `lib/config.ts` solo cuando ella lo apruebe (una prueba impide encender la IA sin eso).
6. **Enciende:** en `lib/config.ts`, `iaApoyoActivada: true`, y vuelve a publicar la app.
7. **Prueba:** entra a `/admin` con una cuenta del equipo, abre una postulación con respuestas escritas y aprieta el botón. Revisa que salga el texto «Ayuda para el equipo. Decide una persona.»

**Para apagarla de nuevo:** `iaApoyoActivada: false` y vuelve a publicar. Para quitar la clave: borra el secreto `IA_CLAVE` en Supabase.

**Lo que no se probó:** la llamada real a la IA (no hay clave ni red aquí). Lo que sí se probó, con mentiras de red: que solo el equipo puede usarla, que sin clave avisa, que el uso se registra antes de llamar, que se quitan los datos personales y que se descarta cualquier línea con un veredicto.

**Video (no se construye).** Subir videos de los paseos o de las postulaciones **no se hizo a propósito:** el almacenamiento del plan gratis de Supabase es chico, el almacén de fotos tiene un límite de **1 MB por archivo** (`file_size_limit`) y un video lo pasa de lejos. La idea para la app nativa: grabar y comprimir en el teléfono, subir solo clips cortos (10 a 15 segundos) y borrarlos a los pocos días, como las fotos.

## Cómo se verificó lo de abajo
- Leí las páginas oficiales de cada servicio (las del final) el 10 y el 11 de octubre de 2026. Un resumen automático leyó las páginas; **las cifras pueden cambiar** y hay que volver a mirarlas el día que se publique.
- Lo que no pude comprobar dice **«No lo sé»**. No lo completé con memoria.

## Qué hay que saber de esta app antes de elegir
- Es Next.js 16. La compilación marca la ruta `/afiche` como «dinámica» (la genera el servidor al pedirla; el resto es estático). Un sitio **puramente estático** no la incluiría tal cual: habría que cambiar código o quedarse sin `/afiche`. **No lo probé.**
- **En modo local no hay servidor ni base de datos** (así está publicada hoy). Todo lo que la app guarda está en el navegador de cada persona (`localStorage`). Publicarla no crea ninguno. Por eso **el dueño y el paseador solo se ven entre sí en el mismo navegador** y **el `/admin` de una persona solo ve lo guardado en su propio navegador**. Con `NEXT_PUBLIC_DATOS=servidor` (ver «Encender el servidor», arriba) la app usa Supabase y eso cambia.
- **Una dirección pública la abre cualquiera**, incluido `/admin`, que en modo local no tiene contraseña (lo dice en pantalla). Con servidor, `/admin` pide sesión y el rol «equipo» que lee de la base.
- **Los datos de cobro del equipo (Yape, Plin, cuenta, titular y QR de `lib/config.ts`) van dentro del código publicado.** Cualquiera que abra la app los ve, igual que las familias. No son un secreto: **no pongas ahí nada que el equipo no quiera que sea público.** Hoy están vacíos y la app dice «Falta configurar el medio de cobro».
- No verifiqué si el repositorio de Git ya está subido a un servicio (GitHub u otro). Hoy es una carpeta local.

## Revisión de claves y secretos (11 de octubre de 2026)
Lo que se comprobó en el código de este proyecto:
- **`npm run build` pasa.**
- **No hay archivos `.env` ni claves.** `.gitignore` excluye `.env*` y ningún `.env` está en Git.
- **No hay claves, tokens ni contraseñas en el código** (se buscaron `api key`, `secret`, `password`, `token`, claves privadas, `sk_live`, `ghp_`, `AKIA`, etc.). Las variables de entorno que se leen son `PUERTO`, `SALIDA` y `CAPTURAS` (un script de pruebas local) y, desde el servidor (15 de octubre), `NEXT_PUBLIC_DATOS`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas, sin valores en el repositorio). El script de borrado de fotos lee `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` **solo de la terminal**.
- No hay contraseña de `/admin` en el código a propósito: una contraseña comprobada en el navegador no protege nada.
- **Lo que no se puede comprobar así:** que el equipo no pegue un número o un enlace privado en `lib/config.ts` antes de publicar. Revísenlo.

## Opción A · Cloudflare (Pages o Workers)

**Qué se necesita:** una cuenta de Cloudflare (gratis) y el proyecto en un servicio de Git que Cloudflare pueda leer. *No lo verifiqué paso a paso: la guía oficial de Cloudflare para Next.js lo detalla.*

**Lo que sí encontré:**
- Cloudflare **recomienda Workers** (no Pages) para aplicaciones Next.js completas. Pages se menciona para un **sitio estático** exportado. La página no dice que Pages esté en desuso.
- Límites del plan gratis de Pages: **500 compilaciones al mes**, **1 compilación a la vez**, **20.000 archivos por sitio**, **25 MiB por archivo** y **100 proyectos por cuenta**.

**Pasos (a confirmar con la guía oficial el día de publicar):**
1. Crear la cuenta de Cloudflare y entrar al panel.
2. Subir el proyecto a un servicio de Git (si no está).
3. Seguir la guía de Next.js de Cloudflare, que depende de si se publica estático o completo (ver arriba).
4. Esperar la compilación y abrir la dirección HTTPS que entrega.
5. Probar en un celular (ver abajo).

**No lo sé:** cuánto tráfico incluye el plan gratis, si Next.js 16 con todas sus funciones corre bien ahí, qué pasa con `/afiche`, **si se permite uso comercial**, y si pedirán tarjeta al crear la cuenta.

## Opción B · Netlify

**Qué se necesita:** una cuenta de Netlify (gratis) y el proyecto en un servicio de Git. *No lo verifiqué paso a paso.*

**Lo que sí encontré:**
- Netlify dice que soporta Next.js con el «App Router» y el renderizado en servidor «sin configuración», con un adaptador abierto (OpenNext) para Next.js 13.5 o superior. **La página no nombra Next.js 16**: dice que cubre las versiones estables nuevas.
- Plan gratis: la página de precios habla de **«300 créditos»**; el ancho de banda gasta **20 créditos por GB** y cada publicación a producción **15 créditos**.

**Pasos (a confirmar con la guía oficial el día de publicar):**
1. Crear la cuenta de Netlify.
2. Subir el proyecto a un servicio de Git (si no está).
3. En Netlify, «importar un proyecto» desde ese repositorio. Netlify detecta Next.js solo, según su guía.
4. Esperar la compilación y abrir la dirección HTTPS que entrega.
5. Probar en un celular (ver abajo).

**No lo sé:** cuántos minutos de compilación dan los 300 créditos, qué pasa cuando se acaban, si Next.js 16 funciona sin problemas, **si se permite uso comercial**, y si piden tarjeta.

## Comparación rápida

| | Cloudflare | Netlify |
|---|---|---|
| Para Next.js completo | Recomiendan Workers (Pages es para estático) | Dicen que sí, sin configuración (adaptador OpenNext) |
| Límites que leí | 500 compilaciones/mes, 20.000 archivos, 25 MiB por archivo | 300 créditos (tráfico y publicaciones los gastan) |
| Next.js 16 confirmado | No lo sé | No nombrado en la página |
| **Uso comercial** | **No lo sé: el equipo debe confirmarlo** | **No lo sé: el equipo debe confirmarlo** |
| Compartir solo con amigos | Con «Access» (ver abajo) | Con protección con contraseña (plan: no lo sé) |

## Cómo compartir un enlace solo con amigos
Lo primero, sin vueltas: **una dirección web pública no es secreta.** Quien tenga el enlace puede abrirlo, y si alguien lo reenvía, llega a más gente. Para el piloto, eso puede alcanzar si solo se lo pasan a las 3 a 5 familias y a los amigos. Si quieren algo más fuerte:

1. **Pasar el enlace solo a quien corresponde** (por WhatsApp, no en redes ni en el afiche). Es lo más simple y **no es una protección**: no verifiqué si un buscador podría encontrarlo.
2. **Cloudflare Access** (opción A). Lo que leí en la documentación de Cloudflare:
   - Las direcciones de las publicaciones de prueba son **públicas por defecto**.
   - «Enable access policy» (Ajustes → General) las restringe a tu cuenta de Cloudflare y a quienes agregues, pero «solo protege las publicaciones de prueba»: **no** la dirección principal `*.pages.dev` ni un dominio propio.
   - Para proteger también la dirección principal hay que seguir los pasos de la página «Known issues» de Pages (se hace en Zero Trust).
   - En un anuncio de Cloudflare de 2020, el plan gratis de Zero Trust cubría **hasta 50 usuarios sin costo**. **Puede haber cambiado: confirmarlo.**
3. **Netlify, protección con contraseña** (opción B). La documentación dice que puede proteger todo el sitio o solo las publicaciones de prueba, con una contraseña o con el inicio de sesión del equipo de Netlify. **No sé qué plan la incluye:** lo vi en fuentes que se contradicen. Se confirma en el panel (Project configuration → General → Visitor access).

Sea cual sea la opción: **cada persona ve su propio navegador**, no el de otra. «Compartir el enlace» sirve para que prueben la app, no para que vean los pagos o reservas de otras familias (eso necesita un servidor).

## Cómo probar después, en un celular real
Abre la dirección HTTPS en el celular (Chrome en Android o Safari en iPhone). Mira siempre que el candado se vea y que la dirección empiece con `https://`.

El seguimiento del paseo es **por puntos de control con foto**: la ubicación se guarda al empezar, al terminar y en cada foto. No es continuo.

1. **Ubicación (como paseador):**
   - Entra a `/paseador` → «Entrar como paseador de demostración» y lleva un paseo hasta «Paseando».
   - Sale «Tu ubicación durante el paseo»: toca **«Permitir ubicación»** y acepta en el navegador. Es el punto de **inicio**.
   - Prueba también **negar** el permiso y «Ahora no»: el paseo debe seguir y los puntos dicen «Sin ubicación».
2. **Cámara y puntos de control:**
   - En «Hoy», durante el paseo, toca **«Tomar foto»** y acepta el permiso.
   - Comprueba que la foto sale con el **código de 2 dígitos** estampado, con su hora y su lugar, y que en la app del dueño (pestaña «Paseo») aparece como un punto de control.
   - **Espera 10 minutos sin foto** con la pantalla encendida: la tarjeta debe decir «Toca una foto de control». El recordatorio solo se ve con la pantalla encendida.
   - Al «Entregué a…», se guarda el punto de **fin**.
   - Niega el permiso de cámara en otra prueba: debe decir «Sin cámara: no diste el permiso.» y el paseo sigue.
3. **Pantalla apagada:**
   - Los avisos de zona **solo ayudan con la pantalla encendida**. Apaga la pantalla un minuto y vuelve: durante ese rato no hubo avisos, pero los puntos de control (foto y fin) siguen funcionando. La app **ya no pide** mantener la pantalla encendida.
4. **Pago (al final del paseo):**
   - La reserva **no** pide pago: dice «Pagas al terminar el paseo.» y el paseador puede salir sin esperar nada.
   - Al tocar «Recibí a [perro]» aparece «Paga a Patitas»: monto, QR o números del equipo y el nombre de la cuenta. Sin configurar, dice «Falta configurar el medio de cobro.»
   - Como paseador, en «Cobro del paseo» compara el monto y el nombre y toca «Vi el pago». Después, en `/admin` (en el mismo navegador): «Por pagar al paseador» → «Pagado al paseador», o «No lo encuentro» con una nota.
5. **SOS:** «Llamar» abre el marcador con el número y «WhatsApp» abre el chat con el mensaje escrito. Con los contactos vacíos debe decir «Falta configurar».
6. **Dos celulares:** en modo local, dueño y paseador **no se ven entre celulares**; solo funcionan en el mismo navegador. No lo busques como falla. Con servidor sí se ven: sigue «La primera prueba con dos celulares» (arriba).

Anota qué teléfono y navegador usaste y qué no funcionó; eso es lo que hoy **no se ha podido probar**: GPS y cámara reales, Safari de iPhone, y que el recordatorio se vea en un teléfono de verdad.

## Fuentes (leídas el 10 y el 11 de octubre de 2026)
- Límites de Cloudflare Pages: <https://developers.cloudflare.com/pages/platform/limits/>
- Next.js en Cloudflare: <https://developers.cloudflare.com/pages/framework-guides/nextjs/>
- Publicaciones de prueba y «access policy» de Cloudflare Pages: <https://developers.cloudflare.com/pages/configuration/preview-deployments/>
- Problemas conocidos de Pages (proteger `*.pages.dev`): <https://developers.cloudflare.com/pages/platform/known-issues/>
- Plan gratis de Cloudflare for Teams, 50 usuarios (anuncio de 2020): <https://blog.cloudflare.com/teams-plans>
- Precios de Netlify: <https://www.netlify.com/pricing/>
- Next.js en Netlify: <https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/>
- Protección con contraseña de Netlify: <https://docs.netlify.com/visitor-access/password-protection/>
