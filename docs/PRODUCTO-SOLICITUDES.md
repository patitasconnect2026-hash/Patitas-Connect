# «Pedir paseo»: propuesta (Fase 2)

**Estado: propuesta del 10 de octubre de 2026. No está construida y NO se construye en el Bloque 3.** Es solo este documento. Para hacerla de verdad hace falta un servidor (Tarea 13, y solo si el equipo lo pide). Lo que sí se puede hacer sin servidor está en «Qué se puede probar sin servidor».

## En una frase

Hoy el dueño **elige a un paseador** y le manda una solicitud; si no contesta o rechaza, vuelve a empezar. Con «Pedir paseo» el dueño **cuenta qué necesita** (perro, día, hora, su casa), **varios paseadores pueden aceptar** y **el dueño elige a uno**. Sin contraofertas al inicio: cada paseador pone su tarifa dentro del rango, como hoy (`tarifaMinima` y `tarifaMaxima` de `lib/config.ts`), y el dueño decide.

## Por qué existe

- El dueño no tiene que probar paseador por paseador cuando el primero no contesta.
- Los paseadores con tiempo libre ven pedidos que hoy no ven.
- Es más parecido a cómo la gente pide un favor en un grupo de vecinos.

## Por qué todavía no

- **Necesita servidor.** Hoy todo vive en el navegador (`localStorage`) y las dos apps solo se hablan si están en el mismo navegador. «Varios paseadores aceptan» exige que cada uno vea el pedido en su propio celular.
- El piloto es con 3 a 5 familias y pocos paseadores: no hay competencia que ordenar. Antes de construir conviene **medir si hace falta** (ver el paso 0).
- Habría que decidir hosting y base de datos (la skill pide parar y preguntar antes) y qué datos personales viajan a un servidor.

## Cómo sería (el camino feliz)

1. **El dueño pide:** elige perro, día, hora y duración. La casa es la que ya marcó en el mapa; la app comprueba que esté **dentro de la zona o en el borde** (`lib/zona.ts`) y que el perro no sea de raza peligrosa.
2. **La app busca compatibles:** paseadores que aceptan ese tamaño, tienen ese horario libre (`lib/schedule.ts`: `walkerFits`, `slotInfo`) y pasean en el distrito. Solo ellos ven el pedido.
3. **Cada paseador compatible** toca **«Puedo»** con su tarifa (dentro del rango) o lo ignora. Puede retirar su oferta mientras el dueño no elija.
4. **El dueño ve las ofertas** (como mucho 3 a la vez: más es parálisis) con nombre, estrellas, comprobaciones y tarifa, y **elige a una**.
5. **Los demás reciben «Ya se asignó»** (nunca un «te rechazaron»).
6. **Nace el paseo de siempre:** a partir de ahí es la máquina de estados de hoy (`lib/paseo.ts`: aceptado → en camino → en paseo → entregado → cerrado), con su pago acordado, su entrega con doble confirmación y sus reportes.

## Estados

El pedido **no es** el paseo: es una cosa nueva que vive antes. Cuando el dueño elige, se crea el paseo (con los dos eventos de siempre: el dueño solicitó y el paseador aceptó, cada uno con su hora real).

**El pedido**

| Estado | Qué significa | Quién lo mueve |
|---|---|---|
| `abierto` | Publicado; todavía nadie ofertó | Dueño (al pedir) |
| `con_ofertas` | Hay al menos una oferta | Paseador (al ofertar) |
| `elegido` | El dueño eligió una oferta; nace el paseo | Dueño |
| `vencido` | Pasó el plazo sin que nadie ofertara o el dueño eligiera | Sistema |
| `cancelado` | El dueño lo retiró antes de elegir | Dueño |

**Cada oferta**

| Estado | Qué significa | Quién lo mueve |
|---|---|---|
| `enviada` | El paseador dijo «Puedo» con su tarifa | Paseador |
| `elegida` | El dueño la eligió | Dueño |
| `descartada` | Eligió otra (o el pedido venció o se canceló) | Sistema |
| `retirada` | El paseador se arrepintió antes de que eligieran | Paseador |

Igual que en `lib/paseo.ts`: una tabla de transiciones, cada una con **quién** la puede hacer y un registro con **hora y autor**; lo que no está en la tabla no se puede hacer, y los estados finales no tienen salidas.

## Qué NO cambia

- **La app no cobra ni guarda dinero.** El pago sigue siendo acordado entre las dos partes (Yape, Plin o efectivo).
- Tamaños: nunca se mezclan. Máximo 3 perros por paseo (2 en los primeros 10 paseos del paseador). Horario de 6:00 a 21:00. Razas peligrosas: por ahora no se atienden.
- Solo San Isidro y Jesús María (más el margen de 300 m).
- **Los celulares no se muestran entre dueño y paseador.** Antes de ofertar, el paseador ve el tamaño del perro, la hora y la zona aproximada. La ficha completa, la dirección y el código de recojo, solo después de que lo eligen (como hoy, que se ven al aceptar).
- **Sin contraofertas:** el dueño no regatea ni el paseador cambia su tarifa por pedido. Si más adelante hace falta, es otra decisión.

## Qué necesita servidor, y por qué

| Cosa | Por qué no alcanza el navegador |
|---|---|
| Que el pedido llegue a **varios paseadores** | Cada uno está en su celular; `localStorage` es de un solo navegador |
| Juntar las ofertas y mostrárselas al dueño | Las ofertas nacen en otros celulares |
| **Elegir sin pisarse**: un solo paseador, un solo paseo | Si dos dueños eligen al mismo paseador a la misma hora, alguien tiene que decidir quién llegó primero |
| Que un paseador **no acepte pedidos que se solapan** | Hay que mirar todos sus pedidos a la vez |
| **Plazos** (vencer un pedido a la hora justa) | Hoy solo corre mientras una pantalla está abierta |
| **Avisarle al paseador** que hay un pedido | Necesita notificaciones (costo) o un mensaje; hoy solo existe el «aviso» entre pestañas del mismo navegador |
| **Quién es quién** (inicio de sesión) | Hoy no hay cuentas de verdad: cualquiera puede escribir en su `localStorage` |

**Datos personales:** guardar nombres, teléfonos o ubicaciones en un servidor exige **parar y preguntar** (skill, sección 9). Lo mínimo que tendría que viajar: nombre de pila del dueño y del perro, tamaño y datos de la ficha, **zona aproximada** (no la casa exacta) hasta que el dueño elija, hora, tarifa y comprobaciones del paseador. Nada de teléfonos ni DNI.

## Qué se puede probar sin servidor y qué no

**Sí se puede (y conviene hacerlo antes de elegir servidor):**

- **La lógica completa en funciones puras con pruebas:** quién es compatible, estados y transiciones, plazos, «elegir una oferta» y qué pasa con las demás, que un paseador no ofrezca dos pedidos que se solapan. No necesita internet.
- **Las pantallas en demostración:** formulario del pedido, lista de ofertas con paseadores de ejemplo (marcadas «Demostración»), «Elegir», «Ya se asignó».
- **Un recorrido entre pestañas del mismo navegador:** una del dueño y dos de paseadores, como hoy se hace con las dos apps.
- **El «piloto asistido a mano»** (paso 0): el equipo hace de servidor con WhatsApp y mide si el modelo funciona antes de escribir código.

**No se puede probar sin servidor:**

- Entre **dos celulares de verdad**.
- Que **dos paseadores acepten a la vez** y alguien llegue primero (la carrera).
- **Avisos** que despierten el celular del paseador.
- **Plazos** con la app cerrada.
- Cuántas ofertas llegan en la vida real, qué tan rápido, y si los dueños eligen por precio o por confianza: eso solo lo dice el piloto.

## Riesgos

| Riesgo | Qué podría pasar | Qué hacer |
|---|---|---|
| **Competencia por precio** | El dueño elige siempre el más barato y los paseadores bajan su tarifa hasta no valer la pena | Mostrar estrellas y comprobaciones antes del precio; sin ordenar por precio; tope de 3 ofertas |
| **Paseadores nuevos sin paseos** | Los que ya tienen reseñas ganan siempre | Etiqueta «Nuevo» y sus primeros paseos acompañados (ya existe); a igualdad de condiciones, ofrecer primero los nuevos |
| **Ofertas fantasma** | Aceptan y no van | Registro y reportes (ya existen); contar cuántas veces retiran o no llegan |
| **Pedidos falsos o de broma** | Molestan a los paseadores | Cuenta con celular verificado y límite de pedidos abiertos por dueño |
| **Dos paseos a la misma hora** | Un paseador oferta dos pedidos y gana ambos | La app lo impide con la agenda del paseador (exige servidor) |
| **Privacidad** | Publicar la casa a todos los paseadores de la zona | Mostrar solo una zona aproximada hasta que el dueño elija |
| **Promesas de rapidez** | «Respuesta en 5 minutos» que no podemos cumplir | No prometer tiempos; mostrar «Vence a las 10:00» |
| **Costo de avisar** | Notificaciones o mensajes cuestan dinero | Empezar con un aviso manual por WhatsApp (`wa.me`) y medir antes de pagar nada |
| **Reglas que se esquivan** | Pedir un paseo con un perro de otro tamaño para entrar a un grupo | Las mismas validaciones de hoy en el servidor, no solo en la pantalla |

## Pasos para llegar ahí

Cada paso es chico y termina con algo que se puede mostrar. Nadie avanza al siguiente sin el OK del equipo.

| # | Paso | Listo cuando |
|---|---|---|
| 0 | **Piloto asistido a mano** (sin código). Los dueños piden por WhatsApp al equipo; el equipo lo reenvía (sin teléfonos) a un grupo de paseadores; quien puede responde al equipo; el dueño elige | Hay 10 pedidos con tiempos anotados: cuánto tardó la primera oferta, cuántas llegaron, quién eligió y por qué |
| 1 | **Decisiones del equipo** (ver preguntas abajo) | Está por escrito en este archivo |
| 2 | **Lógica pura con pruebas** (`lib/pedidos.ts`, sin pantallas) | Pasan las pruebas de estados, compatibilidad y «elegir» |
| 3 | **Pantallas en demostración** (dueño y paseador, mismo navegador) | Se recorre el camino feliz y el vencimiento con dos pestañas, con capturas a 390×844 y 360×640 |
| 4 | **Elegir servidor** (hosting, base de datos, inicio de sesión) | El equipo lo decide con precio cero a la vista. Hoy el candidato de la skill es Supabase gratuito (Tarea 13) |
| 5 | **Un adaptador de servidor** detrás de la puerta única (`lib/datos`) y cuentas | Las pantallas no cambian: solo cambia de dónde leen |
| 6 | **Avisos al paseador** (primero WhatsApp manual, después notificaciones) | Un paseador se entera de un pedido con la app cerrada |
| 7 | **Prueba con celulares reales** y piloto ampliado | Una familia y dos paseadores hacen un pedido de punta a punta en sus celulares |

## Preguntas para el equipo

Con la opción que propongo por defecto (se puede cambiar):

1. ¿Cuántas ofertas ve el dueño como máximo? **3.**
2. ¿Cuánto tiempo tienen los paseadores para ofertar? **30 minutos, y 2 horas antes del paseo como tope.**
3. ¿El dueño puede rechazar todas las ofertas y volver a pedir? **Sí, una vez.**
4. ¿Qué ve el paseador del pedido antes de ofertar? **Tamaño del perro, hora, distrito y zona aproximada; nunca la dirección.**
5. ¿Se ordena por algo? **No: sin orden por precio; primero los que tienen comprobaciones completas.**
6. ¿Un paseador puede ofertar a varios pedidos que se solapan? **No.**
7. ¿Qué pasa si el paseador elegido no llega? **Va a «Reportar problema» (ya existe) y el equipo lo ve.**
8. ¿Seguimos en piloto sin pedir (paso 0) o saltamos a la lógica (paso 2)? **Paso 0 primero.**

## Cómo se conecta con lo que ya existe

| Pieza de hoy | Qué hace en «Pedir paseo» |
|---|---|
| `lib/zona.ts` | Valida la casa del dueño (dentro o borde) y da la zona aproximada |
| `lib/schedule.ts` | Quién es compatible por tamaño y horario |
| `lib/paseo.ts` | El paseo que nace al elegir; no cambia |
| `lib/config.ts` | Tarifa mínima y máxima, plazos, tope de perros |
| `lib/datos/` | La puerta única: aquí iría el adaptador de servidor |
| `lib/verificacion.ts` | Las comprobaciones que se muestran junto a cada oferta |
| Cola de reportes (`/admin`) | Ya recibe lo que sale mal después de elegir |

## Fuera de esta propuesta

Contraofertas y subastas, pagos dentro de la app, comisión, pedidos recurrentes de lunes a viernes con varios paseadores, y reasignación automática cuando el elegido cancela (esa es la Tarea 9).
