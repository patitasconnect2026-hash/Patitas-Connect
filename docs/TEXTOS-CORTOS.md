# Textos cortos (bloque C): propuesta

**Estado: OK del equipo el 10 de octubre de 2026; los 20 textos están aplicados (con los ajustes que pidió el equipo) y quedan los hallazgos de `docs/AVANCE.md`.** Una persona que va a pie, con el perro de la correa, no lee mucho.

## Reglas (las pidió el equipo)

| Qué | Máximo |
|---|---|
| Título | 5 palabras |
| Línea de apoyo | 12 palabras |
| Botón | 1 a 3 palabras |
| Paso | 8 palabras |
| Detalle | detrás de **«Ver más»** |

Íconos y números en vez de frases. Las frases de honestidad se quedan, pero cortas (por ejemplo: «La app no cobra. Pagas directo.»). Términos, política de privacidad y condiciones **se quedan largos y completos**. Prueba para cada texto: ¿alguien lo lee en 3 segundos? Si no, se recorta o se quita.

## Cómo se haría «Ver más»

Un componente chico (`VerMas`) con `<details>` y `<summary>` nativos: sin JavaScript, funciona con teclado y lector de pantalla, zona táctil de 44 px. El detalle queda cerrado y el texto del botón dice «Ver más» / «Ver menos».

## Qué se midió

- **99 textos de pantalla con más de 12 palabras** (sin contar legal, examen ni datos de ejemplo). Por archivo: `SafetyView` 16, `WalkerOnboarding` 10, `Explore` 9, `WalkerHome` 8, `QuizStep` 8, `ProfileBuilder` 5, `LiveWalk` 4, `Onboarding` 4.
- **Fuera de la lista**, por tu regla o porque son contenido y no instrucciones: `lib/legal.ts` y `TermsBlocks` (legales); `lib/quiz.ts` (las situaciones del examen del paseador: son casos reales y se quedan; solo se acortan sus textos de alrededor); `lib/data.ts` (biografías y reseñas de **ejemplo**, que simulan texto escrito por personas).

## Los 20 textos más largos

| # | Dónde | Hoy | Propuesta |
|---|---|---|---|
| 1 | `SafetyView.tsx:57` (pregunta: qué pasa si algo sale mal) · 42 palabras | «Presiona SOS: te mostramos qué hacer, en orden, y botones para llamar a la Policía, a los Bomberos y al SAMU; y al serenazgo de tu distrito y a Patitas cuando estén configurados. La app no llama sola: tú tocas el botón.» | Título **¿Y si algo sale mal?** (5) · **Toca SOS: te decimos qué hacer y a quién llamar.** (10) · *Ver más:* «La app no llama sola: tú tocas el botón. Serenazgo y Patitas aparecen cuando estén configurados.» |
| 2 | `SafetyView.tsx:69` (qué datos ven) · 39 | «El paseador solo ve el nombre de tu perro, su ficha y el punto de recojo mientras dura el paseo. Si dejaste un contacto de emergencia, puede llamarlo si no contestas. Tu celular y tu pago no se comparten.» | Título **¿Qué datos ven?** · **Solo el nombre de tu perro, su ficha y el punto de recojo.** (12) · *Ver más:* contacto de emergencia; «Tu celular y tu pago no se comparten.» |
| 3 | `SafetyView.tsx:61` (por qué mismo tamaño) · 34 | «Por seguridad. Una diferencia grande de peso y fuerza puede lastimar a un perro pequeño o hacer que un grande arrastre al paseador. Por eso cada horario muestra de qué tamaño es el grupo.» | Título **¿Por qué el mismo tamaño?** · **Uno grande puede lastimar a uno pequeño.** (8) · *Ver más:* «Cada horario muestra el tamaño del grupo.» *(también quita «Por seguridad»)* |
| 4 | `AdminPanel.tsx:50` · 30 | «Demo: este panel lee la postulación guardada en este navegador. En el producto real tiene inicio de sesión, registra quién decidió y cuándo, y nadie fuera del equipo puede abrirlo.» | **Demo: lee la postulación de este navegador.** (7) · *Ver más:* lo del producto real. |
| 5 | `SafetyView.tsx:15` (paso «Vive en tu zona») · 30 | «Vive o estudia en San Isidro o Jesús María. Lo comprobamos con su constancia de matrícula o un recibo de servicios. Cerca de ti = llega rápido y responde rápido.» | Título **Vecino del distrito** · **Vive o estudia en San Isidro o Jesús María.** (8) · *Ver más:* constancia o recibo. *(«llega rápido y responde rápido» se quita: promesa no medible)* |
| 6 | `EmergenciaSheet.tsx:77` · 30 | «Se guarda solo en este teléfono. Si hay una emergencia y no contestas, el paseador podrá llamarlo desde su app y verá el número al llamar. En la demostración, solo si usan el mismo navegador.» | **Se guarda solo en este teléfono.** (6) · *Ver más:* «Si no contestas en una emergencia, el paseador podrá llamarlo y verá el número. En la demostración, solo en el mismo navegador.» |
| 7 | `AdminPanel.tsx:139` · 29 | «Nota: una evaluación de este tipo se puede copiar o hacer con ayuda de una IA. Por eso se repasa en la videollamada y los primeros paseos se supervisan.» | **Se puede copiar con IA: se repasa en la videollamada.** (9) |
| 8 | `WalkerOnboarding.tsx:316` (consultas oficiales) · 27 | «Todo es gratis y oficial. Haz cada consulta con tu DNI y sube la captura o el PDF. Guardamos solo el nombre del archivo en esta demo.» | **Consultas gratis y oficiales, con tu DNI.** (7) · pasos: **1 Abre el sitio · 2 Consulta con tu DNI · 3 Sube la captura** · *Ver más:* «En la demostración solo guardamos el nombre del archivo.» |
| 9 | `ProfileBuilder.tsx:223` (tarifa) · 26 | «El mercado en San Isidro va de S/ 22 a 34 por perro en grupo; en Jesús María de S/ 16 a 28. Fuente: Paseadores.pe 2026 (referencia). Durante el piloto Patitas no cobra comisión.» | **Referencia: San Isidro S/ 22–34 · Jesús María S/ 16–28.** (9) · **Sin comisión en el piloto.** · *Ver más:* fuente. |
| 10 | `SafetyView.tsx:65` (raza peligrosa) · 26 | «La Ley 27596 exige licencia municipal, bozal y correa. Trabajamos solo con paseadores capacitados para esas razas y te avisaremos cuando haya cupo en tu zona.» | Título **¿Mi perro es de raza peligrosa?** · **Por ahora no atendemos esas razas.** (6) · *Ver más:* «La Ley 27596 exige licencia municipal, bozal y correa.» ⚠ **Hoy promete paseadores capacitados y cupo; la regla del negocio es «no se atienden por ahora».** |
| 11 | `SafetyView.tsx:27` (examen) · 25 | «Un cuestionario de situaciones reales (correa, calor, un perro que se escapa). Se puntúa y las respuestas críticas las revisa una persona de nuestro equipo.» | Título **Evaluación de situaciones** · **Casos reales: correa, calor, perro que se escapa.** (8) · *Ver más:* revisión humana. |
| 12 | `Explore.tsx:23` («Vecinos verificados») · 24 | «Estudiantes que viven o estudian en tu distrito. DNI a la vista, registros públicos revisados, entrevista por video y primeros paseos acompañados por nosotros.» | Título **Vecinos del distrito** · **Estudiantes con DNI a la vista.** (6) · *Ver más:* lo demás. ⚠ Depende de la Tarea 12 («verificado»). |
| 13 | `DniSheet.tsx:57` · 24 | «Para ver el DNI completo tu cuenta debe tener teléfono verificado y ser mayor de 18 años. Crea tu cuenta y vuelve a intentarlo.» | **Crea tu cuenta para ver el DNI completo.** (8) · *Ver más:* «Pedimos teléfono verificado y ser mayor de 18.» |
| 14 | `SafetyView.tsx:23` (registros oficiales) · 23 | «Con su permiso, revisamos fuentes oficiales gratuitas: deudores alimentarios (REDAM), requisitorias de la PNP, seguimiento de denuncias del Ministerio Público y expedientes judiciales.» | Título **Registros oficiales** · **Con su permiso, revisamos fuentes públicas.** (7) · *Ver más:* la lista. |
| 15 | `DogForm.tsx:204` (aviso de raza) · 23 | «(Ley 27596). Exige licencia municipal, bozal y correa. Por ahora solo trabajamos con paseadores capacitados para esto, y te avisaremos cuando haya cupo.» | **Por ahora no atendemos esta raza.** (6) · *Ver más:* ley. ⚠ Mismo problema que el 10. |
| 16 | `WalkerHome.tsx:645` (borrar cuenta) · 23 | «Se elimina tu postulación, tu foto, tu DNI y tus documentos de este dispositivo. Es tu derecho (Ley 29733). No se puede deshacer.» | **Borra tus datos de este teléfono. No se puede deshacer.** (10) · *Ver más:* qué se borra y la ley. |
| 17 | `SafetyView.tsx:53` (cuándo se paga) · 23 | «La app no cobra ni guarda dinero. Tú y el paseador acuerdan el pago; tú decides si es antes o después del paseo.» | Título **¿Cuándo se paga?** · **La app no cobra. Pagas directo al paseador.** (8) · *Ver más:* «Tú decides si es antes o después del paseo.» |
| 18 | `SafetyView.tsx:35` (primeros paseos) · 22 | «Antes de pasear solo, sus primeros paseos los supervisa nuestro equipo. Verás la etiqueta "Nuevo · en periodo de prueba" hasta entonces.» | Título **Primeros paseos acompañados** · **Verás la etiqueta «Nuevo».** (4) |
| 19 | `WalkerHome.tsx:225` (sin paseos) · 22 | «Cuando un dueño te reserve, el paseo aparece aquí con la ficha del perro. Mantén esta pestaña abierta para recibirlo al instante.» | Título **Sin paseos por ahora** · **Aquí verás el próximo paseo.** (5) · *Ver más:* «Mantén esta pestaña abierta.» |
| 20 | `WalkerSosSheet.tsx:84` y `SosSheet` · 22 | «Los botones abren tu teléfono o WhatsApp con el mensaje ya escrito: tú lo envías. La app no llama ni escribe sola.» | **Tú envías el mensaje. La app no llama sola.** (8) |

Siguen en la lista (de 19 a 21 palabras): `SafetyView.tsx:19`, `app/layout.tsx:23`, `Explore.tsx:402`, `QuizStep.tsx:63-64`, `WalkerOnboarding.tsx:361` y `:370`, `WalkerHome.tsx:319` y `:454`, `LiveWalk.tsx:62`, `Explore.tsx:38`.

## Cosas que encontré al leer (no se tocaron)

1. **Dos textos prometen más que la regla del negocio** (#10 y #15): dicen que hay paseadores capacitados para razas potencialmente peligrosas y que avisarán cuando haya cupo. `patitas-connect` dice que esas razas **no se atienden por ahora** (y `lib/legal.ts` también). La propuesta lo corrige.
2. **#12 «Vecinos verificados»** lista cosas que todavía no existen (registros públicos revisados, entrevista por video). Depende de la Tarea 12.
3. **Plan de trabajo si hay OK:** (a) componente `VerMas` con prueba; (b) los 20 textos; (c) una pasada por los 79 restantes por pantalla, con captura antes/después; (d) una prueba que falle si un título pasa de 5 palabras o una línea de apoyo de 12.
