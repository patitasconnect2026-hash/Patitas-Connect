# Carpeta `supabase/`: tablas y reglas de acceso

**Estado: el SQL ya está aplicado en el proyecto real de Supabase** (lo aplicó el equipo; las claves nunca van al código). Esto es el **paso 3** de `docs/PLAN-SERVIDOR.md`: «quién ve qué», en archivos SQL. El inicio de sesión (paso 4), la entrada de `/admin` (paso 5) y los paseos (paso 6a, [más abajo](#paseos-en-el-servidor-paso-6a)) usan esas reglas.

## Qué hay

| Archivo | Para qué sirve |
|---|---|
| `migrations/…_tablas.sql` | Las tablas, con los mismos nombres y estados que el código (paseos, pagos, casos, comprobaciones…). No da permiso a nadie. |
| `migrations/…_reglas.sql` | Las reglas de acceso por fila. **Nadie ve nada por defecto.** También: el pago solo cambia por `mover_pago`, el rol «equipo» no se pone solo y el código de recojo se compara sin leerlo. |
| `migrations/…_fotos_almacen.sql` | El almacén privado de fotos y quién puede subir o ver. |
| `migrations/20261014130000_fotos_paso_8.sql` | **APLICADA (22 de octubre; paso 8).** Dos reglas chicas: que el paseador pueda borrar SU foto de hoy del almacén para cambiarla el mismo día, y que la ruta de una foto sea la de su paseo (si no, un paseador podía apuntar a la imagen de otro paseo). **Hay que aplicarla antes de usar fotos con el Supabase real** (una migración nueva, por separado: pegarla en el editor de SQL y tocar Run). |
| `migrations/20261014140000_postulaciones_paso_7b.sql` | **APLICADA (22 de octubre; paso 7b).** `notas_revision`: las notas internas del equipo en una tabla que SOLO lee y escribe el equipo (la columna vieja `postulaciones.revision_notas` la puede leer el propio postulante). |
| `migrations/20261014150000_dni_paso_7b.sql` | **APLICADA (22 de octubre; paso 7b).** `guardar_dni(p_dni)`: el paseador guarda o corrige SU DNI sin poder volver a leerlo; si cambia un número que el equipo ya había comprobado, esa casilla vuelve a quedar sin marcar. |
| `migrations/20261015100000_videollamada_solo_hora.sql` | **APLICADA (22 de octubre; 15 de octubre).** Quita la columna `postulaciones.referencias`: la videollamada es solo entre el paseador y el equipo y lo único que se guarda de ella es la hora que eligió (`cita_videollamada`). |
| `migrations/20261015110000_borrar_mi_cuenta.sql` | **APLICADA (22 de octubre; 15 de octubre).** `borrar_mi_cuenta()`: la propia persona borra su cuenta. Se niega si hay un paseo en marcha, un reporte abierto o un pago pendiente; los paseos terminados y sus pagos quedan sin su nombre. Trae `archivos_por_borrar` y dos endurecimientos: un paseo o un pago puede quedar sin familia o sin paseador, y `mover_pago` ya no se salta la regla del paseador cuando el pago quedó sin paseador. Ver [Borrar mi cuenta](#borrar-mi-cuenta-parte-3a). |
| `migrations/20261015120000_resenas.sql` | **APLICADA (22 de octubre; 15 de octubre).** `resenas`: una reseña por paseo, solo de un paseo cerrado y de su familia (estrellas del 1 al 5, comentario corto, etiquetas); el nombre («Valeria R.») y el distrito los pone la base. Y la vista pública de paseadores suma `resenas_n`, `calificacion` (promedio, una decimal) y `paseos_hechos`. Ver [Reseñas](#reseñas-parte-3b). **Se aplica DESPUÉS de «borrar mi cuenta».** |
| `migrations/20261015130000_integridad.sql` | **APLICADA (22 de octubre; 15 de octubre, parte 3d).** Cierra en la base lo que hasta hoy solo cuidaba la app: un paseo ya pedido no cambia (solo su estado, su reporte una vez y que el paseador lo cierre de su lado), el perro del paseo es de la familia que lo pide, con un pago pendiente no se pide otro paseo, el pago guarda `marcado_por`, un inicio y un fin por paseo, los casos no se reescriben, y topes de peso de foto, coordenadas y largo del chat. Ver [Integridad](#integridad-parte-3d). **Se aplica DESPUÉS de las reseñas.** |
| `migrations/20261016100000_pedidos.sql` | **APLICADA (22 de octubre; 16 de octubre, Bloque 2 «Pedir paseo»).** Tablas `pedidos`, `ofertas` y `pedidos_vistos`; funciones `crear_pedido`, `cancelar_pedido`, `pedidos_abiertos`, `ofertar`, `elegir_oferta` y `contadores_pedido`. Cada paseador ve solo los pedidos de su distrito y parques, y de la familia solo su nombre de pila, el distrito y una zona aproximada (casilla de ~330 m), nunca la casa exacta. Los topes de dinero (16 y 34) se copian de `lib/config.ts` (una prueba los compara). **Se aplica DESPUÉS de la integridad.** |
| `migrations/20261016200000_respuestas_escritas.sql` | **APLICADA (22 de octubre; 16 de octubre, Bloque 5).** La tabla `respuestas_escritas` (lo que el paseador escribió en el examen; solo la lee el equipo) y la función `guardar_respuestas_examen` (largo entre 40 y 600 letras, copia de `lib/config.ts`). Se borra con la cuenta. **Se aplica DESPUÉS de `…100000_pedidos`.** |
| `migrations/20261016300000_ubicacion_y_sospechas.sql` | **APLICADA (22 de octubre; 16 de octubre, Bloque 6).** Las fotos y los puntos de control ganan la **hora oficial del servidor** (`hora_servidor`; el teléfono no la puede poner) y la foto guarda la precisión de la lectura (`precision_m`). Tabla `fotos_sospechas` (solo la lee el equipo): una foto con más de 60 m de error, a más de 500 m de la casa del paseo o con un salto de más de 25 km/h respecto a la foto anterior queda marcada (copia de `lib/config.ts`; una prueba los compara). Tabla `ubicacion_en_vivo` y función `publicar_ubicacion`: la última lectura del paseador mientras el paseo está «en_paseo»; la ven su familia y el equipo; se borra al entregar. **La ubicación la da el teléfono y se puede falsificar: esto solo deja la hora oficial y avisa al equipo de cosas raras.** **Se aplica DESPUÉS de `…200000_respuestas_escritas`.** |
| `migrations/20261016400000_usos_ia.sql` | **APLICADA (22 de octubre; 16 de octubre, Bloque 7).** La tabla `usos_ia`: quién del equipo pidió un resumen con IA, sobre quién y cuándo (no guarda lo que se envió ni lo que respondió). Solo el equipo la lee y solo escribe a su nombre. **Se aplica DESPUÉS de `…300000_ubicacion_y_sospechas`.** |
| `functions/resumen-ia/` y `functions/_shared/resumen.ts` | **La Edge Function de la IA de apoyo (sin subir).** Solo el equipo; la clave está en el secreto `IA_CLAVE` de Supabase (nunca en el código); quita nombre, DNI, teléfono y correo; descarta cualquier «apto»/«no apto»; registra el uso antes de llamar. Pasos en `docs/PUBLICAR.md`, «IA de apoyo en /admin». |
| `migrations/20261022100000_permisos_service_role.sql` | **NUEVA, SIN APLICAR (22 de octubre).** Permisos explícitos de la clave de servicio: da `select, insert, update, delete` a `service_role` en las 7 tablas nuevas del 16 de octubre (`pedidos`, `ofertas`, `pedidos_vistos`, `respuestas_escritas`, `fotos_sospechas`, `ubicacion_en_vivo`, `usos_ia`) y le quita todo a `anon` en las 4 que no lo tenían quitado. **No da permiso de ejecutar ninguna función** a `service_role` (todas dependen de la sesión de una persona). No cambia lo que ve ninguna persona. **Se aplica DESPUÉS de `…400000_usos_ia`.** |
| `APLICAR-EN-SUPABASE.sql` | **Las tres primeras migraciones juntas**, para pegarlas UNA vez en el editor de SQL de Supabase (ya se aplicó). **No incluye ninguna de las nuevas (paso 8, paso 7b, videollamada, borrar mi cuenta, reseñas e integridad)**: las migraciones nuevas se aplican aparte, una por una y en orden de fecha. |
| `tests/probar_en_pglite.cjs` | **Corre todas las pruebas SQL en una base temporal (PGlite), sin Docker, sin Supabase y sin red:** `node supabase/tests/probar_en_pglite.cjs` (o `… paseos` para correr solo las de los paseos). Necesita `npm i --no-save @electric-sql/pglite@0.2.17` una vez. No toca ningún proyecto real. |
| `tests/base_pglite.mjs` | La base temporal que usa lo anterior: simula lo que Supabase ya trae (roles, `auth.uid()`, almacenamiento) y aplica **todas** las migraciones, en orden (o solo las primeras N con `crearBase({ cantidad: N })`, para probar la consulta «¿cuáles faltan?»). |
| `tests/database/quien_ve_que.test.sql` | Pruebas de «quién ve qué» (37). |
| `tests/database/paseos_servidor.test.sql` | Pruebas de los paseos tal como los usa la app (87): quién crea, ve y cambia cada cosa, los estados, el código de recojo. |
| `tests/database/paseos_limites.test.sql` | **Lo que la base NO comprueba hoy** (6): los montos, el cupo, el plazo para aceptar y el orden del código; cada prueba demuestra que algo pasa, para que nadie crea que está protegido. (Los otros ocho límites se cerraron con la migración de integridad.) |
| `tests/database/pagos_servidor.test.sql` | Pruebas de los pagos tal como los usa la app (64): quién los ve, que nadie los escribe directo, quién mueve cada acción, nota obligatoria y transiciones inválidas (paso 7). |
| `tests/database/pagos_limites.test.sql` | **Lo que la base NO comprueba de los pagos** (3): el plazo de 24 h, el formato de la hora anotada y que el monto sea el cobrado de verdad (paso 7). |
| `tests/database/fotos_servidor.test.sql` | Pruebas de las fotos tal como las usa la app (69): quién sube, ve y borra los DATOS (`fotos`) y las IMÁGENES (almacén privado), el tope declarado de 1 MB y la ruta que tiene que coincidir con el paseo (paso 8). |
| `tests/database/fotos_borrado.test.sql` | `fotos_para_borrar` (15): se conservan las fotos de un paseo con un caso abierto o en disputa y se entregan las demás vencidas. |
| `tests/database/fotos_limites.test.sql` | **Lo que la base NO comprueba de las fotos** (7): cuántas por paseo, que el peso anotado sea el del archivo, la hora, que el lugar sea Lima, el código y las imágenes del chat. |
| `tests/database/puntos_servidor.test.sql` | Pruebas de los puntos de control (31): quién anota el inicio y el fin, quién ve la ubicación del paseo, que nadie los edita ni los borra y que no hay dónde guardar un recorrido (paso 9). |
| `tests/database/puntos_limites.test.sql` | **Lo que la base NO comprueba de los puntos de control** (2): el estado del paseo y que la hora y el lugar sean los reales. |
| `tests/database/postulaciones_servidor.test.sql` | Pruebas de las postulaciones (28): el paseador escribe lo suyo y no se aprueba solo, el equipo marca casillas y decide, ni otro paseador ni la familia ven nada, las notas internas solo las ve el equipo (paso 7b). |
| `tests/database/postulaciones_limites.test.sql` | **Lo que la base NO comprueba de las postulaciones** (5): que esté completa, el mismo DNI en dos cuentas y la columna vieja de notas (paso 7b). |
| `tests/database/casos_servidor.test.sql` | Pruebas de los casos y disputas (21): quién abre, quién ve, que solo el equipo resuelve y que un caso resuelto ya no se cambia (paso 7b). |
| `tests/database/casos_limites.test.sql` | **Lo que la base NO comprueba de los casos** (3): los datos que pone quien lo abre, el estado del paseo y que resolver no mueve el paseo (paso 7b). |
| `tests/database/integridad.test.sql` | Las reglas de la migración de integridad (82): el perro de la familia, el paseo ya pedido que no cambia, el reporte una vez, `cerrado_paseador`, el pago pendiente, `marcado_por`, un inicio y un fin, los casos, las postulaciones, las fotos, y que el equipo conserva su poder. |
| `../lib/servidor/integridad.migracion.test.ts` | La migración de integridad se aplica encima de una base que YA tiene datos de antes (como el Supabase real): no falla, deja los datos y desde entonces rechaza lo nuevo. |
| `tests/database/pedidos_servidor.test.sql` | «Pedir paseo» (54): quién pide, quién lo ve (solo su zona y sin la casa exacta), una oferta por paseador y nunca por menos, un paseador ocupado no oferta, elegir crea el paseo aceptado y descarta las demás, el pedido vence solo y quien debe un pago no pide. |
| `../lib/servidor/pedidos.escenarios.test.ts` | Lo mismo de punta a punta con el cliente de Supabase por HTTP sobre PGlite. |
| `tests/database/respuestas_escritas.test.sql` | Las respuestas escritas del examen (17): solo el equipo las lee, el largo mínimo y máximo, o se guardan todas o ninguna, y se borran con la cuenta. |
| `../lib/servidor/respuestas.escenarios.test.ts` | Lo mismo por HTTP: el paseador las manda con su postulación y el equipo las lee por persona. |
| `tests/database/ubicacion_y_sospechas.test.sql` | La hora oficial, las fotos sospechosas y la ubicación en vivo (30): quién publica y quién ve, el máximo de una lectura cada 2 segundos, los tres motivos de «sospechosa», que solo el equipo las lee y que la ubicación se borra al entregar. |
| `../lib/servidor/ubicacion.escenarios.test.ts` | Lo mismo por HTTP con la app: la paseadora publica, la familia ve, nadie más. |
| `tests/database/usos_ia.test.sql` | El registro de uso de la IA (9): solo el equipo lo lee y escribe, a su propio nombre; nadie lo edita ni lo borra. |
| `../lib/iaApoyo.test.ts` | La función de la IA con red de mentira: permisos, sin clave, el uso se registra antes de llamar, sin datos personales, sin veredictos, y la clave nunca está en el código. |
| `tests/database/permisos_service_role.test.sql` | Los permisos de la migración 15 (7): `service_role` tiene los 4 permisos en las 7 tablas y nada más, `anon` ninguno, ninguna función nueva se le da a `service_role` ni a `anon`, y `authenticated` no cambia. |
| `../lib/servidor/permisos.migracion.test.ts` | La migración 15 sobre una base que se parece a Supabase (con permisos de `anon` ya dados): se los quita, da lo suyo a `service_role` y se puede repetir. |
| `tests/database/dni_servidor.test.sql` | Pruebas de `guardar_dni` (16): guardar, corregir, la casilla del equipo que vuelve a quedar sin marcar, y quién NO puede (paso 7b). |
| `tests/database/videollamada_solo_hora.test.sql` | La videollamada solo guarda la hora (5): ya no hay dónde guardar referencias, invitados ni acompañantes. |
| `tests/database/borrar_cuenta.test.sql` | `borrar_mi_cuenta` (92): quién no puede (sin sesión, equipo, paseo en marcha, reporte abierto, pago pendiente), qué se borra de la familia y de la paseadora, qué queda sin su nombre, que nadie deja a otra persona en blanco a mano y que la lista de archivos por borrar es solo del script. |
| `tests/database/resenas_servidor.test.sql` | Las reseñas (59): quién crea (solo la familia del paseo, con el paseo cerrado, una por paseo), los límites (1 a 5 estrellas, 280 letras, 8 etiquetas), que el nombre y el distrito los pone la base, quién las ve, que nadie las edita ni las borra, el promedio y los paseos en la vista pública y que se van con la cuenta. |
| `tests/almacen_simulado.mjs` | Un «almacén de fotos de mentira»: hace lo que la API de Storage hace por encima de las reglas (1 MB, tipo de archivo, «ya existe», enlaces que vencen) y deja que las reglas de fila de las migraciones decidan quién sube, ve y borra. Lo usan `servidor_simulado.mjs` y las pruebas. |
| `tests/servidor_simulado.mjs` | Un «Supabase de mentira» para ver la app sin tocar el real: contesta como PostgREST y GoTrue (lo mínimo que usa la app) sobre las migraciones reales en PGlite. `node supabase/tests/servidor_simulado.mjs` y la app con `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`. Personas de prueba con contraseña `prueba-1234` (inventada). |
| `scripts/borrar_fotos_vencidas.mjs` | Borra las fotos de más de 7 días, las **imágenes del chat** de más de 7 días (salvo las de paseos con un caso abierto o en disputa) y los **archivos de las cuentas borradas** (`archivos_por_borrar`, sin esperar 7 días). Sin `--hacerlo` solo muestra. Las reglas de qué borrar están en `scripts/vencimiento_chat.mjs` y `scripts/archivos_de_cuentas.mjs` (probadas). |
| `scripts/crear_cuenta_equipo.mjs` | Crea una cuenta del equipo (con rol «equipo») desde la terminal, sin pasos manuales en el panel. Pide el correo y la contraseña (esta no se ve). Si el correo ya existe, no toca nada y lo dice. Cómo correrlo: [«Crear una cuenta del equipo»](#crear-una-cuenta-del-equipo-para-una-persona-que-no-programa). |
| `../lib/supabase.test.ts` | Revisa que los archivos SQL siguen las reglas del equipo y que copian los estados del código. Corre con `npm run test`. |
| `../lib/servidor/publicar.test.ts` | Revisa que `docs/PUBLICAR.md` («Encender el servidor») nombra todas las migraciones en orden y solo variables que la app lee, y corre su consulta «¿cuáles faltan?» en la base temporal. |

## Quién ve qué (resumen)

| Dato | Familia | Paseador | Equipo |
|---|---|---|---|
| Sus paseos, chat, bitácora, puntos de control | los suyos | los suyos | todos (el chat solo lo lee) |
| Casa y contacto de emergencia del dueño | la suya | **solo después de aceptar** | sí |
| Ficha completa del perro | la suya | después de aceptar | sí |
| Celular, apellido y nacimiento | los suyos | los suyos | sí; **nunca entre familia y paseador** |
| Yape o Plin del paseador | **no** | el suyo | sí |
| DNI completo | **no** | no puede volver a leerlo | **solo el equipo** (tabla aparte) |
| DNI en público | últimos 3 dígitos, por la vista `paseadores_publicos` (nunca dice «verificado») | — | — |
| Código de recojo | sí | **no lo lee**: lo escribe y la base lo compara | sí |
| Pagos (solo el registro) | los de su paseo | los de su paseo | todos |
| Foto de hoy | del paseador con quien tiene un paseo aceptado | la suya | sí |
| Fotos del paseo | las de su paseo | las que tomó | sí |
| Casos y reportes | los de su paseo | los de su paseo | todos, y los resuelve |

El pago sigue las transiciones de `lib/pagos.ts`: `sin_pagar → visto → pagado_paseador` (y `no_encontrado`). El paseador solo puede «Vi el pago», con el paseo entregado o cerrado; **solo el equipo** marca «Pagado al paseador» o «No lo encuentro».

## Cuentas

- La familia y el paseador **se registran solos**. El rol que piden solo puede ser `familia` o `paseador`.
- Las del **equipo** se crean con el script `scripts/crear_cuenta_equipo.mjs` (ver [más abajo](#crear-una-cuenta-del-equipo-para-una-persona-que-no-programa)) o a mano: se crea el usuario en el panel (Authentication) y después se ejecuta en el editor de SQL: `update public.perfiles set rol = 'equipo' where id = '<id del usuario>';`. Desde la app **nadie** puede cambiar un rol (tampoco el equipo). Los pasos completos están más abajo: [«Cuentas del equipo y `/admin`»](#cuentas-del-equipo-y-admin-paso-5).

## Cómo se aplica una migración nueva

1. Revisarla (y correr `node supabase/tests/probar_en_pglite.cjs`: aplica todas en orden y corre las pruebas).
2. Pegarla en el editor de SQL del panel de Supabase y tocar **Run** (o `supabase db push`). **La aplica una persona del equipo**; yo nunca lo hago.
3. Si crea cuentas del equipo o cambia roles, ver «Cuentas» arriba.

## Las pruebas

- **`npm run test`**: `lib/supabase.test.ts` revisa el SQL como texto (todas las tablas con reglas, nada abierto a todos, estados iguales al código, sin claves), y `lib/servidor/` corre los **mismos escenarios de paseos tres veces**: contra un servidor simulado en memoria (siempre), contra las migraciones reales en PGlite y contra el cliente de Supabase de verdad hablando HTTP con `servidor_simulado.mjs` (las dos últimas solo si PGlite está instalado).
- **`node supabase/tests/probar_en_pglite.cjs`**: las pruebas SQL (242 hoy, todas pasan). Sirven para la base temporal; **no reemplazan probar contra el proyecto real**.
- **`supabase test db`** (pgTAP de verdad, con Docker y la herramienta de Supabase) sigue sin correrse: los mismos archivos deberían servir, pero no lo verifiqué.

## Claves

**NUNCA van al código, ni a un archivo del proyecto, ni a `NEXT_PUBLIC_…`:**

| Dato | Dónde vive |
|---|---|
| Clave **`service_role`** o «secret» (se salta todas las reglas) | Solo en la terminal, al correr `borrar_fotos_vencidas.mjs`. En ningún archivo. |
| Contraseña de la base de datos | Solo en el panel de Supabase |
| Token personal de Supabase | Solo en el administrador de contraseñas del equipo |
| Claves del servicio de correo (SMTP) | Solo en el panel de Supabase |
| Contraseñas de las cuentas del equipo | Cada persona, en su administrador |

**Sí van en `.env.local`** (Git ya lo ignora: `.env*`) **y en las variables de Vercel**:

```
NEXT_PUBLIC_DATOS=servidor
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clave pública «anon» o «publishable»>
```

La clave pública no es secreta (el navegador la usa y las reglas de acceso la protegen), pero tampoco se escribe en el repositorio. Los nombres exactos de las variables pueden cambiar cuando se escriba el adaptador (paso 4).

## Las fotos: borrado a los 7 días

- Cada foto lleva `vence_en` = 7 días después. Si el paseo tiene un caso abierto o está en disputa, **se conserva** hasta que el caso se cierre (`fotos_para_borrar`).
- **El borrado automático NO es solo SQL.** Supabase dice que los archivos se borran por su API, no con una consulta SQL (quedarían huérfanos). Por eso hay un script que usa la API: `scripts/borrar_fotos_vencidas.mjs`. **Hay que correrlo a mano** (por ejemplo una vez por semana, con `--hacerlo`).
- Programarlo solo (una tarea programada que llame al script o a una función) **no lo verifiqué para el plan gratis: No lo sé.** Es una decisión para el paso 8 del plan.
- Los enlaces a las fotos **vencen** (los pide la app por 2 minutos y pide otro cuando hace falta). El almacén no tiene direcciones públicas.
- **Imágenes del chat (paso 7b):** el script ahora también recorre `chat/<paseo>/` y borra las que llevan más de 7 días en el almacén (no tienen fila ni fecha guardada, así que se usa la fecha en que el almacén las recibió; un archivo sin fecha NO se borra). Hoy la app no sube imágenes de chat. **Esa parte no se pudo probar contra el Storage real**: lo que sí está probado son las reglas de qué borrar (`lib/servidor/borradoChat.test.ts`). Ver también [«Imágenes del chat»](#imágenes-del-chat-límite-conocido-y-salida-propuesta).

## Lo que la base NO valida todavía (para que nadie lo crea)

La lista completa de los paseos, con una prueba por cada punto, está en [«Paseos en el servidor»](#paseos-en-el-servidor-paso-6a). Además:

- **Que el paseador haya escrito el código de recojo antes de «recoger» o «entregar»:** hoy lo ordena la app (como hoy). La base solo guarda el código y lo compara en `verificar_codigo_recojo` (5 fallos y se bloquea; lo reinicia el equipo en el panel de SQL).
- **El plazo de 2 horas para aceptar** (`minutosParaAceptar`) y el de pago (`horasParaPagar`): son de la app.
- **Que el puntaje del curso y del examen sea honesto:** lo calcula la app y lo sube el paseador; la casilla «Examen aprobado» la marca el equipo después de leer las respuestas.
- **Reasignación y avisos:** viven en la app.
- **Las fotos:** cuántas por paseo (`maxFotosPorPaseo`), la hora, que el lugar sea Lima y el código son de la app y del teléfono (ver [«Fotos en el almacén privado»](#fotos-en-el-almacén-privado-paso-8)). Desde la parte 3d la base sí exige que el peso anotado no pase de 1 MB y que la coordenada exista.
- **Lo que cerró la parte 3d** (el paseo ya pedido que no cambia, el perro de la familia, el pago pendiente, `marcado_por`, un inicio y un fin, los casos): ver [«Integridad»](#integridad-parte-3d).

## Cosas que el equipo debe saber o decidir

1. **DNI:** la base entrega los últimos **3** dígitos; la app (`maskDni`, la hoja del DNI y los textos) dice **4**. Con servidor, la familia ve `••••678` (los 3 que hay) y los textos siguen diciendo «4»: **sin decidir** cuál se usa (la base, la app y la política de privacidad tienen que decir lo mismo). **En el paso 7b NO se tocó**: el borrador legal con servidor dice «los últimos dígitos» sin número, para no decidir por el equipo.
2. **Identificadores:** el paseador de ejemplo es `carlos` o `nuevo-<código>`; con servidor, un paseador real es el id de su cuenta (el mismo que figura en sus paseos). Los paseadores de ejemplo y la demostración **no** pasan por el servidor (siguen en el teléfono) y con una sesión real **no** se mezclan con los reales.
3. **El paseador no puede hacer «upsert» de su DNI** (insertar y actualizar en una sola llamada): la base no le deja volver a leerlo. La app debe hacer «insertar» y, si ya existe, «actualizar». **Resuelto en el paso 7b:** el «actualizar» directo sigue afectando 0 filas, pero ahora el paseador corrige su DNI por `guardar_dni(p_dni)` (migración `20261014150000_dni_paso_7b.sql`, sin aplicar): guarda el DNI de quien llama sin dejarle volver a leerlo, y si cambia un número que el equipo ya había comprobado, la casilla «DNI» vuelve a quedar sin marcar.
4. **Una ley de datos personales aplica** a todo esto: antes de usar datos de familias reales hay que consultar al abogado (queda en «Pendientes del equipo»).

## Inicio de sesión (paso 4): cómo conectar la app

**Para una persona que no programa:**

1. En la carpeta del proyecto, copia el archivo `.env.local.ejemplo` y ponle el nombre `.env.local` (Git no lo sube).
2. En Supabase entra al proyecto → **Configuración del proyecto → Claves API**.
3. Copia la **Project URL** y pégala después de `NEXT_PUBLIC_SUPABASE_URL=`.
4. Copia la clave **pública** (se llama «anon» o «publishable») y pégala después de `NEXT_PUBLIC_SUPABASE_ANON_KEY=`. Escribe `servidor` después de `NEXT_PUBLIC_DATOS=` y reinicia la app.
5. **La clave «service_role» o «secret» NUNCA se copia a ningún archivo.** Si la pegas por error, la app la rechaza y vuelve al modo local.

Para que el enlace del correo vuelva a la app: en Supabase → Authentication → URL configuration, agrega **la dirección de la app tal cual** (por ejemplo `https://patitas-connect.vercel.app`, sin nada después; y `http://localhost:3000` para probar en la computadora) y `<dirección>/acceso/nueva-contrasena` a las direcciones permitidas. El enlace de confirmación vuelve a **la dirección de la app**: allí la app lee la sesión y deja a la persona dentro, en el paso donde se quedó. Si esa dirección no está en la lista, Supabase manda al «Site URL». Las variables `NEXT_PUBLIC_…` también hay que ponerlas en Vercel y volver a publicar.

### Pendiente del equipo: el correo de confirmación (2 por hora)

El correo que trae Supabase gratis permite **2 por hora en todo el proyecto**, y lo gastan la confirmación del registro y «olvidé mi contraseña». Dos salidas; **la decisión es del equipo**:

| Salida | Qué es | Riesgo |
|---|---|---|
| **A. Servicio de correo propio** | Conectar un servicio de envío de correo (SMTP) en Authentication → SMTP. | Otra cuenta y otra clave (se guarda solo en el panel de Supabase). Hay que verificar el remitente y puede caer en «spam». No verifiqué qué servicio tiene plan gratis. |
| **B. Apagar «confirmar correo» durante el piloto** | Authentication → Sign In / Providers → Email → quitar «Confirm email». | Cualquiera crea una cuenta con un correo mal escrito o ajeno, y no hay forma de recuperarla. «Olvidé mi contraseña» **sigue** mandando correo (2 por hora). Aceptable solo con pocas familias conocidas. |

Mientras no se decida, nada se rompe: el registro funciona hasta 2 correos por hora.

### Un solo camino de entrada (corrección del paso 4)

Solo con `NEXT_PUBLIC_DATOS=servidor`. La portada (y la de `/paseador`) tiene **un botón principal «Entrar o crear cuenta»**. Abre una pantalla con **«Iniciar sesión»** arriba (correo, contraseña y «Olvidé mi contraseña») y **«¿No tienes cuenta?»** abajo, donde se elige «Soy familia» o «Soy paseador» y se registra. La app principal **lee la sesión**:

| Situación | Qué ve la persona |
|---|---|
| Sin sesión | La portada con «Entrar o crear cuenta» (y «Usar cuenta de demostración»). |
| Leyendo la sesión | Una pantalla de espera (nunca la portada). |
| Familia con sesión y con su cuenta (casa y perro) en este teléfono | La app de la familia. |
| Familia con sesión y sin casa ni perro en este teléfono | Directo a «Cuéntanos de ti», con nombre, apellido y correo ya puestos (sin celular ni código). |
| Paseador con sesión | La app del paseador; si no postuló, sus pasos con el celular y el nombre ya puestos. |
| Equipo con sesión | `/admin`. |
| Con sesión pero la base no responde | «No pudimos comprobar tu cuenta» y «Reintentar». Nunca la portada. |
| Cuenta de familia en `/paseador` | «Esta cuenta es de familia»: el rol no cambia; para ser paseador hace falta otra cuenta. |

`/acceso` sigue existiendo para los enlaces de correos anteriores: con sesión lleva a la app de la cuenta (ya no dice «Hola / Seguir»). Si el enlace del correo llega **sin sesión** (venció o se abrió en otro navegador), la entrada dice «Entra con tu correo y contraseña.»

### Lo que la app hace al registrarse

- Pide «familia» o «paseador» y manda `rol` y `nombre_pila` (el disparador de la base crea el perfil). **El rol «equipo» no existe en la app.**
- Pide el **celular como dato de contacto** (queda en `datos_personales`). **No hay entrada por SMS ni código por SMS:** necesita un servicio que cobra (decisión del equipo; ver `docs/HISTORIAL.md`).
- Con sesión, guarda `apellido` y `celular` en `datos_personales` (solo insertar), **también cuando la persona confirmó el correo desde el enlace** (sin pasar por «Entrar»). **No pide DNI.** El DNI del paseador llegará en su postulación; recuerda que el paseador **no puede hacer «upsert»** (insertar y, si existe, actualizar): hoy el «update» del paseador afecta 0 filas.
- **La casa y el perro se guardan en el teléfono y, al pedir un paseo, también en la base** (paso 6a, ver arriba). La **postulación** del paseador sigue en el teléfono, pero con servidor y sesión se guarda **aparte por cuenta** (`clave@idDeLaCuenta`, `lib/datos/propietario.ts`): dos cuentas en el mismo navegador no comparten la cuenta, la postulación ni los pagos; lo que había antes sin dueño se queda como estaba y no se le asigna a nadie.

## Cuentas del equipo y `/admin` (paso 5)

**Las cuentas del equipo NO se registran desde la app.** No hay botón ni formulario para eso, y aunque alguien pidiera «equipo» al registrarse, la base lo convierte en «familia». Cada persona del equipo tiene **su propia cuenta** y su propia contraseña (en su administrador de contraseñas; nunca en un chat ni en un archivo del proyecto).

### Qué ve cada persona en `/admin`

| Situación | Qué se ve |
|---|---|
| **Modo local** (sin `NEXT_PUBLIC_DATOS`) | El panel de siempre, con el aviso «Todavía sin contraseña». No cambia nada. |
| **Con servidor, sin sesión** | Solo una entrada corta: correo y contraseña. No se descarga ni se lee nada del panel. |
| **Con servidor, con sesión pero sin rol «equipo»** | «Esta cuenta no tiene acceso» y el botón «Salir». Nada más. |
| **Con servidor, con rol «equipo»** | El panel, con el botón «Salir». |
| **Con servidor, pero la base no responde** | «No pudimos comprobar tu cuenta» y «Reintentar». No se muestra el panel (no se sabe el rol). |

El rol se **lee de la base** (`perfiles.rol`) con la sesión de la persona; lo que diga el navegador no cuenta. Se vuelve a leer al volver a la pestaña y cada vez que la sesión se renueva. Si la sesión vence, la app vuelve a la entrada.

### Crear una cuenta del equipo (para una persona que no programa)

**Camino corto: un script en la terminal** (no hay que tocar el panel ni escribir SQL).

1. Abre la terminal en la carpeta del proyecto.
2. En Supabase → **Configuración del proyecto → Claves API**, copia la **Project URL** y la clave **`service_role`** (o «secret»). Esa clave se salta todas las reglas: **no la pegues en ningún archivo, chat ni commit**.
3. Guarda la clave en la terminal sin que se vea ni quede en el historial. Escribe esto, pega la clave y toca Enter (no se ve nada al pegar; es normal):

   ```bash
   read -s SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY
   ```

4. Corre el script, cambiando la dirección por la de tu proyecto:

   ```bash
   SUPABASE_URL=https://<tu-proyecto>.supabase.co node supabase/scripts/crear_cuenta_equipo.mjs
   ```

5. El script te muestra el proyecto y pregunta si es el correcto (escribe `si`). Después pide el **correo**, la **contraseña** (mínimo 12 caracteres, no se ve al escribirla) y que la repitas. Nunca se imprime la contraseña ni la clave.
6. Si todo sale bien dice «Listo: … ya es del equipo». Si la cuenta **ya existía**, no cambia nada y te dice qué rol tiene. Si la cuenta se creó pero no pudo poner el rol, te da la línea de SQL para hacerlo a mano.
7. Cierra la terminal (o escribe `unset SUPABASE_SERVICE_ROLE_KEY`) para que la clave no quede guardada. Si alguna vez la pegas por error en un chat o un archivo, **cámbiala** en Supabase (Configuración → Claves API).
8. Comprueba que quedó con el apartado [«Comprobar quién tiene acceso»](#comprobar-quién-tiene-acceso), y que esa persona abra `<dirección de la app>/admin`.

La cuenta se crea ya confirmada (no gasta uno de los 2 correos por hora). **Esto no se probó contra el Supabase real:** solo contra un servidor de mentira que imita la API.

**Camino manual** (si prefieres el panel):

1. En Supabase, entra al proyecto → **Authentication** → **Users** → **Add user** → **Create new user**. Escribe el correo y una contraseña larga. Si aparece «Auto Confirm User», márcalo: así la cuenta no necesita el correo de confirmación (recuerda que el correo gratis manda solo 2 por hora). *Los nombres exactos pueden cambiar un poco según la versión del panel.*
2. En la lista de usuarios, copia el **User UID** de esa persona (un código largo con guiones).
3. Entra a **SQL Editor** → **New query**, pega esto cambiando `<id del usuario>` por el UID que copiaste (déjalo entre las comillas simples) y toca **Run**:

   ```sql
   update public.perfiles set rol = 'equipo' where id = '<id del usuario>';
   ```

4. Comprueba que quedó (siguiente apartado).
5. Esa persona abre `<dirección de la app>/admin` y entra con su correo y su contraseña. Solo funciona con la app en modo servidor (las variables `NEXT_PUBLIC_…` de arriba).

### Comprobar quién tiene acceso

En **SQL Editor** → **New query** → **Run**:

```sql
select p.id, u.email, p.rol
from public.perfiles p
join auth.users u on u.id = p.id
where p.rol = 'equipo';
```

Debe salir **una fila por cada persona del equipo**, con su correo. Si alguien falta, el UID estaba mal o falta el paso 3. Para mirar a una sola persona: cambia la última línea por `where u.email = 'persona@correo.pe';` (ahí aparece su rol, sea cual sea).

### Quitar el acceso a alguien

```sql
update public.perfiles set rol = 'familia' where id = '<id del usuario>';
```

- Desde ese momento la base **deja de entregarle** lo que es solo del equipo (las reglas leen el rol en cada consulta).
- La pantalla de `/admin` que tenga abierta **se cierra cuando vuelve a esa pestaña** o cuando la sesión se renueva (hasta entonces puede seguir viendo la pantalla; no datos nuevos del servidor).
- Para cerrar su cuenta del todo: **Authentication → Users → ⋯ → Delete user**. Se borra su cuenta y su perfil, y **no se puede deshacer**.
- Si olvidó la contraseña: «Olvidé mi contraseña» en `/acceso` (manda un correo; ojo con el límite de 2 por hora), o cambiarla en Authentication → Users.

### Lo que este paso NO hace (para que nadie lo crea)

- **(Antes del paso 7b) Los datos de `/admin` seguían en el navegador.** Hoy los pagos, las postulaciones y los casos salen de la base (pasos 7 y 7b); queda en cada teléfono la foto del postulante. Entrar con la cuenta del equipo decide **quién ve la pantalla**; la protección de datos **en el servidor** la dan las reglas de la base, y empieza a importar cuando esos datos estén allí. Por eso el panel, con sesión, dice «Datos aún en este navegador». **Desde el paso 6a** los paseos sí salen de la base y el equipo ve todos, pero el panel sigue mirando UN solo paseo (el más reciente) para resolver reportes. **Desde el paso 7 los pagos de todos los paseos sí salen de la base** (`/admin` «Pagos»); la cola de casos sigue en el navegador.
- **El código de la pantalla del panel es público**, como todo el JavaScript de la app: no tiene claves ni datos, y solo se descarga después de comprobar el rol, pero quien lo mire puede leer cómo está hecha la pantalla.
- **No hay verificación en dos pasos en la app todavía** (ver `docs/AVANCE.md`, «Pendientes del equipo»).

## Paseos en el servidor (paso 6a)

**Qué es:** con `NEXT_PUBLIC_DATOS=servidor` y una sesión abierta, los **paseos**, su **registro de estados** y la **bitácora** viven en las tablas `paseos`, `paseo_eventos` y `bitacora`, con la sesión de cada persona (nunca con la clave de servicio). **No hizo falta ningún cambio de SQL: no hay migración nueva.** Sin servidor, o en la demostración, todo sigue en el teléfono como siempre.

### Qué viaja a la base y qué sigue en el teléfono

| Cosa | Dónde está ahora |
|---|---|
| El paseo (quién, cuándo, montos, estado) y su registro | **Base** (`paseos`, `paseo_eventos`) |
| La bitácora (pipí, agua, foto avisada…) | **Base** (`bitacora`) |
| El código de recojo | **Base** (`codigos_recojo`): lo ve la familia; el paseador solo lo escribe y la base lo compara |
| La casa (dirección, punto en el mapa, portero, contacto de emergencia) | **Base** (`casas`), se guarda al pedir el paseo; el paseador la ve **después de aceptar** |
| La ficha del perro (sin foto) | **Base** (`perros`), igual: el paseador la ve **después de aceptar** |
| La lista de paseadores que ve la familia | **Base** (vista `paseadores_publicos`: solo aprobados) |
| Chat | **Base** desde el paso 6b (`mensajes`, ver más abajo) |
| Pagos y dónde cobra el paseador | **Base** desde el paso 7 (`pagos` y `cobros_paseador`, [ver abajo](#pagos-en-el-servidor-paso-7)) |
| Fotos del paseo y foto de hoy | **Almacén privado y tabla `fotos`** desde el paso 8 ([ver abajo](#fotos-en-el-almacén-privado-paso-8)) |
| Inicio y fin del paseo (puntos de control) | **Base** desde el paso 9 (`puntos_control`, [ver abajo](#puntos-de-control-y-ubicación-paso-9)); las fotos son los demás puntos |
| Postulación del paseador, casillas, notas del equipo, casos y disputas | **Base** desde el paso 7b ([ver abajo](#postulaciones-y-casos-en-el-servidor-paso-7b)); la foto del postulante sigue en su teléfono |
| Memoria del motor de avisos de ubicación (`vigilancia`) y permiso de ubicación | **Teléfono, siempre.** Nunca suben |
| Memoria del motor de avisos de ubicación (`vigilancia`, permiso, puntos) | **Teléfono** (aparte, para que no se pierda al recargar) |
| Foto de hoy del paseador, reseñas, favoritos, cuenta de demostración | **Teléfono** |

**Privacidad:** esto sube a un servidor de un tercero la dirección y el punto de recojo de la casa, el contacto de emergencia, la ficha del perro y el nombre de pila de dueño y paseador. `lib/legal.ts` y la privacidad **todavía dicen «solo en el teléfono»**: se corrigen en el paso 10, con el abogado. **Hasta entonces, no usarlo con familias reales.**

### Probarlo con dos cuentas (sin tocar nada más)

1. Cuenta de **familia**: se registra, confirma el correo y completa «Cuéntanos de ti» (casa y perro).
2. Cuenta de **paseador**: se registra y confirma el correo (rol «paseador»).
3. **Desde el paso 7b `/admin` ya aprueba** al paseador (ve su postulación enviada, el equipo marca las cinco casillas y decide). Solo si quieres saltarte la postulación en una prueba, una persona del equipo puede aprobarlo **a mano** en el editor de SQL. Cambia `<id del paseador>` por su UID (Authentication → Users) y la tarifa `rate` tiene que estar entre 16 y 34:

   ```sql
   insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, distrito, carrera, ciclo, perfil)
   values ('<id del paseador>', 'PAT-PRUEBA', 'activo', 'Nombre', 'Apellido', 'San Isidro', 'Psicología', '5to ciclo',
     '{"rate": 22, "sizes": ["small","medium","large"], "times": ["Mañana (6–12)","Tarde (12–18)"], "spots": ["olivar"], "includes": ["Agua y bolsas"], "style": ["Tranquilo"], "experience": "Tengo perro", "bio": "Estudio en el barrio."}'::jsonb);
   insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen)
   values ('<id del paseador>', true, true, true, true, true);
   insert into public.cobros_paseador (paseador_id, metodo, celular, titular)
   values ('<id del paseador>', 'yape', '987654321', 'Nombre Apellido');
   insert into public.datos_dni (paseador_id, dni) values ('<id del paseador>', '12345678');
   ```

   Solo con las **cinco casillas** y el **cobro** aparece en la lista de las familias (`paseadores_publicos`). Su app lo detecta sola en unos 20 segundos y le muestra «Hoy».
4. La familia ve al paseador en «Explorar», pide un paseo; el paseador lo ve en SU teléfono (en unos 5 segundos), acepta o rechaza, y la familia ve el cambio.

### Cómo funciona (corto)

- **Leer:** cada pocos segundos (5, con la pantalla visible y al volver a la pestaña) la app pregunta qué hay de nuevo. No se usa Realtime: no pide nada en Supabase.
- **Cambiar:** cada cambio de estado va como «pasa a X **solo si todavía está en Y**». La base decide con sus reglas (`transiciones_paseo`): si ya no corresponde, **lo rechaza** y la app dice «Ese cambio ya no se pudo hacer. El paseo cambió y ya lo actualizamos» y muestra lo que dice la base. Lo que hace «el sistema» (vencer la solicitud, cerrar) y pierde una carrera no avisa a nadie.
- **Sin internet:** lo hecho se queda en la pantalla y se reintenta solo; sale el aviso «Sin conexión con el servidor» con «Reintentar». **Pedir un paseo no se «encola»:** si no llegó, la hoja de reserva explica y se puede volver a intentar sin perder lo elegido.
- **Pedir un paseo:** guarda la casa, el perro, el paseo y el código (4 pasos seguidos). Si se corta entre el paseo y el código, ver «Propuestas».

### Lo que la base NO comprueba (hechos, probados en `tests/database/paseos_limites.test.sql`)

| Qué | Quién lo cuida hoy |
|---|---|
| **Plazo para aceptar** (`minutosParaAceptar`): una solicitud de hace 5 horas se acepta igual | Solo la app (vence sola mientras alguna app esté abierta) |
| **Orden del código de recojo:** se puede «recoger» y «entregar» sin haber comprobado el código | Solo la app (`entregaPideCodigo`) |
| **Montos:** solo se exige que `monto = comisión + neto`; cualquier cifra que sume pasa | La app los calcula con `lib/config.ts`; el equipo confirma el pago real a mano |
| **Cupo y tamaños:** dos paseos a la misma hora, o más perros de la cuenta | Nadie (con datos reales no hay agenda; ver «Pendiente» abajo) |
| ~~**Otros campos del paseo** (horario, duración, reserva, resumen del perro) después de crearlo~~ | **Cerrado el 15 de octubre (parte 3d):** la base los congela para la familia y el paseador |
| ~~**El reporte:** cualquiera de los dos puede reescribir el del otro~~ | **Cerrado el 15 de octubre (parte 3d):** se escribe una vez, al pasar a «en disputa», y lo firma quien lo envía |
| ~~**De quién es el perro:** un paseo puede apuntar al perro de OTRA familia~~ | **Cerrado el 15 de octubre (parte 3d):** el perro tiene que ser de la familia que pide |
| **La nota de cada paso** (`nota`, `demo`) no se guarda en `paseo_eventos` (el disparador solo anota quién y cuándo) | Se pierde al recargar; las notas del equipo irán a `casos` (paso 7) |
| **El código bloqueado** (5 fallos) devuelve igual «false» que el equivocado | La app dice «quizá se bloqueó» tras 3 fallos; lo reinicia el equipo en el editor de SQL |

### Propuestas (sin decidir; ninguna está escrita como migración)

1. `crear_paseo(...)`: una función que cree el paseo y su código en una sola operación (hoy son dos pasos; si se corta en medio, el paseo queda sin código).
2. Un disparador que rechace «aceptar» pasado `minutosParaAceptar`, y otro que exija haber comprobado el código antes de «recoger» (guardar la hora de la última comprobación correcta).
3. ~~Proteger lo que no debe cambiar después de crear el paseo (horario, duración, reserva, perro) y comprobar que `perro_id` es de esa familia.~~ **Hecho en la parte 3d** (migración de integridad).
4. `verificar_codigo_recojo` que devuelva el motivo («incorrecto», «bloqueado», «no corresponde»).
5. Una columna para «la familia cerró este paseo» (hoy se recuerda solo en su teléfono).
6. Guardar la nota de cada paso en `paseo_eventos`.
7. Si algún día se quiere Realtime: `alter publication supabase_realtime add table public.paseos, public.paseo_eventos, public.bitacora;` (las reglas de acceso aplican igual).

### Qué NO se pudo probar contra el Supabase real

No se hizo ninguna llamada al proyecto real, no se creó ninguna cuenta ni paseo. Sin probar contra el real: el inicio de sesión y los roles de verdad; que el SQL aplicado en el panel sea idéntico al de `migrations/`; los códigos y mensajes de error reales de PostgREST (el simulado los imita); CORS, HTTPS y tiempos de verdad desde Vercel; el sondeo con dos celulares reales (batería, pestaña en segundo plano, Safari); el aviso cuando el paseador queda aprobado con su cuenta real; y el límite de 20 segundos por petición con una conexión lenta de verdad.

## Chat y avisos de zona entre dos teléfonos (paso 6b)

**Qué es:** con `NEXT_PUBLIC_DATOS=servidor` y una sesión abierta, el **chat** de cada paseo vive en la tabla `mensajes` y los **avisos de zona** (los que calcula el teléfono del paseador) llegan a la familia por `paseo_eventos`. **No hizo falta ningún cambio de SQL: no hay migración nueva** (las reglas de `mensajes` y `paseo_eventos` ya estaban aplicadas). Sin servidor, o en la demostración, todo sigue en el teléfono como siempre, con sus respuestas de ejemplo.

### Cómo funciona (corto)

- **Quién lee y quién escribe** (probado en `tests/database/mensajes_servidor.test.sql`, 35 pruebas): solo la familia y el paseador **de ese paseo** (y el equipo, solo para leer). La familia escribe como «owner» y el paseador como «walker»; nadie escribe «como» el otro, ni en un paseo ajeno, ni sin sesión. Los mensajes no se cambian ni se borran.
- **Leer:** el mismo sondeo de cada 5 segundos del paso 6a (pantalla visible y al volver a la pestaña). No se usa Realtime.
- **Enviar y reintentar sin duplicar:** cada mensaje lleva un `id` propio (`crypto.randomUUID`). Sin internet, el mensaje se ve en la pantalla de quien lo escribió, la hoja del chat dice «Sin conexión con el servidor» y se envía solo al volver. Si el mensaje ya había llegado (se perdió la respuesta), la base lo reconoce por su `id` y no lo duplica.
- **Fotos en el chat:** todavía no. Con servidor el chat es solo texto y lo dice («Por ahora aquí solo se escribe»); las fotos del paseo siguen en «Paseo». La tabla ya tiene `imagen_ruta`; llega con el paso 8 (fotos).
- **«Activo hace…» (en lugar de «Conectado»):** la base **no sabe cuándo alguien abrió la app**; solo sabe lo que cada persona **hizo**: sus mensajes y sus cambios del paseo (aceptar, salir, recoger, entregar…). Por eso el chat dice «Activo hace 3 min» a partir de eso, hasta una hora, y **si no se sabe, no dice nada**. Nunca dice «en línea». La hora de lo que hizo la otra persona la pone la base; la de ahora es la del teléfono, así que un reloj mal puesto corre el «hace cuánto». En la barra del paseador, «Conectado» ahora refleja la conexión real con el servidor («Conectando…» o «Sin conexión»).
- **Avisos de zona:** el teléfono del paseador mide (con la pantalla encendida y con su permiso) y deja el **aviso** en `paseo_eventos` (acción `avisar`, tipo y nota); la familia lo ve en «Paseo» en el siguiente sondeo. Es la misma regla de la 6a: solo «el sistema» deja avisos y solo los dos del paseo. **No se sube ninguna ubicación** (ni siquiera en la nota): probado que ninguna fila trae coordenadas. La memoria del motor de avisos y los puntos de control siguen solo en el teléfono (paso 9).
- **Sin respuestas simuladas:** con servidor ya no hay «respuesta automática» del paseador, ni «Simular que acepta», ni mensajes de ejemplo. El paseador de ejemplo y la demostración siguen locales, como antes.

### Lo que la base NO comprueba (hechos, probados en `tests/database/mensajes_servidor.test.sql`)

| Qué | Quién lo cuida hoy |
|---|---|
| ~~**El largo del mensaje:** la base acepta 5.000 caracteres~~ | **Cerrado el 15 de octubre (parte 3d):** la base acepta hasta 1.000 letras (la app corta en 500) |
| **El estado del paseo:** se puede escribir con el paseo cancelado, rechazado o cerrado, y el paseador puede escribir antes de aceptar | Nadie (la app deja el chat abierto mientras el paseo está visible) |
| **El ritmo:** no hay límite de mensajes por minuto | Nadie |
| **Lo que se escribe:** un mensaje puede contener un celular o un correo (el filtro anti-fuga del chat está en «Para después») | Nadie |

### Decisiones del equipo (sin decidir; nada de esto está escrito como migración)

1. **«Conectado» de verdad (que la otra persona abrió la app hace poco).** Hoy no existe en la base. Opción más simple: una tabla `presencia (paseo_id, quien, visto_en)` con una fila por lado, que cada app actualiza cada ~30 s mientras está abierta y el otro lado lee en el mismo sondeo; con reglas como las de `mensajes` (solo los dos del paseo, cada uno escribe su fila). **Es una decisión de privacidad** (registra cuándo usa la app cada persona) y habría que decirlo en los textos legales (paso 10). Mientras no se decida, el chat dice solo «Activo hace…» cuando se sabe.
2. **¿La familia debe ver todos los avisos de zona?** Hoy ve los seis tipos (borde, salida, regreso, salto, quieto, sin ubicación), igual que en la demostración, y el equipo también. Un aviso «quieto» o «sin ubicación» puede alarmar o dejar mal parado al paseador (el GPS falla). Es una decisión de negocio: ¿todos, solo los de alerta, o primero al equipo?
3. **Ritmo y estado del chat:** cerrar el chat cuando el paseo termina o se cancela, y un límite de mensajes por minuto. (El tope de largo ya está: 1.000 letras desde la parte 3d.) Cambian lo que el equipo ve como «el chat siempre abierto».

### Qué NO se pudo probar contra el Supabase real

No se hizo ninguna llamada al proyecto real, no se creó ninguna cuenta, paseo ni mensaje. Sin probar contra el real: el chat entre **dos celulares de verdad** (Safari en segundo plano, batería, conexión lenta o que se corta a la mitad de un envío); que las reglas aplicadas en el panel sean idénticas a las de `migrations/` (las pruebas corren sobre las migraciones, no sobre el proyecto); los códigos de error reales de PostgREST para un mensaje repetido (el simulado devuelve `23505`, como Postgres); y los avisos de zona con un GPS real (en el navegador de prueba la posición se movió a mano).

## Pagos en el servidor (paso 7)

**Qué es:** con `NEXT_PUBLIC_DATOS=servidor` y una sesión abierta, el **libro de pagos** vive en la tabla `pagos` y **dónde cobra cada paseador** (Yape o Plin) en `cobros_paseador`, con la sesión de cada persona (nunca con la clave de servicio). **No hizo falta ningún cambio de SQL: no hay migración nueva.** Sin servidor, o en la demostración, todo sigue en el teléfono como siempre. **La app no mueve dinero:** esto es solo el registro de en qué va cada pago.

### Cómo funciona (corto)

- **El pago nace solo:** al crear el paseo, el disparador de la base crea su pago («sin_pagar», con la foto de los montos) y, cuando el paseo avanza, lo mantiene al día (`paseo_estado`, y `hecho_en` = desde cuándo corre el plazo). La app **no** crea ni edita pagos: la base no se lo permite (`revoke insert, update, delete`). Con servidor, `useSincronizarPago` no hace nada.
- **Quién ve qué** (probado en `tests/database/pagos_servidor.test.sql`, 64 pruebas): la familia, los pagos de sus paseos; el paseador, los suyos; el equipo, todos; **sin sesión, nada**. El Yape o Plin del paseador lo ven solo él y el equipo: la familia no recibe ninguno (ni el de su paseador) y un paseador no ve el de otro.
- **Las acciones pasan por `public.mover_pago`**, que valida con `transiciones_pago` (copia de `lib/pagos.ts`): «Vi el pago» solo el paseador de ese paseo, con el paseo entregado o cerrado; «No lo encuentro» (con nota de al menos 3 letras) y «Pagado al paseador» solo el equipo. **El paseador no puede marcarse «pagado».** Una acción inválida vuelve como un texto claro y no rompe la pantalla.
- **Nada se marca sin la respuesta de la base:** la pantalla espera a que `mover_pago` conteste. Sin internet la acción queda en una cola **en memoria**, se reintenta sola, un doble toque es una sola acción y, si la base ya la había recibido (se perdió la respuesta), el reintento se da por hecho sin repetirla. **Si se cierra la app antes de que llegue, la acción no se envía** (a propósito: una acción de dinero no debe enviarse sola horas después); el botón sigue disponible.
- **Dónde cobra el paseador:** lo sube él mismo (solo su fila, con el celular en formato `+51…`) cuando completa o cambia su Yape o Plin. `/admin` lo lee de la base para decir a dónde pagarle; sin ese dato, «Marcar pagado» queda apagado.
- **`/admin` «Por pagar al paseador»** lee los pagos de la base (solo con rol «equipo», comprobado en la base) con las mismas acciones y la nota de «No lo encuentro».
- **Hallazgo del 6a, resuelto:** antes, la familia que terminaba un paseo no podía pedir otro porque el «visto» vivía en el teléfono del paseador. Ahora «Paga tu paseo» se levanta cuando la base dice que el paseador tocó «Vi el pago».

### Qué cuida la base y qué solo la app

| Regla | Quién la cuida hoy |
|---|---|
| Quién ve cada pago y el Yape o Plin del paseador | **La base** (reglas de fila) |
| Quién mueve cada acción, el orden de los estados, que «Vi el pago» y «Pagado» solo se puedan con el paseo entregado o cerrado, la nota obligatoria | **La base** (`mover_pago`) |
| Que nadie edite ni borre pagos a mano | **La base** (permisos) |
| El **plazo de 24 h** (`horasParaPagar`) | **Solo la app**, y es un recordatorio: pasados 30 días la base todavía acepta «Vi el pago» |
| **Bloquear pedir otro paseo** mientras haya un pago pendiente | **La base** desde la parte 3d (un disparador en `paseos`, con el mismo criterio de `pagoPendiente`) y la app, que lo frena antes en la pantalla |
| Que la plata llegó de verdad a la cuenta del equipo | **Nadie por software:** el equipo lo confirma a mano |
| **Qué persona del equipo** marcó cada pago | **La base** desde la parte 3d: `pagos.marcado_por`, lo llena `mover_pago` en «No lo encuentro» y «Pagado al paseador» |
| La hora que anota el paseador | Nadie: es texto libre de hasta 20 letras |

Cada fila de «solo la app» o «nadie» está demostrada en `tests/database/pagos_limites.test.sql`; el bloqueo y `marcado_por` están en `tests/database/integridad.test.sql`.

### Propuestas (sin decidir; ninguna está escrita como migración)

1. ~~**Bloquear en la base** crear un paseo si la familia tiene un pago entregado y sin pagar.~~ **Hecho en la parte 3d.**
2. ~~**`marcado_por`:** una columna en `pagos` para saber quién del equipo marcó cada pago.~~ **Hecho en la parte 3d** (la columna existe y se llena sola; `/admin` todavía no la muestra).
3. ~~**Casos en el servidor**~~ **Hecho en el paso 7b:** la cola de casos de `/admin` sale de la tabla `casos` (ver [«Postulaciones y casos»](#postulaciones-y-casos-en-el-servidor-paso-7b)).

### Qué NO se pudo probar contra el Supabase real

No se hizo ninguna llamada al proyecto real, no se creó ninguna cuenta, paseo ni pago. Sin probar contra el real: el recorrido con tres teléfonos de verdad (familia, paseador y equipo); que las reglas aplicadas en el panel sean idénticas a las de `migrations/`; los códigos y mensajes de error reales de PostgREST para `mover_pago` (el simulado devuelve `42501`, `22023` y `P0002`, como Postgres); cortes de internet reales a mitad de un envío; y Safari en segundo plano.

## Fotos en el almacén privado (paso 8)

**Qué es:** con `NEXT_PUBLIC_DATOS=servidor` y una sesión abierta, las **fotos del paseo** y la **foto de hoy** del paseador viajan al **almacén privado `fotos`** (los bytes) y a la tabla `fotos` (hora, lugar y código de 2 dígitos), con la sesión de cada persona (nunca con la clave de servicio). Sin servidor, o en la demostración, todo sigue en el teléfono como siempre. Las fotos son **señales, no pruebas**: la hora y el lugar los pone el teléfono y se pueden alterar.

> **Hay una migración nueva, sin aplicar:** `migrations/20261014130000_fotos_paso_8.sql`. **La aplica una persona del equipo, aparte de las tres primeras**, antes de probar fotos con el Supabase real. Sin ella: cambiar la foto de hoy el mismo día deja la imagen anterior sin borrar, y la base no comprueba que la ruta sea la del paseo.

### Cómo funciona (corto)

- **La foto queda PRIMERO en el teléfono** (los bytes en IndexedDB y los datos en la lista de fotos de siempre) y **de ahí sale sola**: primero la imagen al almacén y después sus datos a la tabla, así la familia nunca ve una foto cuya imagen todavía no llegó. Qué falta enviar se calcula comparando lo que hay en el teléfono con lo que la base ya tiene; cada foto lleva siempre el **mismo id** (sale de su id local), por eso un reintento no la duplica.
- **Sin internet:** la foto queda en el teléfono (la paseadora la sigue viendo) con la marca «Sin enviar» y el aviso «Se envía sola cuando haya internet». **Si se cierra la app, la foto sigue ahí** (datos y bytes) y sale al volver a abrirla con internet, una sola vez. Si la respuesta de la base se pierde (la foto sí llegó), la base lo reconoce («ya estaba») y no la repite.
- **Quién sube y quién ve** (probado en `tests/database/fotos_servidor.test.sql`, 69 pruebas): solo la paseadora de ese paseo sube a `paseo/<paseo>/…` y solo la paseadora a su carpeta `hoy/<su id>/…`. Las ven **la familia del paseo, la paseadora y el equipo**; otra familia u otro paseador, **no**; **sin sesión, no se ve nada** (ni la tabla ni el almacén). La foto de hoy la ve la familia con un paseo **aceptado** (o más avanzado) con esa paseadora, la propia paseadora y el equipo.
- **Enlaces que vencen:** la imagen no tiene dirección pública. La app pide un enlace firmado por **2 minutos** (y lo reutiliza hasta 30 segundos antes de que venza). Con la sesión de otra persona, el enlace no se entrega.
- **Tope de 1 MB:** el almacén solo recibe hasta 1 MB y solo `image/jpeg`, `image/png` o `image/webp` (lo hace cumplir la API de Storage; la migración lo declara y hay una prueba que lo compara con la constante de la app). La cámara de la app ya deja cada foto en 160 KB como máximo (`pesoMaximoFotoKB`). Una foto de más de 1 MB **ni se intenta**: queda marcada («Esta foto pesa demasiado para enviarla. Saca otra.») y no se reintenta. El tope de **12 fotos por paseo** (`maxFotosPorPaseo`) lo cuida la app.
- **Una lectura de ubicación vieja** (más de `minutosUbicacionVieja` minutos antes de la foto) **no se sube como lugar de la foto**: la base no guarda la hora de la lectura y mostrarla sin la advertencia «Ubicación de hace N min» sería engañar. Se anota «sin lectura». La ubicación de demostración nunca sube.
- **La foto de hoy** (`lib/selfie.ts`) usa las mismas reglas y la misma tabla (`tipo = 'hoy'`, una por día). **No es una comprobación** y **no está en `lib/verificacion.ts`**: la familia ve «Foto de hoy, hora» o «Sin foto de hoy». Si la paseadora toma otra el mismo día, la app sube la nueva, **borra primero la imagen anterior y después su fila** y guarda la nueva (hay un instante en que la familia puede ver «Sin foto de hoy»). El orden importa: Storage solo deja borrar lo que la persona también puede ver, y la imagen se ve por su fila.
- **Al empezar otro paseo**, la app suelta las fotos viejas del teléfono para liberar espacio, **salvo las que todavía no se enviaron**.

### Qué cuida la base y qué solo la app

| Regla | Quién la cuida hoy |
|---|---|
| Quién sube, quién ve y quién borra (datos e imágenes) | **La base** (reglas de fila y del almacén) |
| Que la ruta de la imagen sea la de su paseo o su carpeta | **La base** (`fotos_ruta_coincide`, migración nueva) |
| Una foto de hoy por día | **La base** (índice único) |
| Tope de 1 MB y solo imágenes | **El almacén** (API de Storage) y la app (no intenta subir más) |
| **12 fotos por paseo** | **Solo la app**: la base deja guardar 13 |
| Que el peso anotado (`bytes`) no pase de 1 MB | **La base** desde la parte 3d (`fotos_peso_posible`); que sea el del archivo, nadie |
| La hora, el lugar y el código de 2 dígitos | **El teléfono**: la base solo exige que la coordenada exista (`fotos_lugar_posible`); no comprueba la hora, que sea Lima ni el código (la app compara el código y dice «Fuera de la zona»; son señales) |
| Que la fila tenga su imagen | Solo el orden de la app (primero la imagen, después la fila); si falta, la pantalla dice «No se pudo cargar la foto» |

Cada fila de «solo la app» o «nadie» está demostrada en `tests/database/fotos_limites.test.sql`.

### Borrado a los 7 días

`fotos_para_borrar` entrega las fotos vencidas **salvo las de un paseo con un caso abierto o en disputa** (se conservan hasta que se cierre): probado en `tests/database/fotos_borrado.test.sql` (15 pruebas). **El borrado sigue siendo a mano:** hay que correr `scripts/borrar_fotos_vencidas.mjs` (por ejemplo una vez por semana, con `--hacerlo`); la clave de servicio solo va en la terminal. **No se verificó** que se pueda programar solo en el plan gratis.

### Imágenes del chat (límite conocido y salida propuesta)

**El chat con servidor sigue siendo solo texto** (no hizo falta subir imágenes para este paso: las fotos del paseo van en «Paseo»). Las reglas del almacén ya permiten imágenes del chat en `chat/<paseo>/<mensaje>.jpg` solo a los dos del paseo (probado: la familia B y otro paseador no suben ni ven), pero **esas imágenes no tienen fila en `fotos` ni fecha de vencimiento, así que `scripts/borrar_fotos_vencidas.mjs` NO las borra** (probado en `fotos_limites.test.sql`). Si algún día el chat lleva imágenes, quedarían guardadas para siempre.

**Salida más simple que propongo (sin decidir):** **no activar imágenes en el chat durante el piloto** (es lo que pasa hoy: cero trabajo y cero riesgo). Si el equipo las quiere después: una función `chat_imagenes_para_borrar()` igual a `fotos_para_borrar()` que mire `mensajes.imagen_ruta` con 7 días desde `mensajes.en` y que el mismo script la use (una migración chica y 10 líneas de script). Otra salida, más pesada: una fila en `fotos` por cada imagen del chat (`tipo = 'chat'`).

### Qué NO se pudo probar contra el Supabase real

No se hizo ninguna llamada al proyecto real, no se subió ninguna imagen ni se creó ninguna cuenta. Sin probar contra el real: que la **API de Storage** se comporte igual que `almacen_simulado.mjs` (los códigos HTTP reales del tamaño, el tipo, «ya existe» y las reglas del almacén; la simulación imita lo que dice la documentación); que **la política de borrado de la foto de hoy** funcione con el borrado real por la API; los **enlaces firmados reales** y su vencimiento; subidas desde un celular real (cámara, HTTPS, conexión lenta o cortada a la mitad de una subida, Safari en segundo plano, IndexedDB casi llena); y que `borrar_fotos_vencidas.mjs` se pueda correr contra el real.

## Puntos de control y ubicación (paso 9)

**Qué es:** con `NEXT_PUBLIC_DATOS=servidor` y una sesión abierta, el **inicio** y el **fin** del paseo con su ubicación viajan a la tabla `puntos_control` (los demás puntos de control son las **fotos**, que ya viajan en `fotos` con su lugar, paso 8). Así, inicio, cada foto y fin aparecen en los **dos teléfonos** (la familia y la paseadora). **No hizo falta ninguna migración nueva** (la tabla y sus reglas ya estaban aplicadas desde el paso 3). Sin servidor, o en la demostración, todo sigue en el teléfono como siempre. Son **señales**: la hora y el lugar los pone el teléfono y se pueden alterar.

### Cómo funciona (corto)

- **NO hay ubicación continua ni en vivo.** De la ubicación de la paseadora solo salen: el inicio, el fin y la ubicación de cada foto. **Nunca sube** `vigilancia` (la última lectura y lo reciente del motor de avisos) ni el estado del permiso: se quedan en su teléfono (probado: 25 lecturas seguidas y ninguna posición aparece en ninguna tabla). La base ni tiene dónde guardar un recorrido: `puntos_control` solo tiene hora, lugar, motivo y tipo, y los avisos de zona (`paseo_eventos`), la bitácora, el chat y los pagos no tienen columnas de ubicación.
- **El punto queda PRIMERO en el teléfono** (en los datos del paseo que ya se guardan ahí) y **de ahí sale solo**. Cada punto lleva siempre el **mismo id** (sale del paseo y el tipo): un reintento no lo duplica. **Sin internet** se queda en el teléfono y sale al volver; si se cierra la app, sigue ahí y sale al abrirla; si la respuesta de la base se pierde, la base lo reconoce y no lo repite. (Para que esto valga también sin internet, lo del teléfono se guarda **antes** de hablar con la base.)
- **Quién escribe:** solo **la paseadora de ese paseo** (probado: ni la familia, aunque sea del paseo, ni otro paseador, ni el equipo, ni sin sesión). **Quién ve la ubicación del paseo:** la familia del paseo, la paseadora y el equipo; la familia B, otro paseador y quien no tiene sesión, **no** (31 pruebas en `tests/database/puntos_servidor.test.sql`). Nadie edita ni borra un punto desde la app.
- **Sin ubicación se anota el motivo, como hoy** (`negada`, `omitida`, `no_disponible` o `sin_lectura`): la familia ve «Sin ubicación» y por qué. Nunca se muestran coordenadas, solo «En San Isidro, cerca de…». Una lectura de más de `minutosUbicacionVieja` minutos o de demostración no se sube como lugar (igual que en las fotos).
- **Los avisos de zona** (borde, salida, regreso, salto, quieto, sin ubicación) siguen viajando aparte por `paseo_eventos`, **sin coordenadas** (paso 6b).
- **La hoja «Tu ubicación durante el paseo»** (antes del permiso) ahora dice la verdad con servidor: «Solo esos puntos se envían. No se guarda tu recorrido.» y «Los ven la familia del paseo y el equipo.». Antes decía que la ubicación «se queda en este teléfono»: con servidor ya no es cierto.

### Qué cuida la base y qué solo la app

| Regla | Quién la cuida hoy |
|---|---|
| Quién anota y quién ve el inicio y el fin | **La base** (reglas de fila) |
| Que solo haya «inicio» o «fin» y que el motivo sea uno de los conocidos | **La base** |
| Que un punto no se edite ni se borre | **La base** |
| **Un solo inicio y un solo fin por paseo** | **La base** desde la parte 3d (índice único `(paseo_id, tipo)`) y la app (con el id fijo de cada punto) |
| Que el «fin» llegue con el paseo ya en marcha | Nadie: la base no mira el estado del paseo |
| Que haya ubicación o motivo, y que la coordenada exista | **La base** desde la parte 3d |
| La hora y que el lugar sea el real | **El teléfono**: la base no los comprueba (son señales) |
| **Que `paseos.vigilancia` y `paseos.ubicacion` no se escriban** | **La base** desde la parte 3d (el trigger del paseo lo rechaza para la familia y el paseador); la app nunca lo sube |

### Propuestas (sin decidir; ninguna está escrita como migración)

1. ~~Un índice único `(paseo_id, tipo)` en `puntos_control`.~~ **Hecho en la parte 3d.**
2. ~~Quitar a la paseadora el permiso de escribir las columnas `vigilancia` y `ubicacion` de `paseos`.~~ **Hecho en la parte 3d.**

### Qué NO se pudo probar contra el Supabase real

No se hizo ninguna llamada al proyecto real ni se anotó ningún punto. Sin probar contra el real: que las reglas aplicadas en el panel sean idénticas a las de `migrations/`; el GPS de un celular real (en el navegador de prueba la posición se fijó a mano); permisos de ubicación reales (negado, «solo esta vez», ubicación aproximada); la conexión cortada a mitad de un envío; y Safari en segundo plano.

## Postulaciones y casos en el servidor (paso 7b)

**Qué es:** con `NEXT_PUBLIC_DATOS=servidor` y una sesión abierta, la **postulación del paseador**, las **decisiones del equipo** y los **casos y disputas** viven en la base. Sin servidor, o en la demostración, todo sigue en el teléfono como siempre. **Hay dos migraciones nuevas, sin aplicar** (ver la tabla de arriba); la aplica una persona del equipo, aparte de las anteriores. Todo se probó con servidores simulados y con las migraciones reales en PGlite; **nada contra el Supabase real**.

### Postulaciones

- **El paseador** escribe su postulación como siempre (queda primero en su teléfono). **Solo cuando está COMPLETA y enviada** sale a la tabla `postulaciones` (los borradores NO suben: no hay consentimiento aceptado todavía). Su DNI va aparte, por `guardar_dni`. La postulación sale sola, sin duplicar, y si no hay internet reintenta (un aviso dice «Tu postulación todavía no llegó al equipo»). La foto del postulante **no sube** (se queda en su teléfono).
- **El estado «enviada» solo viaja mientras la base deja cambiarlo** (sin fila, borrador o enviada). Si el equipo ya la aprobó o rechazó, los cambios del paseador (su perfil, su tarifa) se guardan pero el estado no se toca.
- **El paseador ve su estado REAL:** en revisión, aprobada o rechazada, y sus casillas, leídos de la base cada 20 segundos. Las **notas internas del equipo nunca le llegan** (van a `notas_revision`, que solo lee el equipo). Si abre la app en otro teléfono, su postulación se arma con lo que guardó en la base (menos el DNI, que ya no puede volver a leer: lo vuelve a escribir).
- **El equipo** en `/admin` ve la lista de postulaciones enviadas (con su DNI completo, su celular y dónde cobra), marca las cinco casillas, cambia el estado y deja sus notas. Cada decisión se guarda **primero casillas, luego estado, al final la nota**: si falla a la mitad, nunca queda «aprobada» sin sus casillas. Si la base NO lo guarda, el panel lo avisa y vuelve a lo que dice la base: **nada figura como hecho sin que la base lo confirme**.
- **«Aprobado» sigue saliendo solo con las cinco casillas:** la app aplica `estadoVisible` a lo que trae la base, y la vista pública `paseadores_publicos` exige las cinco casillas **y** el cobro registrado (probado: con cuatro casillas la base guarda «aprobada» pero la app la muestra en revisión y la vista no la entrega).
- **Quién escribe qué:** el paseador crea y edita SOLO su postulación (nunca otro paseador), no cambia su estado más que entre borrador y enviada, ni los paseos acompañados, ni su código, ni las casillas, ni las notas. La familia no ve ninguna. El equipo ve todas y lo decide todo. 28 pruebas SQL + 13 escenarios con el cliente de Supabase real por HTTP.

### Casos y disputas

- La familia o el paseador de un paseo abren un caso en SU paseo (un reporte, o una entrega sin confirmar); el equipo ve todos, abre los de pago y es el **único que los resuelve**. Cada uno ve los de su paseo; **la familia B no ve los de A**. 21 pruebas SQL + 18 escenarios (3 servidores).
- El caso tiene siempre el mismo `id` (`<tipo>-<paseo>`): abrirlo dos veces es **uno solo**; sin internet espera en el teléfono y sale al volver. **La foto del reporte no sube** (se queda en el teléfono de quien reportó).
- Al **resolver** (cerrar o anular el paseo) el equipo mueve el paseo **de ese caso** (antes solo podía el último): la base lo hace con dos llamadas (el caso y el paseo), la app las manda juntas.

### Qué cuida la base y qué solo la app

| Regla | Quién la cuida hoy |
|---|---|
| Quién escribe y quién ve postulaciones, casillas, notas y casos | **La base** (reglas de fila; 28 + 21 pruebas) |
| Que el paseador no se apruebe solo ni cambie lo que decide el equipo | **La base** |
| Que las notas internas no las lea el postulante | **La base** (`notas_revision`, migración nueva) |
| Que solo el equipo resuelva un caso | **La base** |
| Aprobado solo con las cinco casillas y el cobro | **La vista pública** y la app (`estadoVisible`); la base deja guardar «aprobada» sin casillas (`postulaciones_limites`) |
| Que la postulación esté completa antes de enviarla | **Solo la app** (la base deja enviar una vacía) |
| El mismo DNI en dos cuentas | **Nadie** (la base lo deja; lo revisa el equipo en la videollamada) |
| Que los datos de un caso (perro, monto, estado del paseo) sean los del paseo al abrirlo | **Nadie**: los pone quien lo abre; el equipo debe mirar el paseo (`casos_limites`). **Después de abierto no se cambian** (la base, desde la parte 3d), y el reporte se hace una vez |
| Que el paseador no se ponga solo paseos acompañados ni notas del equipo al crear su postulación | **La base** desde la parte 3d (la política de crear exige 0 y vacío) |
| Que resolver un caso mueva el paseo | **Solo la app** (dos llamadas separadas) |

### Propuestas (sin decidir; ninguna está escrita como migración)

1. Que la base compare el caso con el paseo (perro, monto, estado) al abrirlo. (Que `registro`/`monto` no se cambien después ya quedó hecho en la parte 3d.)
2. Un disparador que, al resolver un caso, mueva el paseo en la misma operación.
3. Un índice único del DNI (con cuidado: es un dato personal que el equipo ya lee).
4. Subir la foto del postulante al almacén privado (hoy se queda en su teléfono, así que `/admin` dice «Sin foto» y las familias no ven su foto).

### Qué NO se pudo probar contra el Supabase real

Nada se probó contra el real: ni que las migraciones nuevas se apliquen como en PGlite, ni las reglas de fila en el panel, ni la API de Storage del script de borrado de imágenes del chat, ni un celular real. Tampoco el aviso «sin conexión» con una conexión de verdad cortada a mitad de un envío.

## Borrar mi cuenta (parte 3a)

**Qué es:** con `NEXT_PUBLIC_DATOS=servidor` y una sesión abierta, la familia (en **Perfil → Borrar mi cuenta**) y el paseador (en **Mi perfil → Borrar mi cuenta y mis datos**, o en «En revisión» → **Retirar mi postulación y borrar mi cuenta**) pueden borrar su cuenta. Sin servidor, o en la demostración, no cambia nada. **Hay una migración nueva, sin aplicar** (`20261015110000_borrar_mi_cuenta.sql`); se aplica DESPUÉS de las otras (ver el orden en `docs/AVANCE.md`).

### Cuándo se niega (y no borra nada)

La base contesta «no» con un motivo (no es un error) y la pantalla lo dice con una frase corta:

| Motivo | Cuándo | Qué ve la persona |
|---|---|---|
| `paseo_pendiente` | Un paseo pedido, aceptado, en camino, paseando o entregado sin cerrar | «Tienes un paseo pendiente. Termínalo o cancélalo antes de borrar tu cuenta.» |
| `reporte_abierto` | Un paseo en disputa o un caso sin resolver | «Tienes un reporte abierto. Cuando el equipo lo cierre, podrás borrar tu cuenta.» |
| `pago_pendiente` | Un paseo terminado cuyo pago no se completó: la **familia** que todavía no mostró el pago (o que el equipo no encontró); el **paseador** al que el equipo todavía no le pagó | «Tienes un pago pendiente. Cuando se complete, podrás borrar tu cuenta.» |
| `equipo` | La cuenta del equipo | «La cuenta del equipo no se borra desde la app.» |

Solo da error de verdad si no hay sesión («Entra a tu cuenta para borrarla.») o la cuenta ya no existe (la app lo cuenta como hecho: se puede pedir otra vez sin miedo).

### Qué se borra y qué queda

- **Se borra:** la cuenta y el correo de acceso, el perfil, los datos personales (apellido, celular), la casa y el contacto de emergencia, los perros, la postulación con su DNI, sus casillas y las notas del equipo, dónde cobra, las **filas** de las fotos, el chat, la bitácora, las ubicaciones y los códigos de recojo de sus paseos, y las **reseñas** (las que escribió la familia y las que le hicieron al paseador: se van en cadena con la cuenta, ver [Reseñas](#reseñas-parte-3b)). Un paseo que nunca se hizo (cancelado, rechazado o vencido) y no tiene ningún caso se borra entero.
- **Queda (el registro del equipo), SIN el nombre de la persona:** los paseos ya terminados y su pago (para poder cuadrar cuentas con el paseador), y los reportes ya resueltos (sin la foto que puso la persona; **el texto queda y puede nombrarla**). El nombre pasa a decir «Cuenta borrada» y el paseo o el pago ya no apuntan a nadie.
- **Los archivos de las fotos** no se pueden borrar por SQL (Supabase pide la API): `borrar_mi_cuenta()` anota cada ruta en `archivos_por_borrar` y **`supabase/scripts/borrar_fotos_vencidas.mjs` borra el archivo** y la anotación (junto con las fotos vencidas; hay que correrlo a mano con la clave de servicio, como siempre). Hasta entonces el archivo existe pero **nadie puede leerlo** (la regla del almacén exige una fila visible en `fotos`).
- **En el teléfono:** la app borra lo guardado de esa cuenta (`clave@id`: cuenta, postulación, pagos…) y las fotos que quedaran aquí, y cierra la sesión de este teléfono sin avisar al servidor. Lo suelto del modo local y de la demostración no se toca.

### Qué cuida la base y qué solo la app

| Regla | Quién la cuida |
|---|---|
| Que no se borre con un paseo en marcha, un reporte abierto o un pago pendiente | **La base** (`borrar_mi_cuenta`, 92 pruebas SQL + 5 escenarios con el cliente real) |
| Que todo sea de una sola vez (si algo falla, no se borra nada) | **La base** (una sola transacción) |
| Que nadie deje en blanco a otra persona en un paseo a mano | **La base** (`privado.paseo_cambia`: solo `borrar_mi_cuenta` puede, y solo para quien se va) |
| Que un pago sin paseador no lo mueva cualquiera | **La base** (`mover_pago` con `is distinct from`) |
| Que la lista de archivos por borrar no la lea nadie desde la app | **La base** (regla «nadie» + sin permisos) |
| La confirmación, el doble toque y limpiar el teléfono | **La app** |

### Decisión del equipo (sin decidir): cuánto tiempo se guarda el registro

Hoy los paseos terminados, sus pagos y los reportes resueltos **se guardan sin límite y sin el nombre**. Hay que decidir con un abogado y un contador: cuánto tiempo conviene guardar ese registro (por ejemplo, para cuadrar cuentas y resolver reclamos) y si después se borra. La otra salida es borrar TODO al borrar la cuenta, pero entonces se pierde el registro de lo que se pagó a cada paseador. **No se cambió nada de esto: es una decisión de negocio.**

### Probarlo con dos cuentas (sin tocar nada más)

1. Con el servidor de mentira (`node supabase/tests/servidor_simulado.mjs`) y la app apuntando a él, entra como una familia, abre **Perfil → Borrar mi cuenta** y confirma: vuelve a la portada y la cuenta ya no existe en la base.
2. Antes, pide un paseo con un paseador y no lo termines: al confirmar, la hoja dice «Tienes un paseo pendiente…» y no se borra nada.
3. Con un paseo terminado y pagado, borra: el paseo queda en `/admin` como «Cuenta borrada».

### Qué NO se pudo probar contra el Supabase real

- **Que Supabase deje borrar de `auth.users` desde esa función.** En PGlite `auth.users` es una tabla simple. En Supabase la función corre con el dueño del esquema `public` (`postgres`), que normalmente puede (es el patrón conocido de «borrar mi cuenta»). **Si al probar con una cuenta de prueba da «permission denied for table users» o un error de llave foránea de `storage`, avisa sin borrar nada a mano:** la función se deshace entera (no quedan cuentas a medias).
- La API de Storage del script (borrar los archivos de `archivos_por_borrar`).
- Un celular real ni una conexión que se corta justo al borrar (la app lo trata como «sin conexión» y al repetir cuenta como hecho).

## Reseñas (parte 3b)

**Qué es:** con `NEXT_PUBLIC_DATOS=servidor` y una sesión de familia, la reseña que se escribe al terminar un paseo («¿Cómo le fue a Max?») vive en la base y la calificación de cada paseador sale de esas reseñas. Sin servidor, o en la demostración, las reseñas siguen en la cuenta de este teléfono como siempre (y los paseadores de ejemplo conservan su calificación de ejemplo, con la etiqueta «Ejemplo»). **Hay una migración nueva, sin aplicar** (`20261015120000_resenas.sql`), que va **después** de la de «borrar mi cuenta».

### Cómo funciona (corto)

- La familia escribe su reseña en la hoja «Paseo cerrado» (o desde «Escribir reseña de…»). Queda en su teléfono y **sale sola** a la base; sin internet espera y sale al volver, **sin duplicarse**. Es **una por paseo** (el paseo es la llave): tocar «Publicar reseña» dos veces, o reintentar, es la misma.
- La base solo la acepta si el paseo **ya está cerrado**, es de **esa familia** y del **paseador de ese paseo** (probado). Si la subida del cierre y la de la reseña salen juntas y la base todavía no vio el cierre, la rechaza: la lista vuelve a lo que dice la base y la pantalla deja escribirla otra vez.
- **El nombre que se muestra («Valeria R.») y el distrito los pone la base**, no la app: nadie puede reseñar con el nombre de otra persona. Si la familia no dejó su distrito, no se inventa uno (se ve solo el nombre).
- **Quién la ve:** su autora, el paseador reseñado, el equipo y cualquier persona con sesión **mientras el paseador esté aprobado** (la reseña aparece en su tarjeta). **Nadie la edita ni la borra**: se va con la cuenta de quien la escribió o del paseador (en cadena).
- **La calificación** es el promedio de sus reseñas con una decimal y **solo se muestra si ya tiene al menos una**; si no, la tarjeta dice «Aún sin reseñas» (aunque ya haya terminado paseos: esos se cuentan aparte en `paseos_hechos`). La lista de paseadores se vuelve a leer cada minuto y justo después de publicar.
- En la tarjeta y en la hoja se cuenta en **«reseñas»** (no en «paseos») para los paseadores de la base.

### Qué cuida la base y qué solo la app

| Regla | Quién la cuida |
|---|---|
| Una por paseo, solo de un paseo cerrado, de su familia y su paseador | **La base** (`resenas`, 59 pruebas SQL + 18 escenarios con los tres servidores de prueba) |
| 1 a 5 estrellas, comentario de hasta 280 letras, hasta 8 etiquetas | **La base** (y la app recorta antes) |
| El nombre y el distrito de quien reseña | **La base** (disparador `privado.resena_nueva`) |
| Quién la ve (autora, paseador, equipo, y todos si está aprobado) | **La base** (regla de fila) |
| Que no se edite ni se borre | **La base** (solo se da permiso de leer y crear) |
| Que las etiquetas sean las que ofrece la app | **Solo la app** (la base acepta cualquier texto corto) |
| Que se escriba solo una vez en pantalla | **La app** (lo que ya tiene reseña muestra «Tu reseña está publicada») |

### Propuestas (sin decidir; ninguna está escrita como migración)

1. Que el paseador pueda **responder** o pedir que se revise una reseña (hoy no puede: solo la ve).
2. Que el equipo pueda **ocultar** una reseña injusta o abusiva (hoy solo se puede borrar a mano en el panel de SQL).
3. Mostrar la calificación en la app del paseador (hoy solo la ven las familias; en modo local tampoco existe).
4. Que la calificación mínima de 4,7 que exige la regla del negocio se compruebe sola (hoy nadie lo comprueba).

### Qué NO se pudo probar contra el Supabase real

Nada se probó contra el real: ni que la migración se aplique como en PGlite (en particular `create or replace view` sobre la vista ya aplicada), ni las reglas de fila en el panel, ni un celular real, ni la lista de paseadores con muchos comentarios (hoy pide hasta 200 reseñas de una vez: con el piloto sobra).

## Integridad (parte 3d)

**Qué es:** la migración `20261015130000_integridad.sql` (**sin aplicar**; se aplica después de las reseñas) cierra en la base cosas que hasta hoy solo cuidaba la app. **La app nunca manda lo que estas reglas rechazan**: no cambia nada de lo que la gente ve. Si alguien llamara a la base sin pasar por la app (o la app tuviera un error), la base dice que no. No decide nada del negocio: no toca precios, plazos, cupos, números de DNI ni textos legales.

### Qué cierra

| Regla | Dónde |
|---|---|
| Un paseo ya pedido no cambia (horario, duración, reserva, resumen del perro, entrega, grupo, distrito, nombres). Solo cambian el estado, el reporte y `cerrado_paseador`. La hora de creación y la de aceptación las pone la base | Disparador `privado.paseo_cambia` |
| La memoria de los avisos de ubicación (`vigilancia`) y el permiso de ubicación (`ubicacion`) no se guardan en la base | Igual |
| El reporte se escribe una sola vez, al pasar el paseo a «en disputa», y lo firma quien lo envía (la familia como «dueno», el paseador como «paseador») | Igual |
| `cerrado_paseador` solo lo pone el paseador de ese paseo, y no se deshace | Igual |
| El perro del paseo es de la familia que lo pide (o ninguno) | Política `paseos_crear` |
| Con un paseo ya hecho (entregado o cerrado) que se debe (sin pagar o «no lo encuentro»), la familia no puede pedir otro. Solo mira a la familia que pide; a las demás les contesta el «no tienes permiso» de siempre | Disparador `privado.paseo_nuevo` |
| `pagos.marcado_por`: qué persona del equipo marcó el pago (lo llena `mover_pago`) | Columna nueva y `mover_pago` |
| Un solo inicio y un solo fin por paseo, coordenadas que existen, y siempre ubicación o motivo | Índice único y dos CHECK en `puntos_control` |
| Casos: lo que se anota al abrir (registro, nombres, estado del paseo y del pago, monto) no se cambia; el reporte se hace una vez; el id es «<tipo>-<paseo>»; el estado del pago es uno conocido | `privado.limitar_caso` y dos CHECK |
| Una postulación nace con 0 paseos acompañados y sin notas del equipo | Política `postulaciones_crear` |
| Fotos: el peso anotado no pasa de 1 MB (y es positivo) y la coordenada existe | Dos CHECK en `fotos` |
| Chat: un mensaje no pasa de 1.000 letras (la app corta en 500) | CHECK en `mensajes` |

### Quién conserva su poder

El **equipo** (sus reglas de siempre), el SQL Editor y la clave de servicio (sin sesión) pasan todas las reglas de «quién es». Y `borrar_mi_cuenta()` puede dejar en blanco a la persona que se va mientras trabaja (el aviso interno `patitas.borrando_cuenta` lo prende solo esa función). Borrar la ficha de un perro sigue funcionando: el paseo queda con el perro en blanco.

### Cómo se aplica sin sorpresas

- Las reglas de tipo CHECK nacen **«not valid»**: valen para lo que se escriba desde ahora y **no revisan lo que ya hay guardado** (la migración no puede fallar por datos viejos). Está probado: `lib/servidor/integridad.migracion.test.ts` la aplica sobre una base con datos «de antes» que las reglas no habrían dejado entrar.
- **Una excepción:** el índice único de los puntos de control. Si por error (a mano) hubiera dos «inicio» o dos «fin» en el mismo paseo, la migración **borra el repetido y deja el primero** antes de crear el índice (son señales de ubicación, no registros; la app nunca los repite porque el id sale del paseo y el tipo).
- Si se corre dos veces, la segunda falla (ya existe): usa la consulta «¿cuáles faltan?» de `docs/PUBLICAR.md`.

### Mensajes de la base y lo que dice la app

- Con un pago pendiente, la base contesta «Tienes un pago pendiente…» (código `23514`); la app lo cambia por su frase de siempre: «No puedes reservar otro paseo hasta pagar este.» (`TEXTO_SERVIDOR.pagoPendiente`). Probado en los tres servidores de prueba (`pagos.escenarios.test.ts`).
- Los demás rechazos (`42501`) llegan a la app como «Esta cuenta no puede hacer ese cambio.», igual que los de antes. La app nunca los provoca.

### Lo que NO cierra (sigue anotado en `docs/AVANCE.md`)

- Los **montos** (la base solo exige que sumen), el **cupo y los tamaños**, el **plazo para aceptar** y el **orden del código de recojo**: dependen de la configuración y del negocio.
- Que la hora y el lugar de una foto o un punto sean los reales (son señales), y **12 fotos por paseo** (número de `lib/config.ts`).
- El **mismo DNI en dos cuentas** y la **postulación vacía**: son decisiones (qué hacer con un DNI repetido; qué es «completa»).
- Que **resolver un caso mueva el paseo** en la misma operación: hoy son dos llamadas de la app.
- **Cerrar el chat** al terminar el paseo y el **ritmo** de mensajes.

### Qué NO se pudo probar contra el Supabase real

Todo se probó en la base temporal (PGlite) y con los servidores de prueba. Sin probar contra el real: que la migración se aplique sin errores en el panel; el mensaje exacto y el código HTTP que PostgREST devuelve para estos rechazos (el simulado los imita con `23514` y `42501`); y el efecto de las reglas con las cuentas de verdad. Antes de aplicarla, correr la consulta «¿cuáles faltan?» y aplicar las anteriores en orden.
