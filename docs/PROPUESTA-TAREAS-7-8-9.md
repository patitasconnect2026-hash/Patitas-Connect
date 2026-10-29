# Propuesta: Tareas 7, 8 y 9 (selfie, mini curso y reasignación)

**Solo una propuesta. No se programó nada ni se publicó nada.** Espera el OK del equipo. Lo que no está escrito en los documentos del proyecto dice **«No está definido»**.

**Fuentes leídas:** la skill `patitas-connect` (4.3b, 4.6 y sección 10), `HISTORIAL.md`, `INFORME-PRODUCTO.md`, `FILTROS-Y-PERFIL-PASEADORES.md`, `PRODUCTO-SOLICITUDES.md`, `PLAN-SERVIDOR.md` y el código (`lib/quiz.ts`, `lib/verificacion.ts`, `lib/schedule.ts`).

## Reglas que valen para las tres
- Textos cortos. Nada de «seguro», «garantizado» ni «verificado» a secas: manda `lib/verificacion.ts` (solo se muestran las comprobaciones marcadas).
- Nada de DNI completo a la vista. Todo lo simulado dice **«Demostración»**.
- Hoy todo vive en el teléfono; con servidor (plan de `PLAN-SERVIDOR.md`) lo personal pasa a un servidor y **antes hay que consultar al abogado**.

---

## Tarea 7 · Selfie del día

**1. Qué hace.** La skill dice: «Selfie al iniciar el día, visible para el cliente en la tarjeta del paseo». El paseador se toma una foto de su cara con la cámara de la app antes de su primer paseo del día; la familia la ve en la pantalla «Paseo» junto a su nombre; el equipo la ve en `/admin`. **No está definido:** si es «al iniciar el día» o «en cada paseo», qué pasa si no se la toma (¿no puede salir?) y cuánto dura.

**2. Qué existe y qué falta.**
- Existe: la cámara de la app para fotos del paseo (`components/walker/CamaraPaseo.tsx`, `lib/fotos.ts`), con su almacén y sus topes. Existe la foto de perfil del paseador (`photo`), que **no** es la selfie del día.
- Falta: pedir la selfie (pantalla del paseador), guardarla con hora, mostrarla en la tarjeta del dueño y en `/admin`, y los textos.
- El documento de filtros dice que la selfie **de la postulación** se compara con el DNI en la videollamada: es otra cosa y no se toca.

**3. Dato personal.** Es una foto de la cara de una persona.
- **Hoy:** queda en el teléfono del paseador (IndexedDB). Entre dos celulares **no viaja**: la familia no la vería. Solo se vería en el mismo navegador.
- **Con servidor:** se sube a un almacén privado, la ven la familia de ese paseo, el propio paseador y el equipo. **No está definido** cuánto tiempo se guarda.
- **Cómo evitar «verificado» sin estarlo:** la selfie **no** es una comprobación. La pantalla dice «Foto de hoy, tomada a las 08:41». **No** se agrega una séptima comprobación a `lib/verificacion.ts` y no se escribe «identidad verificada» ni «es quien dice ser»: una foto no prueba nada por sí sola (regla de la skill: las fotos son señales, no pruebas). Una prueba automática fallaría si algún texto de la selfie contiene «verificad».
- En la demostración dice **«Demostración»** y usa una imagen de ejemplo.

**4. Tamaño y prueba.** **Mediano.** Pruebas automáticas (lógica de «hay selfie de hoy», textos) y una prueba en un celular real con cámara. Con cámara falsa en el navegador solo se prueba el flujo.

**5. Debe decidir el equipo.**
- ¿Una selfie por día o por paseo?
- Sin selfie, ¿el paseador puede salir o no? (Recomendación: se avisa a la familia «sin foto de hoy», no se bloquea.)
- ¿Cuántos días se guarda?
- ¿La familia la ve siempre o solo durante el paseo?

---

## Tarea 8 · Mini curso

**1. Qué hace.** La skill: «Mini curso de 5 pantallas (primeros auxilios, golpe de calor, correa, peleas entre perros, qué hacer si un perro escapa) y test; se aprueba con 80 %. Amplía `lib/quiz.ts`». Lo hace el paseador al postular, antes de la videollamada; el equipo ve el resultado en `/admin`. La familia **no** lo ve como «capacitado».

**2. Qué existe y qué falta.**
- Existe: la evaluación de situaciones (`lib/quiz.ts`: 16 preguntas, se arman 10, 6 críticas siempre salen, `PASS_PCT = 80`, respuestas peligrosas van a lectura humana) y su pantalla (`QuizStep.tsx`). Eso es un **examen**, no un curso.
- Falta: las 5 pantallas de contenido. **No está definido** el contenido (quién lo escribe y quién lo revisa), ni si el test del curso es el mismo examen o preguntas nuevas, ni la relación con la comprobación «Examen aprobado».

**3. Dato personal.** Poco: el puntaje, los intentos y las respuestas abiertas (texto libre, pueden contener cosas personales).
- **Hoy:** en el teléfono del paseador, en su postulación (`quiz`, `quizAttempts`); el equipo solo lo ve en el mismo navegador.
- **Con servidor:** en la fila de su postulación, visible para él y el equipo. Nunca para la familia.
- **Qué NO puede prometer:** no dice «capacitado», «certificado» ni «preparado». Dice «Terminó el mini curso y respondió el test» y el puntaje solo lo ve el equipo. Es una comprobación del equipo (`examen`), no una garantía. El contenido médico (primeros auxilios, golpe de calor) lo **debe revisar una persona con experiencia** (veterinaria o similar) antes de mostrarlo: **No está definido** quién.

**4. Tamaño y prueba.** **Mediano** (código chico, el contenido es lo que pesa). Pruebas automáticas del puntaje y de los textos; lectura de las 5 pantallas a 390×844 y 360×640.

**5. Debe decidir el equipo.**
- ¿Quién escribe y quién revisa el contenido de salud y seguridad del perro?
- ¿El curso reemplaza al examen actual o va antes?
- ¿Se puede repetir? ¿Cuántas veces? (Hoy: hasta 2 intentos y reintento a los 3 meses, según el documento de filtros.)

---

## Tarea 9 · Reasignación

**1. Qué hace.** Cuando el paseador rechaza, no contesta a tiempo o cancela, la familia ve **2 o 3 paseadores compatibles** (tamaño del perro y horario libre) y **elige a mano** uno. La app puede armar un mensaje de WhatsApp (`wa.me`) para avisarle. Es lo que ya dicen la skill (4.3b) y `HISTORIAL.md`: el dueño elige a otro **a mano**. **No hay reasignación automática**: está fuera de alcance en `PRODUCTO-SOLICITUDES.md`.

**2. Qué existe y qué falta.**
- Existe: estados `rechazado`, `expirado` y `cancelado`; el texto «Solicitud rechazada. Elige a otro»; la lista de paseadores y la regla de compatibilidad (`walkerFits`, `slotInfo` en `lib/schedule.ts`) y la hoja de reserva.
- Falta: una pantalla que, en esos estados, muestre 2 o 3 paseadores compatibles con un botón para reservar (hoy el dueño vuelve a «Explorar» y busca solo) y el mensaje de `wa.me`. **No está definido:** el texto del mensaje, el orden de los paseadores y si se muestra con paseadores de ejemplo (por defecto, con «Mostrar ejemplos» apagado en cuentas reales, solo reales).

**3. Dato personal.** Mínimo: nombre del paseador, perro y horario. El mensaje de WhatsApp no incluye celulares de la familia ni la dirección. **Hoy:** todo en el teléfono. **Con servidor:** la lista sale de las filas de paseadores aprobados; cada familia ve solo lo suyo. Los celulares **no** se muestran entre familia y paseador (regla 4.8).

**4. Tamaño y prueba.** **Chico a mediano** (casi todo existe). Pruebas automáticas: compatibilidad por tamaño y horario, máximo 3, nunca el paseador que rechazó, nunca uno sin horario. Prueba en el navegador con la demostración.

**5. Debe decidir el equipo.**
- ¿Aviso por WhatsApp a los paseadores, o solo se muestra la lista? (Recomendación: lista primero.)
- ¿2 o 3 paseadores?
- ¿Se muestra al paseador que canceló como «no disponible»?
- Con pocos paseadores reales en el piloto puede haber **cero compatibles**: ¿qué dice la pantalla? (Propuesta: «Aún no hay otro paseador libre a esa hora» y un botón para elegir otro horario.)

---

## Orden recomendado
1. **Tarea 9 (reasignación):** es la más chica, casi todo existe y no toca datos delicados.
2. **Tarea 8 (mini curso):** depende del contenido, que el equipo puede escribir en paralelo.
3. **Tarea 7 (selfie):** la más delicada por ser una foto de cara; conviene después de tener servidor y la revisión del abogado.

## Preguntas para el equipo
1. ¿De acuerdo con el orden 9, 8, 7?
2. Selfie: ¿una por día o por paseo, y qué pasa si falta?
3. Selfie: ¿cuántos días se guarda y quién la ve?
4. Mini curso: ¿quién escribe y quién revisa el contenido de salud?
5. Reasignación: ¿lista en pantalla solamente o también aviso por WhatsApp, y 2 o 3 paseadores?
