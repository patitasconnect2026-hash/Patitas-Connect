# Filtros de seguridad y perfil del paseador

Todo lo de este documento se puede hacer **hoy, sin dinero y entre dos personas**. Está pensado para que "no cualquiera entre" sin prometer lo que no pueden comprobar.

> **Nota del 15 de octubre de 2026 (decisión de la usuaria):** el filtro 6 («Dos avales», las referencias) **ya no está en la app**, y la videollamada es **solo entre el paseador y el equipo**: el paseador solo elige la hora y no hay forma de traer o invitar a otras personas. Este documento es el análisis original y no se ha reescrito.

> **Aviso legal:** los textos de términos (`lib/legal.ts`) y el uso del DNI son **borradores**. Antes de recibir clientes reales, pidan a un abogado (o a un estudio jurídico universitario, que suele revisar gratis a emprendedores) que los revise. Mi lectura es que la Ley 29733 de protección de datos exige consentimiento claro para tratar el DNI y las consultas de registros; la app lo pide por separado y de forma visible, pero no sustituye una revisión legal.

## 1. Los 8 filtros (en el orden en que el paseador los pasa)

| # | Filtro | Cómo se hace sin costo | Qué detecta | Qué NO detecta |
|---|---|---|---|---|
| 1 | **Mayor de 18, datos y selfie** | Fecha de nacimiento, DNI de 8 dígitos y foto de frente. | Menores y datos incompletos. | Identidad falsa (se cruza en el filtro 7). |
| 2 | **Celular verificado** | Código de 6 dígitos; un celular = una cuenta. | Cuentas duplicadas y bromas. | Quién está detrás del celular. En producción el SMS cuesta unos céntimos por código; alternativa gratis: confirmarlo en la videollamada. |
| 3 | **Términos en 7 bloques** | Cada bloque dice en una frase qué se acepta y se marca por separado. Incluye el **compromiso de mostrar el DNI a clientes verificados**. | Que alguien diga "no sabía". Queda guardada la versión y la fecha de aceptación. | Nada por sí solo: es la base legal de lo demás. |
| 4 | **Evaluación de situaciones** | 10 preguntas (6 críticas de seguridad siempre aparecen) + 2 abiertas. Opciones mezcladas. Se puntúa. | Mal criterio ante casos reales: soltar la correa, cruzar con calor, dejar perros solos. | Mentiras bien armadas o ayuda de una IA. Por eso existe el filtro 7. |
| 5 | **Registros públicos gratuitos, con permiso** | El postulante marca la autorización y sube la captura/PDF de: REDAM (deudores alimentarios), requisitorias de la PNP, seguimiento de denuncias del Ministerio Público y Certificado Único Laboral. Ustedes también pueden consultar el CEJ. Solo sitios oficiales. | Requisitorias vigentes y algunos antecedentes. | **No prueban identidad** ni cubren todo (no hay denuncia ≠ no hay riesgo). Las capturas se pueden editar: por eso ustedes **repiten la consulta** con el DNI durante la videollamada, en pantalla compartida. Confirmen qué incluye cada documento el día que lo usen. |
| 6 | **Dos avales** | Dos personas (profesor, vecino, jefe, familiar que no viva con él) con nombre y celular. Ustedes las llaman. | Referencias inventadas (si nadie contesta, no avanza). | Que los avales se pongan de acuerdo. |
| 7 | **Videollamada de 15 minutos** | Con el DNI físico en mano. Ver sección 3. | Suplantación (rostro ≠ DNI ≠ selfie), respuestas copiadas (no sabe explicar lo que escribió), actitud. | Lo que pasa cuando nadie mira: por eso el filtro 8. |
| 8 | **Primeros paseos acompañados** | Ustedes siguen el GPS, llaman al minuto 10 y piden las 2 fotos; máximo 2 perros; hasta 10 paseos. | Mal manejo real del grupo. | Problemas que solo aparecen con el tiempo: por eso hay seguimiento continuo (calificación mínima 4,7 y reverificación cada 6 meses). |

**Importante:** en la app no se dice "antecedentes limpios" ni "test psicológico aprobado". Lo primero no se puede garantizar con consultas gratuitas y lo segundo solo lo aplica un psicólogo colegiado. Las tarjetas dicen exactamente lo que se hizo: *DNI verificado · registros públicos revisados · entrevista por video · evaluación de situaciones aprobada*.

## 2. Cómo medir la evaluación (y qué hacer con cada resultado)

Se llama **evaluación de situaciones**, no test psicológico. Está en `lib/quiz.ts` (16 preguntas en el banco, se arman 10 al azar; las 6 críticas siempre salen).

| Puntaje | Respuestas de riesgo | Respuestas abiertas | Resultado |
|---|---|---|---|
| **80 % o más** | Ninguna | Sin alertas | **Aprobado automático**: pasa a documentos y videollamada. |
| **60–79 %** | Cualquiera | Cualquiera | **Lectura humana**: ustedes leen las respuestas antes de la videollamada. |
| **Menos de 60 %** | — | — | **No aprobado**: hasta 2 intentos; luego, reintento a los 3 meses. |
| Cualquiera | **Marcó una opción peligrosa en una crítica** | — | **Siempre lectura humana**, aunque el puntaje sea alto. |

Cada pregunta vale 0, 1 o 2 puntos. Las "alertas" para quien revisa son: respuesta abierta muy corta, sin palabras clave de seguridad, o evaluación terminada en menos de 90 segundos.

**Cómo medir que el filtro funciona** (anótenlo en una hoja de cálculo desde la primera postulación):

- Postulaciones → evaluación aprobada → documentos completos → videollamada hecha → aprobados → activos tras 10 paseos.
- % de aprobación en cada paso. Si más del 80 % pasa la evaluación, está muy fácil: súbanle la exigencia o agreguen preguntas críticas.
- Calificación media de los paseadores por "puntaje en la evaluación": si no hay relación, la evaluación no predice y hay que mejorarla.
- Quejas por cada 100 paseos y cuántas venían de alguien que pasó con "lectura humana".

## 3. Guion de la videollamada (15 min)

1. **Identidad (3 min):** pedir el DNI físico frente a cámara (frente y reverso), comparar rostro, foto de la selfie y la del perfil. Hacer **ustedes** las consultas de registros con el número en pantalla compartida.
2. **Casos (7 min):** repetir 3 situaciones del cuestionario **con otras palabras** y pedir que expliquen qué harían y por qué (perro que se suelta, calor, perro agresivo). Quien copió o usó una IA suele titubear aquí.
3. **Experiencia y disponibilidad (3 min):** ¿tuvo o tiene perro?, horarios reales, ¿cuántos perros maneja a la vez?
4. **Reglas (2 min):** leer en voz alta la regla del PIN de recojo, las fotos obligatorias y el SOS. Que diga "entendido".

**Banderas rojas:** no quiere mostrar el DNI, la voz o el rostro no coincide con la selfie, no explica sus propias respuestas, culpa a otros de problemas pasados, pide cobrar fuera de la app, quiere pasear más de 3 perros "por ganar más".

## 4. ¿Se puede usar IA para decidir si es apto?

**Sí para ayudar, no para decidir.** Las razones:

- Una IA puede **resumir** las respuestas abiertas, **marcar** frases de riesgo y **comparar** con la rúbrica. Eso ahorra tiempo a dos personas.
- No es confiable **detectar** si una respuesta la escribió otra IA (los detectores se equivocan mucho y dañarían a gente honesta). La defensa real es la videollamada.
- La Ley 29733 reconoce el derecho a no ser evaluado **solo** por un tratamiento automatizado de datos con efectos importantes (confírmenlo con su abogado). Por eso **una persona toma la decisión final y puede explicarla**.
- Cada postulante debe saber, en los términos, que sus respuestas pueden ser revisadas con ayuda de herramientas automáticas.

**Cómo hacerlo hoy sin programar:** copien las respuestas abiertas del panel `/admin` y pídanle a Claude algo como:

```
Eres un apoyo para revisar postulantes a paseador de perros. Te paso 2 respuestas.
Para cada una dame: (1) un resumen de 2 líneas, (2) si menciona calma, avisar al dueño y proteger a los otros perros,
(3) frases de riesgo (soltar a un perro, ignorar el calor, cobrar fuera de la app), (4) 3 preguntas de seguimiento para la videollamada.
No decidas si es apto: solo organiza la información para una persona.
```

**Más adelante (cuando haya volumen):** automatizar ese resumen dentro del panel interno, siempre con la decisión en manos de una persona y un registro de quién aprobó o rechazó.

## 5. Un vet aliado, más adelante

Cuando tengan 20–30 clientes: propongan a una veterinaria del distrito (la que ya recomiendan los dueños) un intercambio simple: ustedes la recomiendan a los clientes que no tienen vet y ella los recomienda a ustedes, con **código propio** para medir cuántos llegan. También puede ser quien dé una charla de primeros auxilios caninos a los paseadores (sube la confianza y es contenido para redes). No lo anuncien hasta tener el acuerdo por escrito.

## 6. Perfil del paseador: qué poner para que lo elijan

Lo primero que mira un dueño es **la cara, una frase, el precio y si hay reseñas**. Lo que hace elegir a uno sobre otro es lo que el paseador **incluye**. La app ya lo estructura (`Mi perfil`, con vista previa y medidor de completitud):

1. **Foto de frente, sonriendo, con buena luz**, sin lentes de sol. Es obligatoria.
2. **Una frase de presentación** (30–280 caracteres) con tres cosas: de dónde es ("vivo a 5 cuadras del Bosque El Olivar"), qué estudia y cómo trabaja ("te mando fotos sin que me lo pidas").
3. **¿Qué incluye tu paseo?** (opcional, pero es lo que más capta la atención): agua y bolsas, fotos, video corto, juego con pelota, limpieza de patas, botiquín, premios con permiso, reporte detallado. **Marcar solo lo que cumplirá siempre**: un "incluye" que no cumple genera reseñas de una estrella.
4. **Estilo** (hasta 3): tranquilo, con mucha energía, paciente, puntual…
5. **Tamaños que maneja, días, horarios, parques y tarifa** (S/ 16–34; referencia de mercado en `docs/INVESTIGACION-Y-PLAN.md`). No bajar el precio para "ganar" clientes.
6. **Experiencia honesta**: "primera vez" también es válido; lo que no es válido es inventar.

**Ejemplos de frases que funcionan** (con voz de estudiante, sin adornos):

- *"Estudio Veterinaria en la UPCH y vivo a cinco cuadras del Bosque El Olivar. Con paciencia y correa corta: la seguridad primero."*
- *"Corro todas las mañanas, así que mis paseos tienen ritmo. Ideal para perros con energía. Siempre te mando foto jugando y foto tomando agua."*
- *"Tengo un golden de 4 años y sé lo que es dejarlo en buenas manos. Te cuento cómo le fue sin que me lo pidas."*

**Qué no escribir:** promesas de adiestramiento o de "curar" conductas, que es veterinario si no lo es, comparaciones con otros paseadores, datos personales de otros clientes.

## 7. "No cualquiera entra": cómo comunicarlo con honestidad

- Lleven la cuenta real: de cada 10 postulantes, ¿cuántos llegan a activos? Cuando tengan el dato, **publíquenlo** ("Aprobamos a 3 de cada 10"). Si lo ponen sin que sea verdad, pierden la confianza que están construyendo. (La referencia internacional, Rover, comunica que aprueba a menos del 20 %.)
- En la tarjeta de cada paseador ya se ven los **cuatro filtros que pasó**, su **código de verificación** (PAT-xxxx) y su **DNI** (oculto, con botón "Ver completo" y registro de accesos).
- En el afiche de portería: "Vecinos verificados · DNI a la vista · primeros paseos acompañados". Sin decir "antecedentes limpios".
