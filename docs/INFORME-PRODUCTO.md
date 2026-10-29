# Patitas Connect: informe completo del producto

Versión del documento: prototipo v3 · 7 de octubre de 2026
Documento solo de texto, pensado para que lo lea una persona o una IA (por ejemplo ChatGPT) sin necesidad de ver imágenes.

## Cómo leer este informe

Cada afirmación importante lleva una etiqueta para que no se confunda lo que existe con lo que falta:

- [HECHO]: existe en el producto y se probó.
- [SIMULADO]: se ve y funciona en el prototipo, pero con datos de ejemplo o dentro del navegador; no es real todavía.
- [PENDIENTE]: no existe aún y hay que construirlo o decidirlo.
- [SUPUESTO]: cálculo o estimación propia, no un dato verificado. Hay que validarlo con clientes y números reales.
- [BORRADOR]: texto legal escrito como guía; lo debe revisar un abogado antes de usarse con clientes reales.

## 1. Ficha del producto

- Nombre: Patitas Connect.
- Frase: "El paseo seguro que tu mejor amigo merece."
- Qué es: un marketplace (mercado en línea) de paseadores de perros para San Isidro y Jesús María, en Lima, Perú. Los paseadores son estudiantes verificados que viven o estudian en el mismo distrito que el dueño.
- Quién lo hace: dos fundadores de 18 años, estudiantes de Ingeniería de Software, sin presupuesto y sin empleados. Trabajan con ayuda de inteligencia artificial.
- Etapa: prototipo de alta fidelidad (se ve y se siente como una app real) para presentarlo a clientes, validar el negocio y recibir comentarios. No es todavía un producto con base de datos ni cobros reales.
- Formato: página web que funciona como app en el celular (PWA) y se ve en un marco de teléfono en computadora.
- Mascota y marca: Chasqui, un perro dorado con chullo (gorro andino). El chasqui era el mensajero que corría los caminos del Tahuantinsuyo.
- Colores: naranja de marca (#ea580c), tinta azul oscuro (#0f172a), crema (#fbf6ee), verde bosque (#146c43).
- Tipografías: Fraunces (títulos, con carácter) y Figtree (texto).

### Piezas del producto (rutas de la página web)

- Ruta "/": app del cliente (dueño del perro).
- Ruta "/paseador": app del paseador (postulación y trabajo diario).
- Ruta "/admin": panel interno de revisión para los fundadores.
- Ruta "/marca": hoja de marca (logos y mascota).
- Ruta "/afiche": afiche A4 imprimible con código QR por edificio.
- Ruta "/icon": ícono de la app generado automáticamente.
- Ruta "/manifest.webmanifest": permite "Agregar a pantalla de inicio".
- Pantallas de error amables (error, error global, página no encontrada).

### Tecnología

- Next.js 16 (App Router), React 19, TypeScript 7, Tailwind CSS 4, Framer Motion 14 (animaciones), Lucide (íconos), Leaflet con mosaicos de OpenStreetMap (mapas), librería qrcode.
- Todas las páginas se generan como estáticas (archivos listos), salvo "/afiche" que se arma al pedirla.
- Los datos se guardan en el navegador (localStorage). No hay servidor de datos propio todavía.

## 2. Resumen ejecutivo

1. Patitas Connect resuelve la desconfianza al dejar al perro con un desconocido. Lo hace con paseadores del barrio, verificados con filtros gratuitos y honestos, perros agrupados siempre por el mismo tamaño, pago retenido hasta que el perro llega bien a casa, y seguimiento con fotos, chat y mapa.
2. El producto tiene tres caras conectadas: app del cliente, app del paseador y panel interno de revisión. Las dos primeras se hablan en vivo (chat, fotos, avisos y estado del paseo) cuando se abren en dos pestañas del mismo navegador. [SIMULADO] La comunicación real entre dos celulares distintos necesita una base de datos con tiempo real.
3. El diferenciador es la combinación de: vecino verificado, DNI visible con consentimiento, grupos del mismo tamaño, portería como aliada, ficha del perro con chapita QR y transparencia total del paseo.
4. La economía es delgada pero posible: el paseador gana mucho más que en la informalidad (S/ 40 por hora con 2 perros a S/ 25) y a Patitas le quedan aproximadamente S/ 4,60 por paseo-perro. [SUPUESTO] El equilibrio estaría cerca de 1 300 paseos-perro al mes, unos 100 a 150 clientes recurrentes.
5. La web casi no se cae: aguantó unas 4 500 visitas por segundo con 500 personas conectadas, sin errores. El límite real vendrá del servicio de datos (base de datos, chat, fotos) cuando exista; con el plan gratuito de Supabase cabrían unos 200 clientes recurrentes.
6. Hay tres advertencias importantes: el plan gratuito de Vercel (Hobby) prohíbe uso comercial; los textos legales son borradores; y el panel interno todavía no tiene inicio de sesión.

## 3. El problema, el público y la propuesta de valor

### El problema

- Dejar a un perro con un paseador desconocido da miedo: ¿es quien dice ser?, ¿trata bien al perro?, ¿lo mezcla con perros más grandes?, ¿realmente lo sacó?
- Hoy el competidor principal son los grupos de WhatsApp y Facebook del barrio: cero verificación pero cero fricción.
- Para el paseador estudiante, no hay una forma ordenada de ganar dinero cerca de su casa o universidad con reglas claras.

### Público

- Cliente: dueños de perros en San Isidro y Jesús María, muchos en edificios con portería, con poder adquisitivo medio y alto, que trabajan fuera de casa.
- Paseador: estudiantes universitarios o de instituto que viven o estudian en esos distritos (por ejemplo la Universidad del Pacífico está en Jesús María).
- Aliados: porteros y administraciones de edificios, veterinarias, tiendas de mascotas.

### Propuesta de valor (lo que se promete y sí se cumple en el prototipo)

- Vecinos verificados: DNI a la vista, registros públicos revisados, entrevista por video y primeros paseos acompañados.
- Mismo tamaño siempre: nunca se mezclan perros pequeños, medianos y grandes en un grupo. Máximo 2 o 3 perros por paseo.
- Pago en custodia: el paseador cobra solo cuando el dueño confirma que el perro llegó sano y salvo. [SIMULADO] Ningún cobro es real. [BORRADOR] La palabra "escrow" debe consultarse con un abogado antes de usarse en publicidad.
- Transparencia: mapa en vivo, bitácora con eventos, fotos obligatorias (perro jugando y perro tomando agua), chat con fotos y botón de emergencia (SOS).
- Seguridad práctica: código de recojo (PIN de 4 dígitos) que el dueño le da al paseador al entregar a su perro.

## 4. Mapa de uso: cómo se ve y se abre

- En el celular, la página ocupa toda la pantalla y se siente como una app nativa. Se puede agregar a la pantalla de inicio.
- En computadora, la app se muestra dentro de un marco de teléfono. A la izquierda hay un panel con el logo, el mensaje de marca, tres razones de confianza y un "truco de demostración" que explica cómo abrir dos pestañas (cliente y paseador) para ver el chat y el paseo sincronizados.
- Cómo abrirla en la computadora de los fundadores: instalar Node.js, abrir la Terminal y ejecutar `cd "/Users/jhudacipriano/Carpeta de Claude/patitas-connect" && npm run dev`; luego abrir http://localhost:3000. Si da error de Turbopack, usar `npx next dev --webpack`.

## 5. App del cliente ("/") pantalla por pantalla

### 5.1 Bienvenida y creación de cuenta (6 pasos)

Pantalla de bienvenida [HECHO]:
- Fondo naranja con huellas, Chasqui en un círculo crema, nombre "Patitas connect" y la frase de marca.
- Tres beneficios: paseadores verificados del distrito, pago en custodia, GPS y fotos en vivo.
- Botones, en este orden: "Crear mi cuenta", "Crear cuenta de paseador" (lleva a "/paseador") y "Ya tengo cuenta · usar cuenta de demostración".
- Si el cliente llegó por el QR de un afiche, aparece "Código XXX aplicado · S/ 10 en tu primer paseo".

Los seis pasos de la cuenta:
1. Celular: prefijo +51, 9 dígitos. Texto: "Un celular = una cuenta. Así evitamos cuentas falsas y bromas."
2. Código de 6 dígitos: se verifica solo al completarlo. [SIMULADO] El código de demostración es 482913 y no se envía ningún SMS.
3. Datos personales: nombre, apellido, fecha de nacimiento (debe ser mayor de 18 años; si no, no avanza), distrito (San Isidro o Jesús María), calle y departamento, interruptor "Mi edificio tiene portería" con nombre del portero opcional, "¿Cómo nos conociste?" y código de invitación opcional.
4. Términos y condiciones en 6 bloques cortos [BORRADOR]: (a) tengo 18 años o más y mis datos son verdaderos; (b) la información de mi perro es verdadera (razas potencialmente peligrosas no se atienden por ahora); (c) entiendo cómo funcionan los pagos y cancelaciones (pago al reservar, el paseador cobra al confirmar la llegada, cancelación gratis hasta 2 horas antes); (d) trato respetuoso, sin reservas falsas ni bromas; (e) acepto cómo se usan mis datos (el paseador ve el nombre y la ficha del perro y el punto de recojo solo durante el paseo; nunca ve el celular); (f) entiendo que pasear perros tiene riesgos. Cada bloque tiene una frase clara, una casilla propia y un texto completo desplegable. Hay un botón "Aceptar todos". No se puede avanzar sin marcar los seis. Se guarda la versión de los términos y la fecha de aceptación.
5. Ficha del perro: foto, nombre, raza (14 opciones, incluida una de razas potencialmente peligrosas que se bloquea), tamaño (pequeño hasta 10 kg, mediano 10 a 25 kg, grande más de 25 kg) con la nota "Por seguridad, un perro solo pasea con otros de su mismo tamaño", edad, sexo, color de pelaje (5), carácter (8 etiquetas como "sociable con perros", "jala la correa", "se asusta con ruidos"), si puede ir en grupo, vacunas, esterilizado, notas, salud y alergias, veterinario. Se puede dejar "para después".
6. Listo: resumen de lo que ya tiene (cuenta en su distrito, perro registrado, S/ 10 de descuento en el primer paseo, chapita QR para su perro con la primera reserva) y botón "Ver paseadores".

### 5.2 Pestaña Explorar

- Cabecera naranja: logo animado, iniciales del usuario, ubicación "San Isidro y Jesús María, Lima", título "El paseo seguro que tu mejor amigo merece" y la ilustración central: una mano humana y una pata de perro dorada dándose la mano, con la leyenda animada "¡Trato hecho!". La animación se repite en bucle y respeta la preferencia de "reducir movimiento" del sistema.
- Botón principal "Encontrar Paseador Seguro" (baja hasta la lista) y enlace "Ver demo del paseo en vivo".
- Si hay un paseo en curso aparece una tarjeta "Paseo en curso con [nombre]" que lleva a la pestaña En vivo.
- "¿Quién pasea hoy?": selector de perros del usuario con foto y tamaño, y botón para agregar otro.
- "Cómo te protegemos" (cuatro tarjetas): vecinos verificados (DNI a la vista, registros públicos revisados, entrevista por video, primeros paseos acompañados); pago en custodia; GPS, fotos y bitácora; mismo tamaño siempre.
- Vista previa del mapa de ambos distritos con los parques.
- "Paseadores del barrio": lista con filtros "Todos", "San Isidro", "Jesús María", "Para [nombre del perro]" y, si hay favoritos, "Favoritos (n)". Si se viene desde un parque del mapa, aparece una etiqueta con el parque. Los paseadores compatibles con el perro aparecen primero.
- "Más que un paseo": tarjetas de lo que viene (ficha y chapita QR y plan lunes a viernes marcados como nuevos; álbum del paseo, baño al volver y cuidado en casa como "pronto").
- Bloque "Para estudiantes": "Postular como paseador", que lleva a "/paseador".

### 5.3 Tarjeta de cada paseador

Elementos [HECHO]:
- Foto (o retrato ilustrado), sello de verificado, corazón de favoritos, nombre con inicial del apellido, precio por hora, "Vive en/Estudia en [distrito]", carrera y ciclo.
- Si es nuevo: etiqueta "Nuevo · en periodo de prueba" y "Aún sin reseñas". Si no, calificación y cantidad de paseos.
- Frase de presentación del paseador.
- "Su paseo incluye": etiquetas opcionales como "Agua y bolsas", "Fotos y video", "Juego con pelota", "Botiquín de primeros auxilios".
- Cuatro verificaciones visibles. Los paseadores con historial muestran: DNI verificado, registros públicos revisados, entrevista por video, evaluación de situaciones aprobada. Los nuevos muestran en la cuarta: "Primeros paseos acompañados por Patitas".
- Fila de DNI: muestra "DNI ••••0001 · PAT-XXXX" (últimos 4 dígitos y código de verificación) con el enlace "Ver completo".
- Caja de horario calculada para el perro elegido: próximo horario compatible, cuántos perros ya están en ese grupo y de qué tamaño, íconos de capacidad (máximo 2 o 3) y cuántos horarios libres hay hoy. Si el paseador no acepta ese tamaño, lo dice y muestra qué tamaños pasea.
- Última reseña y enlace "Ver las N reseñas".
- Sección desplegable "Sobre [nombre]": biografía, extras, tiempo de respuesta, años de experiencia.
- Botón "Ver horarios con [nombre]" (queda gris con "No compatible con tu perro" si no corresponde).

Paseadores de ejemplo incluidos [SIMULADO]: Carlos M. (Jesús María, S/ 25, hasta 3 perros, medianos y grandes), Camila R. (San Isidro, S/ 30, pequeños y medianos), Diego A. (San Isidro, S/ 28, medianos y grandes), Lucía P. (Jesús María, S/ 25, pequeños y medianos), Mateo S. (San Isidro, S/ 35, hasta 2 perros, todos los tamaños) y Andrea V. (Jesús María, S/ 27, pequeños y medianos). Cuando el panel interno aprueba a un postulante real, este se suma a la lista como paseador nuevo.

### 5.4 DNI con consentimiento (hoja "DNI de [nombre]")

- El DNI está oculto por defecto (se ven solo los últimos 4 dígitos).
- Para verlo completo, el cliente debe tener cuenta verificada (celular y mayoría de edad) y marcar el compromiso: uso el dato solo para comprobar la identidad; no lo comparto, no lo publico ni lo uso para otro fin; sé que mi acceso queda registrado y que el paseador puede verlo.
- Al aceptar se muestra el número y la guía: cuando el paseador llegue, pedirle su DNI físico y comparar número y foto; si algo no coincide, no entregar al perro.
- Cada vez queda un registro con el paseador y la fecha. El paseador lo ve en su pestaña Verificación ("Quién abrió tu DNI").
- [BORRADOR] Este mecanismo debe revisarlo un abogado (Ley 29733, datos personales).

### 5.5 Pestaña Mapa

- Mapa real (OpenStreetMap) con los límites oficiales de San Isidro y Jesús María dibujados con línea punteada, 12 parques de paseo marcados y la casa del usuario.
- Filtros "Ambos distritos", "San Isidro", "Jesús María".
- Lista "Puntos de paseo seguros" con cuántos paseadores caminan en cada parque. Al tocar un parque se vuelve a Explorar filtrado por ese parque.
- Los 6 parques de San Isidro: Bosque El Olivar, Parque Juan de Arona, Parque Guatemala, Parque Bicentenario, Parque Manuel Vicente Villarán, Parque Las Oropéndolas. Los 6 de Jesús María: Campo de Marte, Parque Mariscal Andrés Avelino Cáceres, Parque de los Próceres, Parque Habich, Parque Santa Cruz, Parque Huiracocha.
- [PENDIENTE] Confirmar con las municipalidades las reglas para perros en cada parque.

### 5.6 Reserva (hoja "Reservar", 3 pasos: Horario, Pago seguro, Listo)

Paso 1, Horario:
- Tarjeta del paseador con qué tamaños pasea y cuántos perros máximo.
- Selector de perro (se ofrecen solo los compatibles).
- Día: hoy y los 6 días siguientes.
- Hora de recojo de 6:00 am a 9:00 pm. Cada hora muestra un estado: libre (se arma un grupo nuevo), con cupo (hay un grupo del mismo tamaño), lleno, grupo de otro tamaño (en gris), fuera del horario del paseador, ya pasó, o no acepta ese tamaño. Un cuadro explica: "Nunca mezclamos tamaños: un perro grande podría arrastrar a uno pequeño."
- Línea de grupo: por ejemplo "Hoy · 10:00 am · grupo de 2 perros grandes (3/3 contigo)".
- Duración: 30, 60 o 90 minutos (precio proporcional).
- Frecuencia: "Solo esta vez" o "Lunes a viernes" con 10 % de descuento por paseo.
- Entrega: en la puerta o con portería.
- Notas para el paseador.
- Total en vivo: paseo + tarifa de protección de S/ 3 (seguro y soporte 24/7) - descuentos (plan lunes a viernes 10 %, bienvenida S/ 10). Si el perro no puede ir en grupo, el precio sube 40 % por paseo individual.

Paso 2, Pago seguro:
- Banner "Pago Seguro en Custodia".
- Métodos: tarjeta (formulario con número de prueba), Yape y Plin. [SIMULADO] No se cobra nada.

Paso 3, Listo:
- Mensaje "¡Pago retenido en custodia!" con resumen: paseador, perro, horario, entrega y sello "En custodia". Luego se pasa a la pestaña En vivo.

### 5.7 Pestaña En vivo (paseo en curso)

- Mapa a pantalla ancha con la ruta real alrededor del Bosque El Olivar (datos de OpenStreetMap), punto animado del perro, reloj, etiqueta "Zona segura activa", distancia recorrida y botón para centrar. [SIMULADO] La ubicación es una ruta guionizada, no GPS real.
- Tarjeta del paseador: foto, nombre, estado, barra de progreso, botón de llamada y botón de chat con contador de mensajes sin leer. Insignia verde "EN VIVO" cuando hay un paseador real conectado desde la otra app.
- Botón "Ficha de [perro]" para ver lo que ve el paseador.
- Tarjeta "Código de recojo": PIN de 4 dígitos que el dueño le da al paseador al entregarle a su perro. Dice: "Así sabes que es él."
- Tarjeta de pago en custodia con tres etapas: pago realizado, retenido en custodia, liberado.
- Último mensaje del paseador (acceso rápido al chat).
- Bitácora en tiempo real: lista de eventos con hora (recogido, ruta, cruce con correa corta, pipí, pausa de agua, juego, recogió desechos, regreso, llegada) y un recuadro "Fotos obligatorias" con dos casillas ("Jugando" y "Tomando agua") que se marcan cuando llegan las fotos. Las fotos reales enviadas por el paseador aparecen aquí; en el modo guionizado se ven ilustraciones.
- Botones fijos abajo: SOS (rojo) y "Confirmar llegada" (se habilita cuando el perro llegó). Hay un atajo de demostración "Modo demo · saltar a la llegada".
- "Confirmar llegada": hoja con deslizador "Desliza para liberar el pago". Al completarlo el pago pasa a "liberado" y aparece la pantalla de paseo completado con calificación, "Escribir reseña" y "Reservar otra vez con [paseador]".

### 5.8 Chat con fotos

- Conversación entre dueño y paseador con burbujas, hora, indicador "escribiendo", respuestas rápidas ("¿Todo bien?", "¡Gracias [nombre]!", "Mándame otra foto") y envío de fotos reales desde la cámara o la galería. Las fotos se reducen a 640 píxeles antes de enviarse. Los mensajes se limitan a 500 caracteres.
- Encabezado "Bitácora multimedia": el paseador debe enviar fotos del perro jugando y tomando agua; el dueño también puede mandar fotos.
- Si hay un paseador real conectado (otra pestaña), los mensajes llegan en vivo y no hay respuestas automáticas. [SIMULADO] Si no hay nadie conectado, el chat responde con frases automáticas según lo escrito.

### 5.9 SOS

- Hoja de emergencia con botón para activar la alerta. Al activarla aparece una franja roja "Alerta SOS activa. Patitas Central te está contactando." y se agrega un evento a la bitácora. Se puede cancelar. [SIMULADO] En el producto real debe avisar de verdad a los fundadores y al contacto de emergencia con la ubicación.

### 5.10 Reseñas

- Hoja con reseñas del paseador (calificación, texto, etiquetas, distrito del autor). Solo quien completó un paseo con ese paseador puede escribir una (reseña verificada). Las reseñas del usuario se guardan en su navegador.

### 5.11 Pestaña Seguridad

- Cabecera oscura "Cuidamos a tu perro como tú lo harías".
- "7 filtros antes del primer paseo": vecino del distrito; DNI y foto reales; registros públicos; evaluación de situaciones; entrevista por video y avales; primeros paseos acompañados; seguimiento continuo.
- Reglas del paseo: 2 a 3 perros como máximo, mismo tamaño siempre, razas con licencia (Ley 27596), check-in y check-out con portería.
- Flujo gráfico del dinero (pagas, Patitas retiene, el paseador cobra al confirmar la llegada).
- Preguntas frecuentes (cuándo cobra el paseador, qué pasa si algo sale mal, por qué no se mezclan tamaños, razas peligrosas, qué datos se ven).
- Botón "Postular como paseador".

### 5.12 Pestaña Perfil

- Cabecera con iniciales y dirección.
- Tarjeta "Dinero en custodia" (monto retenido y liberado).
- "Invita a un vecino": código personal (por ejemplo VALERIA10) con S/ 10 para los dos.
- "Mis perros": tarjetas con foto, tamaño, raza y vacunas; "Ver ficha y chapita QR" abre la ficha completa con un código QR para una chapita física que ayuda a recuperar al perro si se pierde. Se puede editar o eliminar. Botón para agregar perros.
- Historial de paseos, reseñas escritas, botón "Postular como paseador" y "Cerrar sesión y reiniciar la demo" (borra los datos del navegador).

## 6. App del paseador ("/paseador")

### 6.1 Bienvenida

- Título "Gana paseando perros de tu barrio". Texto: con 2 perros a S/ 25 recibe S/ 40 por hora después de la comisión del 20 %.
- Beneficios: pago cada semana por Yape o Plin; DNI y código verificado dan confianza; acompañamiento en los primeros paseos; postular toma unos 25 minutos.
- Requisitos: 18 años o más y DNI; vivir o estudiar en San Isidro o Jesús María; aceptar que el DNI se muestre a clientes verificados; dos avales y una videollamada.
- Botones: "Crear cuenta de paseador", "Entrar como paseador de demostración" y "Soy cliente: volver a la app".

### 6.2 Postulación en 8 pasos [HECHO]

La postulación se guarda sola en el navegador y se retoma en el primer paso incompleto.

1. Celular y código de 6 dígitos (demostración 482913). Un celular, una cuenta.
2. Acuerdos en 7 bloques [BORRADOR]: mayor de 18 y datos verdaderos; mi DNI será visible para clientes con cuenta verificada (nombre, foto y número, solo para verificar identidad, oculto con botón y con registro de accesos, retirable cerrando la cuenta); autorizo la revisión de registros públicos y entregaré mis documentos; cumpliré las reglas de cada paseo (máximo 3 perros y 2 en los primeros 10 paseos, nunca mezclar tamaños, correa corta, PIN de recojo, fotos obligatorias, no cobrar fuera de la app, no dejar perros solos ni con terceros, no publicar fotos sin permiso); soy trabajador independiente (elijo horarios, recibo pago semanal, comisión de 20 %, recibo por honorarios y RUC); avisaré de inmediato cualquier incidente; acepto la supervisión de mis primeros paseos y una calificación mínima de 4,7.
3. Datos: foto de perfil (de frente, sonriendo, buena luz), nombre, apellido, DNI de 8 dígitos (se mostrará oculto), fecha de nacimiento (18 años o más), distrito, universidad o instituto, carrera y ciclo.
4. Perfil público (constructor con medidor de completitud y vista previa): frase de presentación de 30 a 280 caracteres con ideas para agregar con un toque; "¿Qué incluye tu paseo?" (opcional: agua y bolsas, fotos, video corto, juego con pelota, limpieza de patas, botiquín, premios con permiso, reporte detallado); estilo (hasta 3); tamaños que acepta; días y horarios; parques (hasta 3); tarifa por hora entre S/ 16 y S/ 34 con cálculo de lo que recibe tras la comisión; experiencia con perros. Al final se muestra "Así te verán los clientes".
5. Evaluación de situaciones (ver sección 8): 10 situaciones de opción múltiple y 2 preguntas abiertas.
6. Registros públicos: autorización marcada por el postulante y 4 consultas gratuitas y oficiales (Certificado Único Laboral, REDAM de deudores alimentarios, requisitorias de la PNP, seguimiento de denuncias del Ministerio Público) con enlace al sitio oficial y botón para adjuntar captura o PDF. Hacen falta al menos 3 de 4. [SIMULADO] Solo se guarda el nombre del archivo.
7. Avales y videollamada: dos avales (nombre, relación, celular) y un horario de videollamada de 15 minutos entre siete opciones.
8. Revisa y envía: lista de verificación de todo lo anterior y explicación de qué pasa ahora.

### 6.3 Estado de la postulación

- Pantalla "¡Gracias, [nombre]!" con código de postulación (por ejemplo PAT-4M8K), línea de tiempo (postulación enviada, revisión de documentos, contacto con avales, videollamada, primeros paseos acompañados) y el resultado de la evaluación.
- Botón de demostración "abrir panel interno y aprobar" y opción de retirar la postulación y borrar los datos.

### 6.4 Pestaña Hoy (cuando ya está aprobado)

- Encabezado "Hola, [nombre]", estado conectado y marca de demostración si corresponde.
- Dos cifras: "Cobrado" (lo ya pagado) y "Por cobrar" (entregado pero aún sin confirmar por el dueño).
- Sin paseo asignado: mensaje y botón "Simular un paseo asignado (demo)".
- Con paseo asignado: tarjeta con nombre del perro, raza y tamaño, pago del paseador (80 % del precio), cuatro etapas (Asignado, Recogido, Paseando, Entregado), hora y duración, dirección, tipo de entrega (puerta o portería con nombre), tamaño del grupo.
- Ficha del perro: etiquetas de carácter, si va en grupo, vacunas, notas y alertas de salud con veterinario.
- Etapa Asignado: campo "Código de recojo" de 4 dígitos. Si no coincide, advierte "No te lleves al perro hasta que coincida". Al acertar pasa a Recogido y avisa al dueño.
- Etapa Recogido: botón "Iniciar paseo".
- Etapa Paseando: avisos rápidos ("Hizo pipí", "Recogí todo", "Tomó agua", "Crucé seguro"), "Fotos obligatorias" (Jugando y Tomando agua, con cámara; las fotos llegan al dueño en la bitácora y en el chat) y botón "Entregué a [perro] en casa".
- Etapa Entregado: espera la confirmación del dueño; al confirmar se muestra "¡Pago liberado!" y las ganancias suben. Luego "Cerrar paseo".
- Siempre disponibles: "Chat con [dueño]" (con fotos y contador) y SOS (genera un aviso a la bitácora; [SIMULADO] no avisa a nadie real todavía).

### 6.5 Pestañas Mi perfil y Verificación

- Mi perfil: mismo constructor de perfil, con cambios que se guardan solos; botón "Salir de la demo" (solo en demostración) y "Borrar mi cuenta y mis datos" (derecho de eliminación, Ley 29733).
- Verificación: código de verificación público grande (PAT-XXXX), etiqueta "Nuevo · en periodo de prueba" o "Paseador verificado", progreso de los primeros 10 paseos acompañados, lista de verificaciones (identidad, registros públicos, evaluación, videollamada, avales) y registro "Quién abrió tu DNI".

## 7. Panel interno ("/admin")

- Solo para fundadores. [PENDIENTE] En esta demo no tiene inicio de sesión; en producción debe tenerlo y registrar quién decidió y cuándo.
- Ficha del postulante: foto, nombre, estado, edad, distrito, carrera y universidad, celular, código, DNI oculto con botón "Mostrar", versión y fecha de los términos aceptados.
- Evaluación: porcentaje, puntos, tiempo, intentos, veredicto ("Sin alertas", "Requiere lectura humana" o "No alcanza el mínimo"), alertas (respuestas de riesgo en preguntas críticas, respuestas abiertas muy cortas, sin palabras clave de seguridad, o evaluación terminada en menos de 90 segundos) y las respuestas abiertas completas. Incluye la nota de que una evaluación así se puede copiar o hacer con ayuda de una IA, por lo que se repasa en la videollamada.
- Documentos: autorización de consulta, los 4 archivos con enlace "Consultar" al sitio oficial, avales y cita de videollamada.
- "Tu revisión": tres casillas (documentos y registros revisados, llamé a los 2 avales, videollamada hecha con DNI en mano), notas internas, contador de paseos acompañados (0 a 10) y acciones: "Aprobar para paseos acompañados" (exige las tres casillas y que la evaluación no esté en "no alcanza"), "Pasar a activo" (exige 10 paseos), "Rechazar" y "Volver a en revisión".
- Al aprobar, el paseador aparece en la app del cliente como "Nuevo · en periodo de prueba" y puede usar la app del paseador.

## 8. Sistema de confianza y seguridad

### 8.1 Los filtros

Vista del cliente (7 filtros): vecino del distrito; DNI y foto reales; registros públicos; evaluación de situaciones; entrevista por video y avales; primeros paseos acompañados; seguimiento continuo.

Vista interna (8 pasos de postulación): (1) mayor de 18 con datos y selfie; (2) celular verificado; (3) términos por bloques con DNI visible; (4) evaluación de situaciones; (5) registros públicos gratuitos con permiso; (6) dos avales; (7) videollamada de 15 minutos; (8) primeros paseos acompañados por los fundadores, con seguimiento continuo (calificación mínima 4,7 y reverificación cada 6 meses).

Principios:
- Decir exactamente lo que se hizo. No se afirma "antecedentes limpios" ni "test psicológico aprobado": lo primero no se puede garantizar con consultas gratuitas y lo segundo solo lo aplica un psicólogo colegiado.
- Ningún filtro elimina el riesgo; lo reduce. Por eso existen además el PIN de recojo, las fotos obligatorias, el SOS, los primeros paseos acompañados y el pago retenido.
- Los registros públicos no prueban identidad; por eso la videollamada repite la consulta en pantalla compartida y compara el DNI físico con la foto.

### 8.2 Evaluación de situaciones (el "quiz")

- Es un cuestionario de criterio, no un test psicológico. Banco de 16 preguntas de opción múltiple; cada vez se arman 10 al azar con las 6 críticas siempre incluidas y las opciones mezcladas. Además hay 2 preguntas abiertas.
- Puntaje: cada pregunta vale 0, 1 o 2 puntos. Aprobación automática con 80 % o más, ninguna respuesta de riesgo en preguntas críticas y sin alertas en las abiertas. Entre 60 % y 79 %, o con cualquier respuesta de riesgo, pasa a lectura humana. Menos de 60 % no aprueba. Hay 2 intentos; luego se puede reintentar a los 3 meses.
- Ejemplos de situaciones: el cliente ofrece pagar por fuera de la app; un perro se suelta cerca de una avenida; calor fuerte en el paseo; un niño del edificio quiere acompañar; el paseador se siente mal a mitad del paseo; publicar fotos del grupo.
- Límite conocido: se puede copiar o resolver con ayuda de una IA. Mitigaciones: la videollamada repite los casos con otras palabras, las respuestas abiertas las lee una persona y los primeros paseos se supervisan.

### 8.3 Uso de inteligencia artificial en la revisión

- Sí para ayudar: resumir respuestas abiertas, marcar frases de riesgo, proponer preguntas de seguimiento para la videollamada.
- No para decidir ni para "detectar IA" (los detectores se equivocan). Siempre decide una persona y puede explicar su decisión. La Ley 29733 reconoce el derecho a no ser evaluado solo por tratamiento automatizado con efectos importantes; [BORRADOR] confirmarlo con un abogado y avisarlo en los términos.

### 8.4 Reglas del paseo

- Máximo 3 perros por paseo (2 en los primeros 10 paseos de un paseador nuevo; el paseador Mateo S. del ejemplo tiene máximo 2).
- Nunca se mezclan tamaños. Los perros que no pueden ir en grupo van solos con recargo de 40 %.
- Razas potencialmente peligrosas (Ley 27596: Pitbull, Rottweiler, Dóberman, Dogo Argentino, Fila Brasileño, Tosa Inu, Bullmastiff) no se atienden por ahora; el sistema lo bloquea.
- PIN de recojo, fotos obligatorias (jugando y tomando agua), recoger desechos, correa corta, no cobrar fuera de la app, no dejar perros solos.
- Portería como aliada: entrega y recojo con el portero, con foto y hora.

## 9. Reglas de negocio implementadas

- Precio: tarifa por hora del paseador (S/ 25 a S/ 35 en los ejemplos), proporcional a 30, 60 o 90 minutos y redondeada a 0,50.
- Tarifa de protección: S/ 3 por reserva (seguro y soporte 24/7), que se queda en Patitas.
- Descuentos: bienvenida S/ 10 (por código de invitación o afiche); plan lunes a viernes 10 % por paseo.
- Pago al paseador: 80 % del precio del paseo; Patitas retiene 20 % de comisión.
- Total mínimo: nunca baja de la tarifa de protección.
- Cancelación: gratuita hasta 2 horas antes [BORRADOR]; el plan lunes a viernes se paga y retiene paseo por paseo y se puede cancelar cuando se quiera.
- Disponibilidad: horarios de 6:00 am a 9:00 pm, 7 días hacia adelante. [SIMULADO] La disponibilidad es determinista (se calcula de forma estable por paseador, día y hora) y la hora "actual" de la demo es siempre 9:00 am.
- Edad mínima 18 años para clientes y paseadores.
- Un celular = una cuenta.

## 10. Datos y modelos principales

- Cuenta del cliente: nombre, apellido, celular, distrito, calle, departamento, fecha de nacimiento, versión y fecha de aceptación de términos, portería y nombre del portero, cómo nos conoció, código de invitación, fecha de creación.
- Perro: nombre, foto, raza, edad, sexo, tamaño, peso, color, forma de carita, carácter, si es sociable, vacunas, esterilizado, raza potencialmente peligrosa, notas, salud, veterinario.
- Paseador (vista pública): nombre, distrito, precio por hora, calificación, cantidad de paseos, máximo de perros, tamaños aceptados, horarios, parques, frase, biografía, experiencia, tiempo de respuesta, "qué incluye", estilo, reseñas, foto, DNI, código de verificación, fecha de verificación, bandera de periodo de prueba.
- Reserva: paseador, perro, día, hora, duración, plan, entrega, notas, perros que ya estaban en el grupo y su tamaño, precio del paseo, tarifa de protección, descuento, total, método de pago.
- Paseo en curso: reserva, progreso (0 a 1), fase (activo, llegó, completado), estado del pago (retenido o liberado), SOS, mensajes y eventos adicionales, identificador del encargo y marca de modo en vivo.
- Postulación del paseador: celular, acuerdos aceptados con fecha y versión, datos personales, foto, perfil público, resultado de la evaluación e intentos, consultas y nombres de archivos, dos avales, horario de videollamada, estado (borrador, enviada, supervisado, activo, rechazada), revisión interna (documentos, avales, videollamada, notas, paseos acompañados), código PAT-XXXX.
- Encargo compartido entre apps: paseador, dueño, ficha del perro, horario, duración, PIN, entrega, dirección, grupo, pago del paseador, estado (asignado, recogido, paseando, entregado), pago liberado.
- Claves de almacenamiento en el navegador: patitas:v2 (cuenta, perros, reseñas, favoritos, registro de accesos al DNI), patitas:walker:v1 (postulación), patitas:bus:chat, patitas:bus:job, patitas:bus:events y patitas:bus:walker-presence (comunicación entre las dos apps), patitas:walker:earnings (ganancias del paseador demo).

## 11. Arquitectura técnica

- Aplicación Next.js (App Router) con componentes de cliente. Estructura de carpetas: app (rutas y metadatos), components (pantallas y piezas), components/walker (app del paseador), components/admin (panel), components/ui (logo, mascota, retratos, hojas), lib (datos, reglas, almacenamiento, evaluación, términos, comunicación entre apps) y docs (documentos).
- "Bus" de demostración (lib/bus.ts): usa localStorage y el evento "storage" para que dos pestañas del mismo navegador se comuniquen en vivo (chat, estado del paseo, avisos, presencia del paseador). Es el reemplazo temporal de una base de datos con tiempo real.
- Seguridad del almacenamiento: toda lectura y escritura está protegida contra falta de espacio y navegación privada; la app sigue funcionando sin guardar.
- Fotos: se reducen a 480 o 640 píxeles en JPEG antes de guardarse o enviarse.
- Identificadores únicos en mensajes y eventos para no repetirlos si llegan dos veces.
- Accesibilidad: etiquetas en botones, contraste alto, respeto de la preferencia de reducir movimiento, regiones de actualización en vivo en el chat y la bitácora.
- Compilación: la versión de producción compila sin errores de tipos y genera todas las rutas como estáticas (excepto "/afiche").

### Qué es real y qué es simulado

- [HECHO] Interfaces completas del cliente, el paseador y el panel interno; reglas de tamaño; evaluación con puntaje; términos por bloques; DNI con consentimiento y registro de accesos; chat con fotos reales; PIN de recojo; ganancias del paseador; mapas reales y límites de distritos; afiche con QR; marca y mascota.
- [SIMULADO] Pagos y cobros; SMS de verificación; GPS del paseo (ruta guionizada); disponibilidad de horarios; reseñas y paseadores de ejemplo; llamadas; alerta SOS; subida real de documentos (solo se guarda el nombre); comunicación entre dos celulares distintos.
- [PENDIENTE] Base de datos y tiempo real reales; inicio de sesión del panel interno; pasarela de pagos; app nativa del paseador para GPS en segundo plano en iPhone; revisión legal; seguro de responsabilidad civil; política de privacidad completa; libro de reclamaciones.

## 12. Marca y diseño

- Concepto: "sello personal", sin imitar la estética genérica de otras apps. Calidez andina, ilustración con contorno grueso de tinta y color plano, tactilidad en los botones (se hunden al presionarse) y títulos en serif.
- Mascota: Chasqui, perro dorado con chullo naranja, cuyo gorro lleva una franja y un zigzag andino. Se usa como cabeza, busto y dentro de un pin de ubicación.
- Logo: Chasqui dentro de un pin de ubicación (marca), con el nombre "Patitas" en serif y "connect" en cursiva. Hay variantes naranja, crema y tinta. El ícono de la app es el mismo pin sobre fondo naranja.
- Ilustración principal de la portada: una mano humana y una pata de perro con pelo, dedos y uñas dándose la mano, con una animación de acercarse, apretar, sacudir y soltar, y la leyenda "¡Trato hecho!".
- Elementos distintivos: sello de verificado en forma de escudo festoneado, huellas de fondo, retratos ilustrados de paseadores con o sin foto real, tarjetas con esquinas muy redondeadas y sombras suaves, deslizador para liberar el pago, barra de progreso del paseo y sellos de capacidad con huellas.
- Voz: cercana, en español de Perú, sin jerga técnica; frases como "Tu perro, bajo control total" y "Cuidamos a tu perro como tú lo harías".

## 13. Capacidad y rendimiento

Prueba de carga en la versión de producción [HECHO] (la misma computadora generó la carga y corrió el servidor; resultado conservador):
- 50 conexiones simultáneas: 4 729 visitas por segundo, mitad de las respuestas en 9,5 milisegundos, 0 errores.
- 200 conexiones: 5 147 visitas por segundo, 38 milisegundos, 0 errores.
- 500 conexiones: 4 678 visitas por segundo, 90 milisegundos, 0 errores.
- 1 000 conexiones: 4 472 visitas por segundo, 124 milisegundos, 0,7 % de errores de conexión (límite del sistema operativo y de un solo proceso; en producción lo absorbe una red de distribución de contenido).
- Peso de la primera carga (comprimido): unos 320 KB la app del cliente, 285 KB la del paseador y 243 KB el panel.

Simulación de un mes de paseos [SUPUESTO] (script docs/simulacion-capacidad.mjs): cada cliente pasea 2,5 veces por semana; 2,2 perros por paseo; 60 minutos; picos de 7 a 9 y de 17 a 19; el paseador envía su ubicación cada 30 segundos; 60 % de los dueños mira "En vivo"; 25 mensajes y 4 fotos por paseo.
- 100 clientes recurrentes: 494 paseos al mes, 21 conexiones en el pico, 0,17 millones de mensajes, 116 MB de fotos, 0,57 GB de salida, 182 MB de base de datos al año. Cabe en el plan gratuito.
- 200 clientes: 1 002 paseos, 30 conexiones, 0,34 millones de mensajes, 235 MB de fotos, 1,15 GB, 371 MB al año. Cabe.
- 300 clientes: 1 482 paseos, 40 conexiones, 0,50 millones de mensajes, 347 MB, 1,69 GB, 546 MB al año. Se pasa en base de datos.
- 1 200 clientes: 5 949 paseos, 126 conexiones, 2,02 millones de mensajes, 1 394 MB, 6,8 GB, 2 194 MB al año. Se pasa en casi todo.

Límites del plan gratuito de Supabase (verificados el 7 de octubre de 2026): 200 conexiones de tiempo real simultáneas, 100 mensajes por segundo, 2 millones de mensajes al mes, 500 MB de base de datos, 1 GB de archivos, 5 GB de salida de datos al mes, 50 000 usuarios activos al mes, y pausa tras una semana sin actividad. El plan Pro parte de US$ 25 al mes (500 conexiones, 5 millones de mensajes, 8 GB de base de datos, 100 GB de archivos, sin pausa).

Primer cuello de botella: el tamaño de la base de datos (a partir de unos 250 clientes en el primer año), seguido de las fotos. Mitigaciones: guardar un punto de GPS por minuto, borrar rutas de más de 90 días, borrar fotos a los 30 días, enviar ubicación solo mientras el dueño mira "En vivo".

Alojamiento: el plan gratuito de Vercel (Hobby) está restringido a uso no comercial; como Patitas cobra comisión, en producción necesita un plan de pago o un alojamiento que lo permita (por ejemplo Cloudflare Pages, cuya página de límites no menciona restricción comercial; confirmar en sus términos).

## 14. Legal y privacidad (guía, no asesoría legal)

- [BORRADOR] Todo texto legal de la app (términos del cliente y del paseador) debe revisarlo un abogado antes del uso con clientes reales.
- Datos personales (Ley 29733 y su reglamento): el DNI, la selfie y los datos de salud se tratan con consentimiento expreso y por separado; se necesita política de privacidad completa, registro del banco de datos y protocolo de incidentes. El paseador puede pedir el borrado de su cuenta; el cliente puede reiniciar sus datos.
- Razas potencialmente peligrosas (Ley 27596 y reglamento): exigen licencia municipal, bozal, correa y microchip; la app no las atiende por ahora.
- Límite de perros por paseador: Miraflores limita a 3 y pide registro y seguro; no se confirmó la regla de San Isidro ni de Jesús María [PENDIENTE]. La app ya limita a 2 o 3.
- Paseadores independientes: emiten recibo por honorarios electrónico con RUC; riesgo de relación laboral si se imponen turnos, uniforme o exclusividad; por eso la relación se diseña como disponibilidad elegida por el paseador.
- Pago en custodia: retener dinero de terceros puede ser actividad regulada. Recomendación inicial: cobrar a la cuenta de la empresa y pagar a los paseadores cada semana tras la confirmación del dueño ("cobro con liquidación diferida"), y consultar a un abogado antes de usar la palabra "escrow" en publicidad.
- Publicidad: decir "verificado" y no "100 % seguro" ni "garantizado".
- Obligaciones comerciales a revisar: libro de reclamaciones, términos y condiciones, política de reembolso, disponibilidad de la marca en Indecopi.

## 15. Modelo de negocio y economía [SUPUESTO]

Mercado (cifras públicas): 58 % de los hogares peruanos tiene mascota y 88 % de esos tiene perro (Ipsos); en Lima, 1 de cada 2 hogares tiene mascota; el mercado de cuidado de mascotas pasaría de US$ 456 millones (2023) a unos US$ 680 millones hacia 2028; los servicios son solo cerca del 3 % del gasto en mascotas (mercado por educar). Yape tiene más de 20 millones de usuarios.

Precios de referencia (mercado, 2026): San Isidro, grupal S/ 22 a 34 por perro; Jesús María, grupal S/ 16 a 28; paseador informal S/ 15 a 18 por perro por hora. Sugerencia: San Isidro S/ 28 a 30 y Jesús María S/ 24 a 26 por perro en grupo.

Economía por paseo-perro de 1 hora (precio S/ 25):
- El cliente paga S/ 28 (25 más 3 de protección).
- El paseador recibe S/ 20 (80 % de 25).
- Ingreso bruto de Patitas S/ 8 (5 de comisión más 3 de protección); sin IGV, S/ 6,78.
- Costo de la pasarela de pago aproximado S/ 1,14 (3,44 % más IGV sobre el cobro) y soporte y seguro estimados S/ 1,00.
- Contribución aproximada: S/ 4,60 por paseo-perro.
- Con costos fijos de S/ 6 000 al mes, el equilibrio está cerca de 1 300 paseos-perro al mes (unos 60 por día hábil), es decir 100 a 150 clientes recurrentes con 2 a 3 paseos por semana. Realista en 6 a 9 meses si la retención funciona.
- Ganancia del paseador: con un grupo de 3 perros hasta unos S/ 60 por hora, contra S/ 15 a 18 informal. Es el mejor argumento para reclutar buenos estudiantes. Los paseadores nuevos limitan su grupo a 2 perros (S/ 40 por hora).
- Palancas: subir la tarifa de protección a S/ 4 o 5, comisión de 25 %, planes semanales y servicios de mayor margen (baño, cuidado en casa, transporte al veterinario, suscripción "Patitas Club", edificios certificados).

Mercado inicial (muy ilustrativo): con unos 40 000 hogares entre ambos distritos, cerca de 20 000 con perro; si el 5 % contrata paseos regulares, serían unos 1 000 clientes posibles. Mercado chico pero suficiente para validar.

Competencia: Paseadores.pe (el más parecido), MiPaseador, Dimu, Lima Perruna, directorios internacionales, Mywak (llegó a Perú en 2019 con 10 345 descargas y solo 241 usuarios recurrentes) y, sobre todo, los grupos de WhatsApp y Facebook del barrio. Referencia internacional: Rover aprueba a menos del 20 % de postulantes.

## 16. Marketing y captación

- Afiche A4 imprimible por edificio ("/afiche?e=Nombre del edificio&c=CODIGO"): titular de marca, tres beneficios (vecinos verificados con DNI a la vista, mismo tamaño máximo 3 perros, pago en custodia), descuento de S/ 10 y código QR único que abre la app con el código aplicado. Sirve para medir qué edificio convierte mejor.
- Reglas del afiche: pedir permiso a la administración; el portero no entrega datos de residentes y su rol es hacer check-in y check-out del perro; incentivo transparente sugerido de S/ 5 a 10 por cliente que complete su primer paseo.
- Otros canales: veterinarias y tiendas de mascotas, cafeterías pet friendly, gimnasios, paseadores con chaleco naranja en los parques (con permiso municipal), la feria Pet Fest en Campo de Marte, Instagram y TikTok con contenido del barrio, perfil de Google Business, WhatsApp Business, alianzas con veterinarias con código propio.
- Fases sugeridas: (0) tres semanas de "concierge" sin app, con 6 a 10 paseadores y 20 paseos coordinados por WhatsApp; (1) afiches en 5 edificios con permiso; (2) canales digitales; (3) lanzamiento suave con 30 a 50 clientes; luego el segundo distrito solo cuando el primero repita.
- Embudo de ejemplo [SUPUESTO]: 500 afiches, 20 escaneos, 8 registros, 4 primeros paseos, 2 clientes recurrentes.
- Retención: plan lunes a viernes con el mismo paseador, álbum del paseo, recordatorios de vacunas, reseñas.
- Métricas semanales: activación (primer paseo), recompra a 14 días, porcentaje de clientes recurrentes, calificación promedio, incidentes por 1 000 paseos, ocupación de paseadores, tiempo de respuesta, y el embudo de reclutamiento (postulaciones, evaluación aprobada, documentos completos, videollamada, aprobados, activos).
- "No cualquiera entra": publicar el porcentaje real de aprobación solo cuando se tenga el dato.

## 17. Hoja de ruta

Primeros 90 días sugeridos:
1. Semanas 1 a 3: concierge con WhatsApp, 6 a 10 paseadores, 20 paseos y registro de aprendizajes.
2. Semanas 4 a 6: formalizar (RUC, términos revisados por un abogado, política de privacidad, consulta a las municipalidades, cotizar seguro, elegir pasarela) y primer lote de afiches.
3. Semanas 7 a 10: construir el servicio de datos mínimo (cuentas, perros, reservas, pagos, chat, fotos) y la app del paseador.
4. Semanas 11 a 13: lanzamiento suave con 30 a 50 clientes; medir retención y ajustar precio.

Arquitectura recomendada para pasar de prototipo a producto: web Next.js en un alojamiento que permita uso comercial; Supabase (base de datos Postgres, autenticación, almacenamiento y tiempo real) con reglas de seguridad por fila; app del paseador con Expo (React Native) para GPS en segundo plano y cámara; pagos con Culqi, Izipay o similar y liquidación semanal; notificaciones push y WhatsApp; proveedor de mapas con plan; límites por usuario contra abuso; alertas al 70 % de los límites.

Lista antes de lanzar con clientes reales: base de datos real con reglas por fila; límites de mensajes y fotos por usuario; alojamiento comercial; revisión legal; protocolo de incidentes; seguro de responsabilidad civil; prueba de carga con la base real; inicio de sesión en el panel interno.

Ideas posteriores (ordenadas de fácil a ambiciosa): álbum o video mensual del paseo, paseo más baño, cuidado en casa cuando viajan, transporte al veterinario, revisión visual de salud sin diagnosticar, paseos de socialización de cachorros, suscripción Patitas Club, seguro de mascota en alianza, edificios certificados, acuerdo con una veterinaria aliada con código propio, pasaporte de parques (sellos por parque visitado).

## 18. Riesgos principales

- Retención: una app de paseos que se usa una sola vez muere. Hay que vender planes recurrentes desde el inicio (la competidora Mywak tuvo cerca de 2 % de usuarios recurrentes).
- Un incidente grave (mordida, pérdida, accidente) puede acabar la marca en un distrito chico. Mitigar con protocolo, seguro, doble correa, no soltar perros en zonas sin cerco y no prometer "100 % seguro".
- Calidad de los primeros paseadores: pocos y buenos valen más que muchos.
- Legal: pago en custodia, datos personales, relación con paseadores independientes y reglas municipales sin confirmar.
- Técnica: una web en iPhone no sigue la ubicación en segundo plano; el GPS real del paseador requiere app nativa o mantener la pantalla encendida.
- Operativa: dos fundadores con poco tiempo; definir señales de saturación y qué soltar primero.
- Estacionalidad: en verano muchos viajan; con calor extremo hay que mover horarios; la garúa de invierno baja la demanda.
- Mapas: los mosaicos públicos de OpenStreetMap sirven para demostración; para publicar se necesita un proveedor con plan o servidor propio y respetar la atribución.

## 19. Probar el producto: guion de demostración con dos pestañas

1. Abrir la pestaña A en "/" y tocar "usar cuenta de demostración".
2. Abrir la pestaña B en "/paseador" y tocar "Entrar como paseador de demostración".
3. En A tocar "Ver demo del paseo en vivo". En B aparece el paseo con la ficha del perro.
4. En A, en la pestaña "En vivo", ver el código de recojo. En B escribirlo y tocar "Verificar"; luego "Iniciar paseo".
5. En B tocar avisos ("Hizo pipí", "Crucé seguro") y mandar una foto con "Jugando". En A aparecen al instante en la bitácora y en el chat.
6. En B tocar "Entregué a [perro] en casa". En A se habilita "Confirmar llegada"; deslizar para liberar el pago.
7. En B aparece "¡Pago liberado!" y suben las ganancias. El chat de ambos lados funciona con texto y fotos durante todo el recorrido.
8. Postulación real: en "/" tocar "Crear cuenta de paseador" (o entrar a "/paseador"), completar los 8 pasos, abrir "/admin", marcar las tres casillas y tocar "Aprobar para paseos acompañados". El paseador aparece en la app del cliente como "Nuevo · en periodo de prueba".

## 20. Documentos y archivos del proyecto

- README.md: cómo correrlo y estructura.
- docs/INVESTIGACION-Y-PLAN.md: investigación de mercado, ley, economía y plan de salida (con fuentes).
- docs/FILTROS-Y-PERFIL-PASEADORES.md: filtros de seguridad sin costo, cómo medir la evaluación, guion de la videollamada, uso de IA y cómo armar un buen perfil.
- docs/CAPACIDAD.md y docs/simulacion-capacidad.mjs: pruebas de carga, simulación y límites.
- docs/PROMPT-ORGANIZADOR.md: prompts para que una IA organice al equipo, la revisión semanal y el traspaso entre IAs.
- lib/legal.ts: términos en bloques (borrador). lib/quiz.ts: banco de preguntas y puntaje. lib/walkerStore.ts: postulación del paseador. lib/bus.ts: comunicación entre las dos apps. lib/data.ts: paseadores, perros y precios de ejemplo. lib/schedule.ts: horarios y tamaños. lib/geo.ts: distritos y parques.

## 21. Glosario

- Escrow o pago en custodia: el dinero queda retenido y se libera al paseador solo cuando el dueño confirma que el perro llegó bien.
- PIN de recojo: código de 4 dígitos que el dueño le da al paseador al entregarle a su perro.
- Bitácora: lista de eventos del paseo con hora y fotos.
- Evaluación de situaciones: cuestionario de criterio para postulantes (no es un test psicológico).
- REDAM: Registro de Deudores Alimentarios Morosos. PNP: Policía Nacional del Perú. CUL: Certificado Único Laboral.
- PWA: página web que se instala y funciona como app.
- Chasqui: mensajero de los caminos andinos; nombre de la mascota.
- RPP: razas potencialmente peligrosas (Ley 27596).

## 22. Fuentes principales

- Ipsos y La Cámara (hogares con mascota); Gestión (gasto en mascotas en Lima); Forbes Perú (mercado de cuidado de mascotas); Mercado Negro y Paysafe (billeteras digitales); Paseadores.pe, Infobae y Penthouse.pe (precios); Infomercado (Mywak); PetCareIns (Rover); lpderecho.pe (reglas de Miraflores); La Cámara (recibos por honorarios y retenciones); ecommerceacademy.pe (pasarelas de pago).
- Límites de planes: supabase.com/pricing y supabase.com/docs/guides/realtime/limits; vercel.com/docs/limits/fair-use-guidelines; developers.cloudflare.com/pages/platform/limits.
- El detalle con enlaces está en docs/INVESTIGACION-Y-PLAN.md y docs/CAPACIDAD.md.
