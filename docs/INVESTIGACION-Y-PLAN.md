# Patitas Connect · Investigación de mercado, plan de salida y la realidad

*Octubre 2026. Investigación hecha con fuentes públicas de internet. Cada cifra dice de dónde viene y qué tan confiable es. Lo que son cálculos míos está marcado como **cálculo ilustrativo**: úsalo para pensar, no como dato.*

> **Actualización (v3):** los filtros de verificación cambiaron. En esta investigación aparecen antecedentes pagados y un test psicológico; como hoy no hay presupuesto ni psicólogo, la app usa filtros gratuitos y honestos: DNI visible con consentimiento, registros públicos gratuitos, evaluación de situaciones, avales, videollamada y primeros paseos acompañados. El detalle vigente está en [`FILTROS-Y-PERFIL-PASEADORES.md`](FILTROS-Y-PERFIL-PASEADORES.md); los límites de infraestructura, en [`CAPACIDAD.md`](CAPACIDAD.md).

---

## 0. El veredicto en 10 líneas

1. **La oportunidad es real pero estrecha.** Hay muchos perros, gente con plata y pocas plataformas serias de paseo. Pero Lima ya tiene competidores y, sobre todo, el competidor de verdad es el WhatsApp del vecino.
2. **Tu ventaja no es la app, es la confianza hiperlocal:** estudiantes que viven o estudian en el mismo distrito, verificados, que llevan perros del mismo tamaño. Eso casi nadie lo comunica bien.
3. **El mayor riesgo no es técnico: es la retención.** Una app de paseos que la gente usa una vez muere. Hay que vender planes recurrentes (lunes a viernes) desde el primer día.
4. **El segundo riesgo es un incidente grave** (mordida, pérdida, accidente). Una sola mala noticia en un distrito chico puede acabar la marca. Por eso importan el seguro, el protocolo y no prometer "100 % seguro".
5. **"Pago en custodia" en Perú no es trivial.** Retener plata de terceros puede ser actividad regulada. Empiecen cobrando a la cuenta de la empresa (Yape/Plin/tarjeta) y pagando a los paseadores cada semana. Consulten a un abogado antes de llamarlo "escrow".
6. **La regulación importa:** razas peligrosas (Ley 27596), posibles registros municipales y límite de perros por paseador (Miraflores ya lo tiene), datos personales (Ley 29733) y la relación con paseadores independientes.
7. **La economía alcanza si hay densidad.** Con los números de abajo (ilustrativos) el equilibrio está en unos 100–150 clientes recurrentes.
8. **El canal de afiches en edificios es buena idea, con cuidado:** pidan permiso a la administración, midan cada edificio con su propio QR y no le den datos de residentes a nadie.
9. **Realidad técnica:** en iPhone una web app no sigue la ubicación en segundo plano. Para el GPS real del paseador necesitarán una app nativa (o mantener la pantalla encendida).
10. **Lo que tienen hoy es un prototipo muy bueno para vender y validar**, no un producto. Antes de construir el backend, hagan 20 paseos "a mano" con WhatsApp y midan.

---

## 1. El mercado

| Dato | Cifra | Fuente (confiabilidad) |
|---|---|---|
| Hogares peruanos con mascota | **58 %** | [Ipsos vía La Cámara](https://lacamara.pe/un-58-de-hogares-peruanos-tienen-mascotas/) (alta) |
| De esos hogares, con perro | **88 %** (gato 38 %) | Ipsos, mismo estudio (alta) |
| Lima | **1 de cada 2 hogares** tiene mascota | Estudio de Clientes Anónimos citado en [Gestión](https://gestion.pe/economia/empresas/gasto-en-mascotas-en-lima-crece-mas-del-50-aumento-su-presupuesto-anual-noticia/) (media) |
| Gasto mensual por mascota | **S/ 350–500** (cuidado total); en Lima el 74 % gasta S/ 100–400 | Gestión (media) |
| En qué se gasta | 85 % comida, 12 % veterinaria, **solo ~3 % servicios y accesorios** | Gestión / Ipsos (media) |
| Mercado de cuidado de mascotas | US$ 456 M (2023) → **US$ 680 M hacia 2028**; +9,4 % en 2024 | [Forbes Perú](https://forbes.pe/negocios/2024-04-29/el-mercado-de-mascotas-en-peru-facturaria-us680-millones-hacia-el-2028-estas-son-las-razones-de-su-continuo-crecimiento/) (media-alta) |
| Perfil del dueño | Millennials sin hijos; "humanización" de la mascota | Forbes Perú (alta) |
| Billeteras digitales | **Yape 20 M+**, Plin 8 M; 67 % de adultos tiene billetera | [Mercado Negro](https://www.mercadonegro.pe/actualidad/billeteras-digitales-en-peru-analisis-del-aumento-de-usuarios-y-volumen-de-transacciones/) / Paysafe (media) |

**Lo que significa:** hay demanda y hay dinero, pero los **servicios** (como el paseo) son una parte muy pequeña del gasto. Eso es oportunidad (mercado por educar) y riesgo (la gente aún no está acostumbrada a pagar por esto de forma recurrente). Pagar digital con Yape/Plin ya no es una barrera: es una expectativa.

### Los dos distritos
- **San Isidro:** centro financiero de Lima, familias de nivel alto. Zona de mayor poder adquisitivo.
- **Jesús María:** residencial, con mucho edificio de departamentos y la Universidad del Pacífico (Av. Salaverry 2020, ~5 000 estudiantes): **cantera natural de paseadores vecinos**.
- Dato de nivel socioeconómico: según [APEIM 2012](https://apeim.com.pe/wp-content/uploads/2022/08/APEIM-NSE-2012.pdf), la zona de Miraflores/San Isidro/San Borja/Surco/La Molina concentraba el 56,6 % del NSE A, y la zona de Jesús María/Lince/Pueblo Libre/Magdalena/San Miguel el 14,8 %. **Es un dato viejo (2012)**: úsenlo solo como orientación.
- Lugares de paseo reales (OpenStreetMap): Bosque El Olivar (San Isidro); Campo de Marte (Jesús María, 68 850 m², con "Parque de las Mascotas" y la feria Pet Fest). Están cargados en el mapa de la app.

### Precios de referencia
| Fuente | Qué dice |
|---|---|
| [Paseadores.pe](https://paseadores.pe/blog/cobrar-por-paseo-grupal-vs-individual-precios) (2026, blog de un competidor: tómalo como orientativo) | **San Isidro:** individual S/ 30–55 según tamaño; grupal **S/ 22–34 por perro**. **Jesús María:** individual S/ 22–48; grupal **S/ 16–28 por perro**. |
| [Infobae](https://www.infobae.com/peru/2024/09/26/cuanto-gana-un-paseador-de-perros-en-peru-al-mes-este-es-el-precio-que-se-cobra-por-hora/) (2024) | El paseador informal cobraba ~S/ 10 y ya sube a **S/ 15–18 por perro por hora**. |
| [Penthouse.pe](https://penthouse.pe/mascotas-premium-penthouses-lima-pet-friendly/) (2026, blog inmobiliario) | Clientes premium: individual S/ 35–60; grupal S/ 25–40; paquetes mensuales con **15–20 % de descuento**. |

**Mi lectura:** S/ 25 por perro por hora está en el rango alto para Jesús María y en el medio de San Isidro. Para empezar, sugiero **San Isidro S/ 28–30** y **Jesús María S/ 24–26** por perro en grupo. No bajen el precio para "ganar" clientes: el que busca lo más barato no es su cliente.

---

## 2. Competencia en Lima

| Quién | Qué es | Lo que se ve |
|---|---|---|
| **Paseadores.pe** | Marketplace con perfiles, reseñas y tarifas en soles | El más parecido. Presenta "identidad validada". |
| **MiPaseador** | App mexicana, también en Perú | GPS en vivo y "paseadores certificados". |
| **Dimu, Lima Perruna** | Servicios de paseo y cuidado | Locales y pequeños. |
| **Gudog, PetBacker** | Directorios / marketplaces internacionales | Perfiles de freelancers. |
| **Mywak** | App colombiana que llegó a Perú en 2019 | Con GPS y modalidades (VIP individual, Pro hasta 4 perros certificados). **10 345 descargas y solo 241 usuarios recurrentes** ([Infomercado](https://infomercado.pe/llega-a-peru-mywak-la-app-movil-que-pasea-a-tus-mascotas/)): ~2 % de retención. |
| **Grupos de Facebook y WhatsApp** | Paseadores del barrio por boca a boca | **El verdadero competidor.** Cero verificación, pero cero fricción. |

Según [Paseadores.pe](https://paseadores.pe/blog/apps-de-paseadores-de-perros-internacionales-vs-peru), lo que **Rover y Wag hacen y en Perú casi no existe**: verificación de antecedentes robusta, seguros, fotos automáticas y reseñas en las dos direcciones.

**Referencia internacional (Rover):** cobra ~20–25 % al paseador y ~15 % de tarifa al dueño; aprueba a menos del 20 % de los postulantes y respalda cada reserva con una garantía de hasta US$ 25 000 en gastos veterinarios (fuente: [PetCareIns](https://www.petcareins.com/blog/rover-com-review-is-it-a-game-changer-for-dog-walkers-and-sitters), confiabilidad media). Es la vara de seguridad con la que los clientes exigentes los van a comparar.

**Dónde pueden ganar:** (1) paseadores que son **vecinos y estudiantes**, (2) **grupos del mismo tamaño**, (3) **portería como aliada**, (4) ficha del perro y chapita QR, (5) transparencia total (GPS, fotos, bitácora).

---

## 3. Cómo saber que son "buena gente": los 7 filtros

Así quedó en la app (pestaña Seguridad) y así lo recomiendo operar:

1. **Vecino del distrito.** Vive o estudia en San Isidro o Jesús María (constancia de matrícula o recibo de servicios). Cerca = llega rápido y tiene reputación que cuidar.
2. **Identidad real.** DNI validado + selfie con prueba de vida.
3. **Antecedentes.** Penales (Poder Judicial, **S/ 40,40** en línea, vigencia 90 días), judiciales (INPE, **S/ 37,70**) y policiales (PNP, **S/ 17**). Total ≈ **S/ 95 por paseador** ([Infobae](https://www.infobae.com/peru/2026/06/12/antecedentes-penales-en-peru-como-sacar-el-certificado-por-internet-cuanto-cuesta-el-tramite-y-que-hacer-si-aparece-observado/), [Trámites Perú](https://tramitesperu.com/pj/antecedentes-penales/)). Decidan quién lo paga: yo lo asumiría como costo de adquisición para los primeros 20 paseadores.
4. **Test psicológico** aplicado por un psicólogo colegiado. Cotícenlo; no encontré un precio confiable.
5. **Entrevista por video y dos referencias** reales.
6. **Capacitación y paseo de prueba:** lenguaje corporal canino, primeros auxilios y un paseo acompañado.
7. **Seguimiento continuo:** primeros 10 paseos supervisados, calificación mínima (propongo 4,7) y re-verificación cada 6 meses.

**Realidad:** ningún filtro elimina el riesgo, lo reduce. Por eso necesitan además: **seguro de responsabilidad civil** (Miraflores lo exige para registrar paseadores), un **protocolo de incidentes** y un lenguaje honesto: digan **"verificado"**, no **"100 % seguro"** ni **"garantizado"**. Prometer de más es el tipo de cosa que Indecopi sanciona y que destruye la confianza en el primer problema.

---

## 4. Reglas y ley en Perú (lo que encontré y lo que falta confirmar)

> No soy abogado. Esto es una guía para saber qué preguntar. Consulten a un abogado antes de lanzar.

- **Razas potencialmente peligrosas (Ley 27596 y su reglamento, D.S. 006-2002-SA):** Pitbull Terrier, Dogo Argentino, Fila Brasileño, Tosa Inu, Bullmastiff, Dóberman y Rottweiler. Exigen licencia municipal, bozal, correa y microchip. Miraflores multa hasta el 50 % de una UIT por pasearlos sin bozal. **Decisión en la app:** no se pasean al inicio; el sistema lo bloquea y ofrece avisar cuando haya paseadores capacitados.
- **Máximo de perros por paseador:** **Miraflores** limita a **3** y pide registro municipal y seguro de responsabilidad civil; multa de S/ 430 por pasear más ([reporte](https://lpderecho.pe/pasear-mascota-normas-vigentes-multas/)). **No pude confirmar la regla de San Isidro ni la de Jesús María**: pidan una consulta escrita a ambas municipalidades. Nuestro límite de 2–3 perros ya cumple lo de Miraflores.
- **Parques:** tampoco pude confirmar las reglas para perros del Bosque El Olivar ni los horarios. Verifíquenlo antes de prometer "paseos en El Olivar".
- **Datos personales (Ley 29733 y su reglamento de 2024):** DNI, selfie y datos de salud son datos sensibles. Necesitan consentimiento expreso, registrar el banco de datos ante la autoridad y reportar incidentes de seguridad. La app ya pide consentimiento en el registro; falta la política completa.
- **Paseadores independientes:** emiten **recibo por honorarios electrónico** con RUC; el que paga retiene **8 %** si el honorario pasa de S/ 1 500, salvo suspensión de retenciones (se puede pedir si proyectan menos de ~S/ 40 250 al año) ([La Cámara](https://lacamara.pe/pautas-para-solicitar-a-sunat-suspension-de-retenciones-del-ir-de-cuarta-categoria/)). **Cuidado:** si les imponen turnos, uniforme y exclusividad, podrían verse como empleados. Diseñen la relación como "disponibilidad" que ellos eligen.
- **Libro de Reclamaciones, términos y condiciones, política de reembolso:** son obligatorios o muy recomendables para vender servicios. Verifiquen con un abogado cómo aplica a una web.
- **Marca:** revisen disponibilidad en Indecopi y el dominio antes de imprimir afiches.

### El "pago en custodia"
Opciones reales de cobro en Perú: **Culqi** (3,44 % + IGV, sin mensualidad, el más accesible), **Izipay** (3,44 % + IGV), **Niubiz** (tiene pagos divididos, 3,5–5 % + S/ 0,30) y **Mercado Pago**; los depósitos tardan de inmediato a 4 días según la pasarela ([comparativa](https://ecommerceacademy.pe/pasarelas-de-pago-en-peru-2025-comparativa-completa-de-culqi-niubiz-mercado-pago-y-payu/)).

**Lo que haría yo al inicio:** cobrar a la cuenta de la empresa (tarjeta o Yape/Plin) al reservar, y **pagar al paseador cada semana** después de que el dueño confirme la llegada. Es "cobro con liquidación diferida", no un fideicomiso. Retener fondos de terceros como servicio puede requerir autorización de la SBS: **consulten a un abogado fintech antes de usar la palabra "escrow" en publicidad.** Para tarjetas existe además la opción técnica de autorizar y capturar al final.

---

## 5. Economía: ¿sale a cuenta? (**cálculo ilustrativo**)

Supuestos: precio S/ 25 por perro por hora; comisión **20 %** al paseador; tarifa de protección **S/ 3** al cliente; precios con IGV (18 %); pasarela 3,44 % + IGV.

| Concepto | Por paseo-perro (1 h) |
|---|---|
| El cliente paga | S/ 28,00 (25 + 3) |
| El paseador recibe (80 % de 25) | **S/ 20,00** |
| Ingreso bruto de Patitas (5 + 3) | S/ 8,00 |
| Sin IGV (÷ 1,18) | S/ 6,78 |
| Pasarela (~4,1 % de 28) | − S/ 1,14 |
| Soporte y seguro (estimado) | − S/ 1,00 |
| **Contribución** | **≈ S/ 4,60** |

- **Para el paseador es muy atractivo:** con un grupo de 3 perros gana **S/ 60 por hora** de paseo, contra S/ 15–18 de un paseador informal. Esa es su mejor arma para reclutar estudiantes buenos.
- **Para ustedes la contribución es delgada.** Si sus costos fijos fueran S/ 6 000 al mes (marketing, soporte, verificaciones, seguro, hosting), el equilibrio sería ≈ **1 300 paseos-perro al mes** (≈ 60 por día hábil, ~20 paseos de grupo). Eso son unos **100–150 clientes recurrentes** (2–3 paseos por semana). Realista en 6–9 meses **si la retención funciona**.
- Palancas: subir tarifa de protección a S/ 4–5, cobrar 25 % al paseador, vender planes semanales (más volumen por cliente) y servicios de mayor margen (baño, cuidado en casa).

**Tamaño de mercado (muy ilustrativo):** si entre ambos distritos hubiera ~40 000 hogares, 58 % con mascota y 88 % de esos con perro serían ~20 000 hogares con perro. Si solo el 5 % contrata paseos de forma regular → ~1 000 clientes posibles. Es un mercado **chico pero suficiente para un negocio sano y para validar** antes de ir a otros distritos. (Verifiquen el número de hogares con el Censo.)

---

## 6. Cómo conseguir los primeros clientes

### Fase 0 · 3 semanas · "concierge" (sin app)
- Reclutar **6–10 paseadores** (empiecen por la Universidad del Pacífico, que está en Jesús María).
- Hacer **20 paseos** con vecinos conocidos coordinados por WhatsApp. Cobrar por Yape.
- Medir: cuántos repiten, qué les preocupa, cuánto pagarían, a qué hora. **Esto vale más que cualquier encuesta.**

### Fase 1 · Edificios (el afiche)
Tu idea de afiches con los guardias es buena, con tres ajustes:
1. **Pidan permiso a la administración o junta de propietarios.** Muchos edificios prohíben publicidad. Si el portero reparte sin permiso, el problema es del portero.
2. **Hagan del portero un aliado, no un buzón.** Que no entregue datos de residentes (privacidad). Dale un incentivo transparente (propongo S/ 5–10 por cliente que complete su primer paseo) y que su rol sea **el check-in y check-out del perro**, lo que además aumenta la confianza.
3. **Un QR distinto por edificio.** Ya está hecho: abre [/afiche?e=Nombre del edificio&c=CÓDIGO](http://localhost:3000/afiche?e=Torre%20Los%20Olivos&c=OLIVOS) (imprimible en A4). El QR abre la app con el código ya puesto y S/ 10 de descuento. Así miden qué edificios convierten.

Dónde más: ascensores y paneles, veterinarias y pet shops, cafeterías pet friendly, gimnasios, clínicas veterinarias 24/7, y **los propios parques** (paseadores con chaleco naranja y logo en El Olivar y Campo de Marte: publicidad que camina; pidan permiso municipal). La **feria Pet Fest** en Campo de Marte es un buen lugar para un stand.

*Embudo de ejemplo para planear (**ilustrativo**, midan el real):* 500 afiches → ~20 escaneos → ~8 registros → ~4 primeros paseos → ~2 clientes recurrentes.

### Fase 2 · Digital
Instagram/TikTok con contenido del barrio ("Max en El Olivar"), perfil de Google Business ("paseador de perros San Isidro"), WhatsApp Business, grupos de vecinos y **alianzas con veterinarias** que recomienden.

### Retención (lo más importante)
Plan lunes–viernes con **el mismo paseador**, álbum del paseo, recordatorios de vacunas y una reseña después de cada paseo.

### Métricas a mirar cada semana
Activación (1.er paseo), recompra a 14 días, % de clientes recurrentes, calificación promedio, incidentes por 1 000 paseos, ocupación de paseadores y tiempo de respuesta.

---

## 7. Ideas para que no sea "solo un paseo"

Ordenadas de más fácil y barato a más ambiciosa. Marqué lo que **ya está en el prototipo**.

1. ✅ **Chapita QR** para el perro: seguridad (si se pierde, el QR lo trae de vuelta) y marketing ambulante: cada perro del barrio lleva su marca. Cotiza el costo unitario.
2. ✅ **Ficha digital del perro** (tamaño, carácter, salud, instrucciones). Después: **recordatorios de vacunas** (retención gratis).
3. ✅ **Plan lunes a viernes** con el mismo paseador y 10 % de descuento.
4. ✅ **Portería aliada:** entrega y recojo con el portero, con foto y hora.
5. **Álbum / reel mensual** automático con las fotos del paseo para compartir en Instagram (crecimiento orgánico).
6. **Paseo + baño al volver** con una peluquería aliada (margen alto, mismo paseador).
7. **Cuidado en casa cuando viajan** (ticket alto; ya construyeron la confianza).
8. **Transporte a la veterinaria** (los edificios premium lo piden, según Penthouse.pe).
9. **Revisión de salud visual** de 5 puntos en cada paseo (cojera, ojos, pelaje, hidratación, ánimo) con alerta al dueño. **Sin diagnosticar**: eso es de un veterinario.
10. **Paseos de socialización de cachorros** con una adiestradora.
11. **Patitas Club:** suscripción mensual (paseos + baño + chapita + seguro).
12. **Seguro de mascota** en alianza (hay startups como Pawer desde 2023 en Perú).
13. **Edificios certificados Patitas:** la administración paga una membresía y los residentes tienen tarifa; instalan lavapatas y zona de entrega.

**Mi apuesta para diferenciarlos:** la combinación **vecino verificado + grupos del mismo tamaño + chapita QR + portería + ficha del perro**. En las páginas de los competidores que revisé no vi esa combinación (no pude revisarlas todas).

---

## 8. La realidad, sin adornos

- **La retención decide todo.** Mywak tuvo ~2 % de usuarios recurrentes. Diseñen para la recurrencia, no para el primer paseo.
- **Pocos paseadores buenos valen más que muchos.** El primer paseador que falle le pone cara a su marca. Empiecen con 6–10 y cuídenlos.
- **Un incidente grave puede acabar el negocio.** Preparen: protocolo, seguro, doble correa, no soltar perros en zonas sin cerco, y protección para el paseador también.
- **Estacionalidad:** en verano (ene–mar) muchos viajan; con calor extremo hay que mover horarios tempranos. En invierno la garúa baja la demanda.
- **El mercado inicial es chico a propósito.** Es una ventaja (densidad, boca a boca) y un techo. Planeen el segundo distrito solo cuando el primero repita.
- **Lo que hoy es simulado en el prototipo:** el pago, el GPS, la disponibilidad de horarios, las reseñas de ejemplo y las fotos del paseo. La cuenta, los perros y tus reseñas sí se guardan, pero solo en tu navegador.
- **Realidad técnica del GPS:** una web app en iPhone **no puede seguir la ubicación en segundo plano**. Para el paseador necesitarán una **app nativa** (Expo/React Native) o pedirle que mantenga la pantalla encendida. Para el dueño, la web alcanza.
- **Mapas:** hoy usan los mosaicos públicos de OpenStreetMap (sin clave, para demo). Para publicar, usen un proveedor con plan (MapTiler, Stadia, Mapbox) o su propio servidor. Los mosaicos de CARTO que probé ahora exigen clave.

### Arquitectura recomendada para pasar de prototipo a producto
- **Web:** Next.js (ya lo tienen) en Vercel.
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime) o Firebase. Acceso por celular con código por WhatsApp/SMS.
- **App del paseador:** Expo (React Native) para GPS en segundo plano y cámara.
- **Pagos:** Culqi o Izipay con liquidación semanal a paseadores.
- **Notificaciones:** push (PWA/Expo) y WhatsApp.
- **Mapas:** proveedor con plan + rutas peatonales de OpenStreetMap.
- **Fotos:** almacenamiento en la nube con enlaces privados y limpieza periódica.
- **Seguridad:** roles (dueño, paseador, soporte), registro de auditoría y borrado de datos a pedido.

### Plan de 90 días
1. **Semanas 1–3:** concierge con WhatsApp, 6–10 paseadores, 20 paseos, registro de aprendizajes.
2. **Semanas 4–6:** formalizar (RUC, términos, política, consulta a municipalidades, cotizar seguro, elegir pasarela). Primer lote de afiches en 5 edificios con permiso.
3. **Semanas 7–10:** construir el backend mínimo (cuenta, perros, reservas, pagos, chat) y la app del paseador.
4. **Semanas 11–13:** lanzamiento suave con 30–50 clientes. Medir retención y ajustar precio.

### Preguntas para validar con 20 vecinos
¿Cuánto pagan hoy por pasear a su perro? ¿Qué es lo que más les da miedo? ¿Prefieren a un estudiante vecino o a un profesional? ¿Pagarían un plan semanal? ¿Qué horarios necesitan? ¿Confiarían la llave a la portería?

---

## Fuentes principales
- [Ipsos / La Cámara: 58 % de hogares con mascota](https://lacamara.pe/un-58-de-hogares-peruanos-tienen-mascotas/)
- [Gestión: gasto en mascotas en Lima](https://gestion.pe/economia/empresas/gasto-en-mascotas-en-lima-crece-mas-del-50-aumento-su-presupuesto-anual-noticia/)
- [Forbes Perú: mercado de mascotas hacia 2028](https://forbes.pe/negocios/2024-04-29/el-mercado-de-mascotas-en-peru-facturaria-us680-millones-hacia-el-2028-estas-son-las-razones-de-su-continuo-crecimiento/)
- [Infobae: cuánto gana un paseador en Perú (2024)](https://www.infobae.com/peru/2024/09/26/cuanto-gana-un-paseador-de-perros-en-peru-al-mes-este-es-el-precio-que-se-cobra-por-hora/)
- [Paseadores.pe: tarifas 2026](https://paseadores.pe/blog/cobrar-por-paseo-grupal-vs-individual-precios) y [apps en Perú](https://paseadores.pe/blog/apps-de-paseadores-de-perros-internacionales-vs-peru)
- [Penthouse.pe: mascotas premium en Lima](https://penthouse.pe/mascotas-premium-penthouses-lima-pet-friendly/)
- [Infomercado: Mywak llega a Perú](https://infomercado.pe/llega-a-peru-mywak-la-app-movil-que-pasea-a-tus-mascotas/)
- [LP Derecho: normas para pasear mascotas](https://lpderecho.pe/pasear-mascota-normas-vigentes-multas/)
- [Antecedentes penales en Perú (Infobae)](https://www.infobae.com/peru/2026/06/12/antecedentes-penales-en-peru-como-sacar-el-certificado-por-internet-cuanto-cuesta-el-tramite-y-que-hacer-si-aparece-observado/) y [Trámites Perú](https://tramitesperu.com/pj/antecedentes-penales/)
- [Pasarelas de pago en Perú 2025](https://ecommerceacademy.pe/pasarelas-de-pago-en-peru-2025-comparativa-completa-de-culqi-niubiz-mercado-pago-y-payu/)
- [Yape y Plin: usuarios y pagos](https://www.mercadonegro.pe/actualidad/billeteras-digitales-en-peru-analisis-del-aumento-de-usuarios-y-volumen-de-transacciones/)
- [APEIM: niveles socioeconómicos (2012)](https://apeim.com.pe/wp-content/uploads/2022/08/APEIM-NSE-2012.pdf)
- [La Cámara: suspensión de retenciones de cuarta categoría](https://lacamara.pe/pautas-para-solicitar-a-sunat-suspension-de-retenciones-del-ir-de-cuarta-categoria/)
- Mapas y rutas: © colaboradores de OpenStreetMap (ODbL).
