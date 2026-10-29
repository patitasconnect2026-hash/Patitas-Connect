# Aviso de privacidad para el paseador sobre la IA de apoyo — BORRADOR

> **PENDIENTE de revisión con la abogada (paso 10 del plan).** No es el texto legal vigente y **no se muestra en la app**. No sustituye ni cambia nada de `lib/legal.ts` ni de los acuerdos que ya aceptan las personas. Mientras la abogada no lo revise, la IA de apoyo queda **apagada** (`iaApoyoActivada: false` y `iaAvisoRevisado: false` en `lib/config.ts`), y una prueba impide encenderla sin esa revisión.

## Qué dice este borrador (para que lo lea la abogada)

**Qué hacemos.** Cuando postulas para ser paseador, escribes respuestas en un examen. Una persona del equipo de Patitas las lee. Para ayudarse, el equipo puede pedir a una herramienta de inteligencia artificial (IA) un **resumen de apoyo** de lo que escribiste.

**Qué hace la IA y qué no.** La IA resume en pocas líneas lo que escribiste, señala cosas que conviene revisar (por ejemplo, respuestas vacías, copiadas o que se contradicen) y sugiere preguntas para la videollamada. **No decide nada.** No dice si eres apto o no, no evalúa tu personalidad ni toma ninguna decisión sobre tu postulación. Decide siempre una persona del equipo.

**Qué datos se envían.** Solo el texto de tus respuestas escritas. **Antes de enviarlo se quitan tu nombre, tu DNI, tu teléfono y tu correo.** No se envía tu foto, tu dirección, ni dónde cobras.

**A quién se envía.** Al proveedor de IA que use el equipo (hoy, por defecto, Anthropic, a través de una función del servidor del equipo). *[La abogada debe confirmar: proveedor, país donde se procesa, si el proveedor puede guardar o usar el texto para entrenar, y el plazo de conservación.]*

**Qué guardamos.** Solo un registro de cada uso: qué persona del equipo lo pidió, sobre qué postulación y cuándo. **No guardamos** el texto enviado ni lo que respondió la IA. Si borras tu cuenta, el registro queda sin tus datos.

**Tus derechos.** Puedes pedir que no se use la IA con tus respuestas escribiendo al equipo; en ese caso solo las leerá una persona. *[La abogada debe confirmar la base legal y el texto de los derechos de acceso, rectificación, cancelación y oposición.]*

## Qué falta (para que lo cierre la abogada)

1. Confirmar la base legal (consentimiento u otra) y cómo se pide: una casilla nueva en los acuerdos del paseador o un aviso aparte.
2. Confirmar la transferencia de datos al proveedor (país, contrato, conservación, entrenamiento).
3. Aprobar el texto final y su versión. Recién entonces se agrega a la app y se cambia `iaAvisoRevisado` a `true`.
4. Decidir si hay que avisar también a las personas que ya postularon.
