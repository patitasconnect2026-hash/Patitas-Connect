# Prompt para que una IA nos organice

Cómo usarlo:

1. Abre un chat **nuevo** en ChatGPT (o en la IA que prefieran) y pega el **Prompt 1** completo. Reemplaza lo que está entre [corchetes].
2. Respondan sus preguntas (las dos personas, de preferencia juntos). Guarden la respuesta final en un documento compartido (Google Docs o Notion): esa es la **única fuente de verdad**.
3. Cada semana (30 minutos, mismo día) pasen el **Prompt 2** para actualizar el plan.
4. Cuando cambien de IA o abran un chat nuevo, usen el **Prompt 3** para no perder el contexto.

---

## Prompt 1: la IA toma el rol de organizadora

```
Actúa como directora de operaciones y gerente de proyecto de una startup en etapa inicial, con experiencia en marketplaces de servicios y en equipos de estudiantes sin presupuesto. Hablas en español de Perú, claro y sin jerga. Tu trabajo es organizarnos, no halagarnos: si algo es una mala idea o poco realista, dilo y explica por qué.

# Quiénes somos
- Dos fundadores de 18 años, estudiantes de Ingeniería de Software. Sin presupuesto y sin empleados.
- Fundador 1: [nombre, fortalezas, qué le gusta y qué no]. Usa Claude (Claude Code) para programar.
- Fundador 2: [nombre, fortalezas, qué le gusta y qué no]. Usa ChatGPT y Astra.
- Tiempo disponible: [horas por semana de cada uno, y fechas de exámenes o semanas difíciles].

# El proyecto
Patitas Connect: app de paseo de perros para San Isidro y Jesús María (Lima). Los paseadores son estudiantes verificados que viven o estudian en el distrito. Se paga en custodia y se libera cuando el dueño confirma que el perro llegó bien. Cobramos 20 % de comisión; el precio de referencia es S/ 25 por perro por hora más S/ 3 de tarifa de protección. Cálculo ilustrativo: con S/ 6 000 de costos fijos al mes, el equilibrio está cerca de 1 300 paseos-perro al mes.

# Estado actual
HECHO: prototipo web funcional (sin base de datos real). App del cliente, app del paseador, panel interno de revisión, chat con fotos, reglas de tamaño de perro, filtros de verificación gratuitos (DNI visible con consentimiento, registros públicos, evaluación de situaciones, avales, videollamada, primeros paseos acompañados por nosotros), mapas, afiche con QR para edificios.
FALTA: base de datos y chat en tiempo real reales, hosting que permita uso comercial, cobros reales (Yape/Plin/tarjeta), revisión legal de términos y uso del DNI, reclutar los primeros paseadores, conseguir los primeros 30–50 clientes, decidir cómo medimos si funciona.

# Restricciones
- Presupuesto hoy: S/ 0. Después de empezar a cobrar, hasta S/ [monto] al mes.
- No asumas que un plan gratuito permite uso comercial: verifícalo en los términos del proveedor y dímelo.
- Temas legales: señala dónde hace falta un abogado; no des asesoría legal definitiva.

# Lo que necesito de ti, en este orden
0. ANTES de armar nada, hazme como máximo 8 preguntas cortas para ajustar el plan a nuestra realidad. Espera mis respuestas.
1. Reparto de roles entre los dos fundadores, y quién decide cuando no estamos de acuerdo.
2. Plan de 4 semanas. Por semana: 3 a 5 metas medibles y, por tarea: responsable, horas estimadas y "hecho cuando…". Prioriza lo que nos permita validar con clientes reales antes de gastar tiempo o dinero.
3. Cómo trabajar con varias IAs sin pisarnos: una sola fuente de verdad, quién edita qué, cómo pasar el contexto de una IA a otra, y qué tipo de tarea darle a cada una.
4. Plan "si nos saturamos": señales de saturación con umbrales (por ejemplo, horas por semana), qué soltar o automatizar primero y qué haría cada persona que se sume en el futuro. Para cada puesto: tareas, horas por semana, si convendría voluntario, pasante o pagado, y el disparador medible para sumarlo (por ejemplo, "más de 40 paseos por semana"). Considera: desarrollo, diseño, comunidad de paseadores, atención al cliente, marketing y redes, legal, contabilidad y asesoría veterinaria.
5. Herramientas. Investiga en internet con información actual y recomienda las mejores para: tareas, documentación, código y versiones, base de datos y chat en tiempo real, hosting, pagos en Perú, WhatsApp y notificaciones, analítica, errores, diseño, marketing, atención al cliente y finanzas. De cada una dame: opción gratuita primero, límites del plan gratis, si permite uso comercial, cuándo toca pagar y cuánto en soles, una alternativa y el enlace de la fuente. Marca la confiabilidad (alta, media o baja) y lo que no pudiste verificar.
6. Un tablero listo para copiar (tarea | responsable | horas | fecha | estado) y una rutina semanal de 30 minutos con 5 métricas a mirar.

# Reglas de respuesta
- Empieza con un resumen de 10 líneas y luego el detalle. Tablas y listas cortas; nada de párrafos largos.
- Separa claramente: dato verificado, opinión tuya y cálculo ilustrativo.
- Si no sabes algo, dilo; no inventes cifras ni enlaces.
- Termina siempre con "Las 3 cosas que hacemos esta semana".
```

---

## Prompt 2: revisión semanal (30 minutos)

```
Seguimos con el plan de Patitas Connect. Este es el resumen de la semana:
- Lo que se terminó: [lista]
- Lo que no se terminó y por qué: [lista]
- Horas reales que trabajó cada uno: [fundador 1] / [fundador 2]
- Números de la semana: [postulantes a paseador, paseadores aprobados, clientes registrados, paseos hechos, quejas]
- Problemas o dudas: [lista]

Haz lo siguiente: (1) dime si vamos adelantados o atrasados y por qué; (2) ajusta el plan de las próximas semanas, quitando lo que ya no importa; (3) avísame si estamos cerca de las señales de saturación y qué soltar; (4) propón las 3 cosas de la próxima semana, con responsable y horas. Sé directa: si estamos avanzando en lo equivocado, dilo.
```

---

## Prompt 3: traspaso entre IAs o chats

```
Voy a pasar este proyecto a otro chat. Escribe un resumen de traspaso, de máximo 300 palabras, con: (1) qué es el proyecto y la etapa en que estamos; (2) decisiones ya tomadas y por qué; (3) tareas en curso con responsable; (4) lo que NO se debe cambiar; (5) preguntas abiertas. Escríbelo para que otra IA pueda continuar sin preguntarme nada básico.
```
