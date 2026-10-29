# Plan del servidor (Tarea 13): solo un plan, sin código

**Qué es este documento:** un plan para que la familia y el paseador vean lo mismo en sus celulares, para que `/admin` tenga inicio de sesión del equipo y para que todo siga siendo **gratis** durante el piloto (3 a 5 familias). **No se programó nada, no se creó ninguna cuenta y no se publicó nada.** Espera el OK del equipo.

**Cómo se verificó:** leí las páginas oficiales de Supabase y de Firebase el 13 de octubre de 2026 (al final están los enlaces). **Las cifras cambian**: hay que volver a mirarlas el día que se cree la cuenta. Lo que no pude comprobar dice **«No lo sé»**; no lo completé con memoria.

## La recomendación, en 5 líneas
1. **Supabase.** Su plan gratis incluye base de datos, inicio de sesión, **almacenamiento de fotos** y avisos entre celulares, y alcanza de sobra para 3 a 5 familias.
2. **Firebase** también sirve para el texto, pero las **fotos** (Cloud Storage) piden pasar al plan «Blaze», que exige un **medio de pago**. Eso rompe el presupuesto cero.
3. El proyecto ya tiene la puerta preparada (`lib/datos/`): el servidor entra como **otro adaptador** y las pantallas casi no cambian. Las demostraciones siguen en `localStorage`.
4. **Lo delicado no es el código, es la privacidad:** al subir fotos, ubicaciones y celulares a un servidor, hay que cambiar los textos legales y **consultar al abogado antes de usar datos de familias reales**.
5. **Riesgos reales del plan gratis:** el proyecto **se pausa tras 1 semana sin actividad**, **no hay copias de seguridad automáticas** y el correo que viene incluido manda solo **2 correos por hora**.

## 1. Qué incluye el plan gratis y hasta cuándo alcanza

| | **Supabase (Free)** | **Firebase (Spark)** |
|---|---|---|
| ¿Pide medio de pago? | La página muestra «$0/month». **No lo vi escrito explícitamente: No lo sé**, se confirma al crear la cuenta. | «No payment method needed» (lo dice la página). |
| Usuarios con inicio de sesión | **50.000** activos al mes | **50.000** al mes (Authentication) |
| Base de datos | **500 MB** por proyecto | Firestore: **1 GiB**, **50.000 lecturas y 20.000 escrituras por día** |
| Fotos | **1 GB**; foto de hasta 50 MB | **Cloud Storage: «no aplica» en Spark** (hay que pasar a Blaze, con medio de pago). *Otra página de Firebase habla de una cuota en Spark: se contradicen. No lo sé.* |
| Avisos entre celulares | Realtime: **200 conexiones a la vez, 2 millones de mensajes al mes** | Firestore en tiempo real. **No lo sé** cómo cuenta contra las 50.000 lecturas por día |
| Funciones en el servidor | 500.000 llamadas al mes | **No disponible en Spark** (Blaze) |
| Qué pasa si no lo usas | **Se pausa tras 1 semana sin actividad** | No lo vi como regla |
| Copias de seguridad | **No incluidas** en el plan gratis | No lo sé |
| Soporte | Solo la comunidad | No lo sé |

**¿Alcanza para el piloto?** Con números de la propia app (`lib/config.ts`): cada paseo guarda hasta **12 fotos de unos 160 KB como máximo** (≈ **2 MB por paseo**). 1 GB alcanza para **unos 500 paseos con el máximo de fotos**. Un piloto de 5 familias, 3 paseos por semana, 12 semanas son ≈ 180 paseos (≈ 350 MB como máximo). **Sobra.** La base de datos (texto) usará una fracción de los 500 MB. El tráfico (5 GB al mes) también alcanza: ver las 12 fotos de un paseo pesa ≈ 2 MB.

**Hasta cuándo:** mientras sean pocas familias y el equipo entre al menos una vez por semana (por la pausa). **No lo sé** cuánto tráfico real tendrá el piloto: lo mide el panel de Supabase.

## 2. Cómo encaja con `lib/datos/` (la puerta a los datos)

**La idea:** hoy todas las pantallas piden los datos por esta puerta (`usePaseoActivo`, `useChat`, `usePagos`, …) y la puerta guarda en el navegador. Con servidor, la puerta guarda en Supabase. **Las pantallas no se enteran.**

**Un detalle importante:** la puerta de hoy (`Adaptador`) lee y guarda **al instante** (es el navegador). Un servidor responde **después**. Por eso el adaptador nuevo trabaja así: guarda una copia en memoria, la pantalla lee de ahí, y en segundo plano sube los cambios y baja los de los demás. Para las pantallas se ve igual.

| Cambia | No cambia |
|---|---|
| `lib/datos/index.ts` (elige el adaptador con una variable de entorno) | `lib/paseo.ts`, `lib/pagos.ts`, `lib/casos.ts`, `lib/zona.ts`, `lib/puntosControl.ts` (las reglas) |
| `lib/datos/adaptador.ts` (la interfaz crece: avisar si ya se guardó) | `lib/config.ts` y todos los textos |
| **Nuevos:** `lib/datos/adaptadorSupabase.ts`, `lib/datos/almacenFotosSupabase.ts`, `lib/servidor/` (conexión y sesión) | Casi todos los componentes (usan los hooks) |
| `lib/datos/fotos.ts` (otra «bodega» de fotos; ya existe la interfaz `AlmacenFotos`) | Las 592 pruebas actuales (siguen sirviendo de red) |
| Pantallas de entrada: `Onboarding`, `WalkerApp`, `/admin` (iniciar sesión) | El modo demostración |
| **Nueva carpeta** `supabase/` con las tablas y las reglas de acceso (archivos SQL) | |
| `lib/legal.ts` y textos de privacidad | |

**Volver a localStorage para las demostraciones:** una variable `NEXT_PUBLIC_DATOS` (`local` o `servidor`). Sin variable, o con la cuenta de demostración / paseador de demostración, **se usa siempre `adaptadorLocal`** y nada sale del teléfono. Aviso: en Vercel las variables `NEXT_PUBLIC_` se fijan al publicar; cambiarlas obliga a volver a publicar.

**Lo que sí cambia de forma (la parte mediana):** hoy hay **un solo paseo activo** por navegador (`patitas:bus:job`). En el servidor hay **muchos paseos**, cada uno con su familia y su paseador. Hay que pasar de «la clave del navegador» a «las filas que me corresponden». Es el cambio más grande de `lib/datos/`.

## 3. Cuentas e inicio de sesión

| Quién | Cómo entra | Qué ve |
|---|---|---|
| **Familia** | Correo y contraseña (Supabase Authentication) | Solo sus perros, sus paseos, sus fotos y sus pagos |
| **Paseador** | Correo y contraseña | Solo sus paseos y su propio Yape o Plin. Nunca el celular de la familia |
| **Equipo** | Correo y contraseña, **cuentas creadas a mano** por el equipo (nadie se registra solo como equipo) | Todo `/admin` |
| **Demostración** | Sin cuenta, como hoy | Solo datos del teléfono |

**Cómo se protege `/admin` (importante):** una contraseña comprobada en el navegador **no protege nada** (ya lo dice `docs/AVANCE.md`). Aquí la protección está en el **servidor**: las tablas tienen **reglas de acceso por fila** («RLS») y solo una cuenta marcada como equipo puede leer los pagos, los casos y las postulaciones de todos. Aunque alguien abra la dirección `/admin`, el servidor **no le entrega nada**. Además conviene activar la verificación en dos pasos para las 3 cuentas del equipo (la página de límites de Supabase menciona que existe; **no verifiqué si el plan gratis la incluye**). **Actualizado el 13 de octubre de 2026:** la página de precios de Supabase marca «Basic Multi-Factor Auth» como incluida en el plan gratis y «Advanced MFA – Phone» como **no incluida** (complemento de pago). La página no dice qué método es el «básico»; la guía de MFA nombra la app autenticadora y el mensaje al teléfono, así que lo más probable es que el básico sea la app, pero **no lo sé** con certeza. La app todavía no tiene esa pantalla (no se hizo en el paso 5).

**El problema del correo (costo escondido):** el correo que trae Supabase incluido permite **2 correos por hora** en todo el proyecto. Con eso, «olvidé mi contraseña» o «confirmar correo» **se traba** con 3 familias entrando el mismo día. Para usarlo de verdad hay que configurar un servicio de correo propio (SMTP) **o** que el equipo cree las cuentas a mano. **No lo sé** qué servicio de correo gratis conviene: hay que revisarlo. El inicio de sesión por SMS necesita un proveedor de mensajes: en Firebase se cobra por SMS (lo dice su página); en Supabase **no lo verifiqué**. Para el piloto, correo y contraseña.

## 4. Fotos, chat y avisos: cómo viajan y qué cambia en privacidad

| Cosa | Hoy | Con servidor |
|---|---|---|
| **Fotos** (≤ 160 KB, 800 px) | Bytes en IndexedDB del teléfono del paseador; solo ahí | Se suben a un **almacén privado** (Storage). La familia las ve con **enlaces que vencen**; la foto no tiene dirección pública |
| **Datos de cada foto** (hora, lugar, código de 2 dígitos) | En el teléfono | Fila en la base: la ve la familia del paseo, el paseador y el equipo |
| **Chat** | `localStorage` (mismo navegador) | Mensajes en la base; llegan por **Realtime** |
| **Estados del paseo y avisos de zona** | `localStorage` | Filas con el estado; Realtime avisa al otro celular |
| **Puntos de control y ubicación** | Quedan en el teléfono | Al guardar un punto (inicio, foto, fin) **la ubicación sube al servidor** |
| **Paseador «conectado»** | Latido en `localStorage` | Hora de «última vez visto» en una fila |

**Qué cambia en la privacidad (esto es lo que hay que decidir con cuidado):**
- Hoy los términos dicen que **los datos se guardan solo en el teléfono**. Con servidor **ya no es verdad** y hay que cambiar `lib/legal.ts`, «Ver más» de privacidad y lo que diga «se queda en tu teléfono».
- **Las fotos con hora y lugar y las ubicaciones pasan a estar en un servidor de un tercero.** Las ve el equipo en `/admin`. Hay que decidir **cuánto tiempo se guardan** y cómo se borran.
- El **DNI y la fecha de nacimiento del paseador** están hoy en su teléfono. La skill pide no guardar el DNI digital. **Recomendación:** no subirlos al servidor en el piloto.
- La **casa del dueño** (coordenadas) hoy no sale del teléfono. El paseador necesita la dirección solo **después de aceptar**: se mostraría solo a él, por regla de acceso.
- Los datos personales en un servidor **piden consultar a un abogado** (queda en «Pendientes del equipo»). No lo resuelve este plan.

**Lo que este plan NO incluye:** avisos con la app cerrada. Hoy el paseador se entera de una solicitud nueva si tiene la app abierta. Las notificaciones al celular (push) son otro trabajo y **no verifiqué** cómo quedarían en el plan gratis. Mientras tanto, el aviso por WhatsApp (enlace `wa.me`) sigue a mano.

## 5. Los pagos siguen a mano: qué se guarda en el servidor

**La app sigue sin mover dinero.** Lo que viaja al servidor es el **registro**: el libro de pagos de `lib/pagos.ts` (monto, comisión, neto, estado, hora en que el paseador tocó «Vi el pago», hora anotada y nota del equipo).
- Lo ve la familia del paseo, el paseador de ese paseo y el equipo. **Nadie más.**
- Las acciones («Vi el pago», «Pagado al paseador», «No lo encuentro») las valida el servidor con las **mismas reglas** que hoy (la tabla de transiciones de `lib/pagos.ts`): el paseador no puede marcarse «pagado» a sí mismo, solo el equipo.
- **El Yape o Plin del paseador** sube al servidor para que el equipo le pague. Es un dato delicado: lo ve solo él y el equipo (nunca la familia). **Decisión del equipo.**
- Los datos de cobro **del equipo** (`cobroEquipo`: titular, Yape, Plin, cuenta, QR) siguen en `lib/config.ts`: son públicos a propósito (la familia tiene que verlos).
- Ya existe el pago pendiente que bloquea reservar otro paseo: con servidor se vuelve **verdadero entre celulares** (hoy solo vale en el mismo navegador).

## 6. Riesgos y costos escondidos, y cuando se acaba el plan gratis

| Riesgo | Qué pasa | Qué hacer |
|---|---|---|
| **Pausa por inactividad** | El proyecto se pausa tras 1 semana sin actividad; hay que «reanudarlo» a mano. Supabase manda un aviso por correo. **No sé con certeza** cuánto tiempo se puede reanudar (encontré 90 días y 1 año en páginas distintas) | Entrar a la app al menos una vez por semana; poner un recordatorio |
| **Sin copias de seguridad** | Si se borra algo, no hay vuelta atrás | Exportar los datos a mano cada semana. **No lo sé** cuál es la forma más simple en el panel; hay que probarla en el paso 1 |
| **Correo: 2 por hora** | «Olvidé mi contraseña» se traba | Servicio de correo propio, o crear cuentas a mano |
| **Pasarse del plan gratis** | **No pude confirmarlo en la página oficial** (fuentes de terceros dicen que el servicio se restringe, no que cobren) | Ver el panel de uso cada semana |
| **Uso comercial** | La página de precios **no pone límite de uso comercial**; **no leí los términos completos** | Leerlos antes de cobrar |
| **Dos servicios gratis** | Vercel Hobby es **solo no comercial** (ya anotado) y Supabase gratis no tiene soporte | Antes de cobrar a familias reales, cambiar los dos de plan o de servicio |
| **Reglas de acceso mal hechas** | Un error podría mostrar datos a quien no corresponde | Pruebas automáticas de «quién ve qué» (paso 3) y un piloto con 1 familia primero |

**Cuando se acaba el plan gratis:** el plan de pago de Supabase empieza en **US$ 25 al mes** (8 GB de base, 100 GB de fotos, 250 GB de tráfico, copias diarias por 7 días, sin pausa; el tope de gasto viene activado). Firebase pasa a «pago por uso» con un medio de pago y **sin tope automático** (los avisos de presupuesto no limitan el gasto). **No verifiqué** cómo es el cambio de plan paso a paso. **Cambiar de servicio costaría trabajo** (un adaptador nuevo y pasar los datos), no un rediseño.

## 7. Pasos en orden (cada uno pequeño y probable por separado)

Tamaño: **chico** = una sesión corta; **mediano** = 2 o 3 sesiones; **grande** = varias.

| # | Paso | Tamaño | Cómo se prueba |
|---|---|---|---|
| 0 | Decisiones y cuentas del equipo (sección 8) | chico | El equipo responde las preguntas |
| 1 | Crear el proyecto de Supabase **vacío**, anotar dónde van las claves y probar un respaldo manual | chico | Se ve el panel; el respaldo se descarga |
| 2 | **HECHO el 13 de octubre de 2026** ([detalle](HISTORIAL.md#t13-paso2)). Preparar `lib/datos/`: adaptador con copia en memoria y subida en segundo plano, y selector `local` / `servidor`. Todavía **sin servidor** | mediano | Las pruebas siguen pasando (ahora 631); la app no cambia |
| 3 | **ESCRITO el 14 de octubre de 2026, sin aplicar** ([detalle](HISTORIAL.md#t13-paso3)). Tablas y **reglas de acceso** («quién ve qué») en `supabase/`, con pruebas automáticas | grande | Pruebas: la familia A no ve lo de la familia B; el paseador no ve el celular; solo el equipo ve todo |
| 4 | **HECHO el 14 de octubre de 2026** ([detalle](HISTORIAL.md#t13-paso4)); **corregido el 13 de octubre de 2026: la app principal lee la sesión y hay un solo camino de entrada** ([detalle](HISTORIAL.md#t13-paso4b)). Inicio de sesión de familia y paseador (la demostración sigue local) | mediano | Crear cuenta, entrar, salir, recuperar contraseña |
| 5 | **HECHO el 13 de octubre de 2026** ([detalle](HISTORIAL.md#t13-paso5)). `/admin` con inicio de sesión del equipo y cuentas creadas a mano (pasos en [`supabase/LEEME.md`](../supabase/LEEME.md#cuentas-del-equipo-y-admin-paso-5)) | chico | Sin sesión, `/admin` no muestra nada |
| 6 | Paseo, estados, avisos de zona, chat y «conectado» entre dos celulares. **Se parte en dos:** **6a HECHO el 13 de octubre de 2026** ([detalle](HISTORIAL.md#t13-paso6a)): paseos, estados, bitácora, lista de paseadores aprobados y código de recojo en el servidor, probado con dos cuentas simuladas (**sin probar contra el Supabase real**). **6b HECHO el 14 de octubre de 2026** ([detalle](HISTORIAL.md#t13-paso6b)): chat en `mensajes` (sondeo, sin duplicar al reintentar), «Activo hace…» en lugar de «Conectado» y avisos de zona hasta la familia por `paseo_eventos`, sin subir ubicaciones; **sin probar contra el Supabase real** | grande | Dos celulares reales: uno pide, el otro acepta |
| 7 | **HECHO el 14 de octubre de 2026** ([detalle](HISTORIAL.md#t13-paso7)). Pagos: libro de pagos en el servidor con las acciones validadas por `mover_pago`, dónde cobra el paseador en `cobros_paseador` y `/admin` «Por pagar» leído de la base. Sin migración nueva; **sin probar contra el Supabase real** | mediano | Pruebas de la tabla de transiciones contra el servidor |
| 8 | **HECHO el 14 de octubre de 2026** ([detalle](HISTORIAL.md#t13-paso8)). Fotos del paseo y foto de hoy en el almacén privado con enlaces que vencen, datos en la tabla `fotos`, cola sin internet sin duplicar. **Hay una migración nueva, sin aplicar** (`20261014130000_fotos_paso_8.sql`); **sin probar contra el Supabase real** | mediano | La foto del paseador llega al celular de la familia; sin sesión no se ve |
| 9 | **HECHO el 14 de octubre de 2026** ([detalle](HISTORIAL.md#t13-paso9)). Inicio y fin del paseo con su ubicación a `puntos_control` (las fotos ya llevan la suya); **sin ubicación continua**: `vigilancia` y el permiso nunca suben. Sin migración nueva; **sin probar contra el Supabase real** | chico | Inicio, foto y fin aparecen en los dos celulares |
| 7b | **HECHO el 14 de octubre de 2026** ([detalle](HISTORIAL.md#t13-paso7b)). Postulaciones del paseador, decisiones del equipo y casos y disputas en la base; el paseador corrige su DNI (`guardar_dni`); el borrado conoce las imágenes del chat; borrador legal con servidor. **Dos migraciones nuevas sin aplicar**; **sin probar contra el Supabase real** | mediano | `/admin` aprueba desde la base y el paseador ve su estado real |
| 7c | **HECHO el 15 de octubre de 2026** ([detalle](HISTORIAL.md#t13-15oct)). Cuatro migraciones nuevas, **sin aplicar**: la videollamada solo guarda la hora, **borrar mi cuenta con servidor** (`borrar_mi_cuenta`), **reseñas** con calificación en la tarjeta del paseador e **integridad** (reglas que antes solo cuidaba la app: un paseo ya pedido no cambia, un pago pendiente frena otro paseo, `marcado_por`, un inicio y un fin por paseo, los casos no se reescriben). Y `docs/PUBLICAR.md` trae los pasos para encender `NEXT_PUBLIC_DATOS=servidor`, con una consulta que dice qué migraciones faltan. **Sin probar contra el Supabase real** | grande | Pruebas SQL (PGlite), escenarios con los tres servidores de prueba y la app compilada en modo servidor contra el simulador local |
| 10 | Textos de privacidad y términos nuevos (**lo revisa el abogado**) | mediano | Aprobación del abogado; la prueba de textos sigue verde |
| 11 | Ensayo: proyecto pausado, respaldo y vuelta a `local` | chico | Se reanuda y se recupera |
| 12 | Piloto con **1 familia** y 1 paseador, y después las otras | mediano | Una semana sin errores graves |

Cada paso termina con un commit pequeño, las comprobaciones (`typecheck`, `test`, `build`, `lint`, `test:humo`) y una prueba en el celular. **Hasta el paso 10 no se suben datos de familias reales.**

## 8. Qué debe decidir o crear el equipo

**Decisiones:**
1. ¿Supabase (recomendado) o Firebase? Si es Firebase: ¿aceptan poner un medio de pago en Blaze?
2. ¿Qué correo del equipo será **dueño** de la cuenta y quiénes tendrán acceso? (**No lo sé** cuántas personas pueden entrar a un proyecto en el plan gratis.)
3. ¿Cómo entran las familias: cuenta propia con correo y contraseña, o el equipo crea las cuentas a mano durante el piloto?
4. ¿Cuánto tiempo se guardan las fotos y las ubicaciones (por ejemplo 30 días) y quién las borra?
5. ¿El Yape o Plin del paseador se guarda en el servidor, o el equipo lo recibe por otro medio?
6. ¿El DNI del paseador se sube? (Recomendación: no.)
7. ¿Quién entra cada semana a reanudar el proyecto y hacer el respaldo?
8. ¿Qué abogado revisa el texto de privacidad antes de subir datos reales?

**Cosas que el equipo crea (yo no puedo ni debo):** la cuenta de Supabase, el proyecto, las cuentas de las 3 personas del equipo y, si se usa, el servicio de correo. **Yo nunca escribo contraseñas ni claves por ustedes**, igual que en Vercel.

**Claves: qué va dónde**

| Dato | ¿Puede ir en el código? | Dónde va |
|---|---|---|
| Dirección del proyecto (URL) y la clave pública («anon» o «publishable») | **No en el repositorio.** No es secreta (el navegador la usa y las reglas de acceso la protegen) | Variables `NEXT_PUBLIC_…` de Vercel y un `.env.local` que Git ignora |
| **Clave `service_role` o «secret»** (da acceso a todo y se salta las reglas) | **NUNCA** | No se usa en este plan. Si algún día hace falta, solo como variable de servidor, jamás `NEXT_PUBLIC_` |
| Contraseña de la base de datos | **NUNCA** | Solo en el panel de Supabase |
| Token personal de Supabase y claves del servicio de correo | **NUNCA** | Solo en el administrador de contraseñas del equipo |
| Contraseñas de las cuentas del equipo | **NUNCA** | Cada persona, en su administrador de contraseñas |

*(Los nombres exactos de las dos claves cambian según la versión del panel; no los verifiqué en esta lectura.)*

## Preguntas que necesito que responda el equipo
1. ¿De acuerdo con **Supabase**?
2. ¿Familias con cuenta propia o cuentas creadas a mano durante el piloto?
3. ¿Se suben a un servidor las fotos con hora y lugar, y por cuántos días?
4. ¿Se guarda en el servidor el Yape o Plin del paseador? ¿Y el DNI? (Recomendación: lo primero sí, solo para el equipo; lo segundo no.)
5. ¿Quién es el dueño de la cuenta, quién reanuda y respalda cada semana, y qué abogado revisa la privacidad?

## Fuentes (leídas el 13 de octubre de 2026)
- Precios de Supabase (plan gratis y Pro): <https://supabase.com/pricing>
- Límites del inicio de sesión (2 correos por hora): <https://supabase.com/docs/guides/auth/rate-limits>
- Pausa de proyectos gratis: <https://supabase.com/docs/guides/platform/free-project-pausing>
- Precios de Firebase (plan Spark): <https://firebase.google.com/pricing>
- Planes de Firebase y medio de pago: <https://firebase.google.com/docs/projects/billing/firebase-pricing-plans>
