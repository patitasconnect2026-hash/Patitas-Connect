# Contexto del negocio

Lo escribió el equipo para que cualquier conversación nueva (con una persona o con Claude) entienda el proyecto antes de tocar nada. Si algo de aquí cambia, se actualiza este archivo.

## Qué es
Patitas Conectadas (antes «Patitas Connect»): paseadores de perros verificados, estudiantes, en San Isidro y Jesús María (Lima).

## Quiénes somos
Tres estudiantes de 18 años:
- Una persona hace la web, la lógica y las mecánicas.
- Un amigo hace el diseño. **Él decide la marca**; el código solo corrige contraste, tamaño y errores.
- Otro hace el marketing presencial y las encuestas.

## En qué fase estamos
- **Piloto con 3 a 5 familias conocidas.**
- **Cero presupuesto.** No hay empresa constituida todavía.
- **Patitas cobra, a mano y AL TERMINAR el paseo** (decisión del equipo): la familia le paga a Patitas cuando termina el paseo y le muestra el pago al paseador; el equipo confirma el pago en su cuenta, descuenta su comisión (20 %) y le paga al paseador. La app no mueve dinero y no hay pasarela de pagos. Por defecto la familia paga solo el precio del paseador y Patitas se queda el 20 % de ese precio.
- **Antes de cobrar a familias reales hay que consultar a un contador y a un abogado.** Hoy no hay empresa ni RUC.

## Reglas del paseador
- Tarifa libre entre S/ 16 y S/ 34 por hora.
- Calificación mínima 4,7.
- Los primeros paseos son acompañados.

## Cómo se paga
**Se paga al final del paseo, no antes.** La reserva no pide pago y el paseador sale sin esperar ningún pago.
1. Se hace el paseo. El paseador toca «Entregué» y la familia toca **«Recibí a [perro]»**.
2. Aparece **«Paga a Patitas»**: el monto, el QR o los números de Patitas (salen de `cobroEquipo` en `lib/config.ts`; nunca se inventan: vacío = «Falta configurar») y el **nombre de la cuenta de Patitas** a la vista (el titular, de la misma configuración). No hay tarjeta.
3. La familia paga con Yape, Plin o transferencia y **le muestra el pago al paseador**.
4. El paseador ve **«Cobro del paseo»** con el monto y el titular que debe aparecer, y toca **«Vi el pago»** (puede anotar la hora). Con eso termina su trabajo y puede irse.
5. En `/admin`, **«Por pagar al paseador»**: el equipo confirma **en su cuenta** que el dinero llegó y marca **«Pagado al paseador»** (ahí ve comisión, neto y el Yape o Plin del paseador). Mientras no lo confirme, no se le paga al paseador. Si no lo encuentra: **«No lo encuentro»** con una nota, y se abre un caso (para eso está «Reportar problema»).
6. Plazo de pago `horasParaPagar` (24 h): recordatorio suave; mientras haya un pago pendiente, la familia **no puede reservar otro paseo**.
7. Si el paseo no se hizo (rechazado, vencido o cancelado), no hay nada que pagar.
- El paseador **registra dónde cobrar** (Yape o Plin, su celular y el titular). Solo lo ve él y el equipo en `/admin`; nunca el dueño. Sin eso no recibe solicitudes.
- Textos fijos: «Pagas al terminar el paseo.» y «Patitas le paga al paseador después de confirmar el pago en su cuenta.»

## Comisión
- **20 %** (`comision` en `lib/config.ts`; es 0,20). Por defecto se descuenta del precio del paseador (`comisionModo: 'del_precio'`): la familia paga el precio y el paseador ve «Recibes S/ X». Si el equipo prefiere cobrarla **encima** del precio, es `comisionModo: 'sobre_el_precio'`.
- Cancelación gratis hasta `horasCancelacionGratis` horas antes (`lib/config.ts`). Como el pago es al final, un paseo cancelado, rechazado o vencido no tiene nada que pagar; `cancelacionTardiaPct` hoy **no se cobra** (queda anotado como tardío).

## SOS y ayuda (decidido por el equipo)

- **No hay lista de veterinarias**: no tenemos convenio con ninguna. El paso solo dice «llévalo a la veterinaria más cercana».
- El SOS muestra, en este orden: qué hacer → **serenazgo del distrito del paseo** (si no se sabe, los dos) → **Policía 105, Bomberos 116, SAMU 106** → Patitas.
- El **contacto de emergencia del dueño** solo aparece en el SOS del **paseador** («Contacto del dueño»), por si el dueño no contesta. El SOS del dueño no lo muestra: su celular ya tiene sus contactos.
- Todo lo que falte configurar se dice («Falta configurar»); ningún botón queda mudo. Los números del serenazgo los copia y confirma el equipo: no se inventan.

## Qué siente quien nos conoce poco
Tiene miedo por su perro, por su casa y por su dinero. La app tiene que resolver cada duda **antes** de que la tengan:
- ¿Quién es el paseador?
- ¿Dónde está el perro?
- ¿Qué pasa si algo sale mal?
- ¿Cuándo y cómo se paga?
- ¿A quién llamo?

## Lo que genera confianza hoy en Lima
- Ver cara, nombre y selfie del paseador.
- Fotos del paseo con hora y ubicación.
- Puntos de control con foto: la ubicación se registra al empezar, al terminar y en cada foto (con un recordatorio cada 10 minutos). No es seguimiento continuo.
- Reseñas reales.
- Un botón de ayuda que abre llamada o WhatsApp de verdad.
- Pagar al final del paseo con lo que ya usan (Yape, Plin, transferencia) a Patitas, que lo confirma en su cuenta y le paga al paseador.
- Textos simples y honestos que digan que es un piloto.

## Lo que destruye la confianza
- Promesas grandes: «100 %», «seguro», «garantizado».
- Pantallas que parecen vacías o falsas.
- Pedir datos sin explicar para qué.
- Errores o botones que no hacen nada.

## Reglas de trabajo
- **No inventar** datos de mercado, cifras ni reseñas. Si hace falta un dato, se pregunta o se busca con fuente.
- Todo lo simulado debe estar **marcado en el código y en el informe**.
- **Primero las mecánicas** (estados del paseo, pago acordado, confirmación de entrega, SOS, fotos con hora y coordenadas, alertas de ubicación). **Después el diseño.**
- Las fotos y las coordenadas son **señales, no pruebas absolutas**. Nunca escribir que algo no se puede falsificar.
- La palabra «seguro» **no se usa en ningún caso** (tampoco «paseos seguros» ni «viaje seguro»). Alternativas: «con cuidado», «con tranquilidad», «acompañado».
