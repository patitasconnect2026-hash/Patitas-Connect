---
name: patitas-connect
description: Reglas, decisiones, especificaciones y criterios de calidad del proyecto Patitas Connect (paseadores de perros verificados en San Isidro y Jesús María, Lima). Úsala siempre que programes, revises, pruebes o cambies textos de la app.
---

# Patitas Connect: reglas y especificación

## 1. Qué es y en qué etapa está
Marketplace de paseadores de perros (estudiantes verificados, vecinos del distrito) para San Isidro y Jesús María. Stack: Next.js 16, React 19, TypeScript, Tailwind 4, Framer Motion, Leaflet. Hoy es un prototipo solo-frontend: datos en localStorage; GPS, pagos, SMS y chat entre celulares simulados. Hay tres apps: cliente (/), paseador (/paseador) y panel interno (/admin). Lee README.md y docs/INFORME-PRODUCTO.md antes de empezar.
Equipo: 3 estudiantes de 18 años. Una persona hace la lógica y las funciones, otra el diseño, otra el marketing y las encuestas.
Nombre de la app: «Patitas Connect», como el logo oficial (en el código, la constante `NOMBRE_APP` de lib/config.ts). Del 10 al 29 de octubre de 2026 se llamó «Patitas Conectadas».

## 2. Reglas de oro
1. Presupuesto cero: solo herramientas gratuitas. Si algo cuesta dinero o exige cuenta de pago, déjalo simulado, márcalo como simulado y avisa. No elijas base de datos, pasarela ni hosting sin preguntar.
2. No hay empresa, RUC, póliza ni servidor. Etapa actual: PILOTO con 3 a 5 familias conocidas. Patitas cobra a mano (decisión del equipo): antes de cobrar a familias reales hay que consultar a un contador y a un abogado.
3. No cambies estilos, colores ni layout: el diseño es de otra persona. Pon la lógica en lib/ y deja los componentes finos.
4. No prometas en pantalla lo que no existe (ver sección 6).
5. Una tarea por vez, con pruebas automáticas y un commit pequeño. Antes de empezar, explica en 5 líneas qué vas a cambiar y espera confirmación.
6. Ningún dato real ni clave en el código: variables de entorno.
7. El cliente paga solo el precio del paseo, sin cargos extra. Quita del código y de las pantallas cualquier cargo fijo adicional de protección.

## 3. Reglas del negocio que el código debe respetar
- Distritos: solo San Isidro y Jesús María. Cliente y paseador mayores de 18 años.
- Tamaños: pequeño hasta 10 kg, mediano 10 a 25 kg, grande más de 25 kg. Nunca se mezclan tamaños en un grupo.
- Máximo 3 perros por paseo, y 2 en los primeros 10 paseos de un paseador. Razas potencialmente peligrosas no se atienden por ahora.
- Horario de recojo: 6:00 a 21:00. Duraciones: 30, 60 o 90 minutos. Plan lunes a viernes con 10 % de descuento. Cancelación gratis hasta 2 horas antes.
- Código de recojo de 4 dígitos que el dueño da al paseador al entregar al perro.
- Paseador: tarifa libre entre S/ 16 y S/ 34 por hora, calificación mínima 4,7, primeros paseos acompañados.
- Comisión: 20 % (decisión del equipo), configurable en lib/config.ts (`comision`). Por defecto la familia paga el precio del paseador y Patitas se queda el 20 % de ese precio (`comisionModo`). El pago se hace AL TERMINAR el paseo (no antes).

## 4. Especificación de las mecánicas

### 4.1 Estados del paseo (lib/)
asignado, recogido, paseando, entregado, completado, cancelado, disputa. Solo transiciones válidas; cualquier otra lanza error y tiene prueba. La app del cliente y la del paseador usan la misma máquina. Cada cambio guarda hora y quién lo hizo.

### 4.2 Pago intermediado manual
Patitas cobra AL FINAL del paseo (decisión del equipo): la reserva NO pide pago y el paseador sale sin esperar ningún pago. Cuando el dueño toca «Recibí a [perro]» aparece «Paga a Patitas»: monto, QR o números de `cobroEquipo` (los llena el equipo; nunca se inventan: vacío = «Falta configurar») y el nombre de la cuenta de Patitas (titular) a la vista. La familia paga con Yape, Plin o transferencia y le muestra el pago al paseador; el paseador compara el monto y el titular y toca «Vi el pago» (puede anotar la hora). Después, en /admin «Por pagar al paseador», el equipo confirma en SU cuenta que el dinero llegó y marca «Pagado al paseador» (comisión y neto salen de CONFIG; el Yape o Plin del paseador es solo para el equipo). Mientras el equipo no lo confirme, no se le paga al paseador. Si no lo encuentra: «No lo encuentro» con nota y se abre un caso («Reportar problema»). Plazo `horasParaPagar` (24 h): recordatorio suave y, mientras haya un pago pendiente, no se puede reservar otro paseo. Si el paseo no se hizo (rechazado, vencido o cancelado) no hay nada que pagar. La app NO mueve dinero: lo hace el equipo a mano. El paseador registra dónde cobrar (Yape o Plin): solo él y el equipo lo ven, nunca el dueño. Textos: «Pagas al terminar el paseo.» y «Patitas le paga al paseador después de confirmar el pago en su cuenta.» Prohibido decir o hacer que se paga antes o que el paseo espera el pago. Las disputas van con «Reportar problema».

### 4.3 Entrega con doble confirmación
El paseador toca "Entregué"; el dueño toca "Llegó bien". Si el dueño no responde en 15 minutos, recordatorio. El botón "Hubo un problema" abre una disputa con motivo y queda en /admin.

### 4.3b Cancelación del paseador
Si cancela, mostrar 2 o 3 paseadores compatibles (tamaño y horario, usando lib/schedule.ts) y armar un mensaje wa.me para avisarles.

### 4.4 SOS real sin servidor
Enlaces tel: y wa.me. El mensaje de WhatsApp ya viene escrito con el nombre del perro, el paseador y un enlace de mapas con la ubicación. Orden en pantalla: serenazgo del distrito del paseo (lib/config.ts: serenazgo.sanIsidro y serenazgo.jesusMaria), Policía 105, Bomberos 116, SAMU 106 (confirmar en gob.pe) y por último Patitas. El contacto de emergencia del dueño solo aparece en el SOS del paseador, como «Contacto del dueño». No hay lista de veterinarias: Patitas no tiene convenio con ninguna. Número vacío: «Falta configurar». Nunca digas que alguien responde 24/7.

### 4.5 Pruebas del paseo (son señales, no pruebas absolutas)
- Foto solo con la cámara de la app (getUserMedia), sin subir desde la galería.
- Código de 2 dígitos que la app muestra al paseador y que debe salir en la foto; el dueño lo ve y compara.
- Seguimiento por PUNTOS DE CONTROL con foto (decisión del equipo): la ubicación se registra al empezar, al terminar y en cada foto, y un recordatorio suave cada `minutosPuntoControl` pide una foto de control. El celular no sigue la ubicación con la pantalla apagada: nunca prometas seguimiento continuo («En vivo», «cada 45 segundos», un mapa que se mueve). Los avisos de zona (velocidad imposible para una caminata, 10 minutos sin moverse, salir de la zona del parque o del distrito; usa lib/geo.ts) son solo una ayuda mientras la pantalla está encendida.
- **Actualización 16 de octubre (pedido del equipo, Bloque 6):** con servidor hay una ubicación en vivo del paseador cada pocos segundos (`segundosEnVivo`), visible para la familia en el mapa, SOLO con la app abierta y solo mientras el paseo está en curso (se borra al entregar). El texto dice «Funciona con la app abierta» y NUNCA promete que no se pueda falsificar. Sigue siendo cierto que con la pantalla apagada o la app cerrada no hay seguimiento y que el seguimiento oficial son los puntos de control con foto.
- Hora tomada por una ruta de Next.js (/api/hora); si no hay servidor, usar la hora del teléfono y marcarla como no verificada.
- La ubicación y la cámara exigen HTTPS (localhost funciona). Una VPN no cambia el GPS; el riesgo real son apps de ubicación simulada, así que nunca escribas que la ubicación es inalterable.
- Las alertas se muestran en la bitácora y en /admin; no bloquean al paseador solas.

### 4.6 Verificación de paseadores
- Selfie al iniciar el día, visible para el cliente en la tarjeta del paseo.
- Mini curso de 5 pantallas (primeros auxilios, golpe de calor, correa, peleas entre perros, qué hacer si un perro escapa) y test; se aprueba con 80 %. Amplía lib/quiz.ts.
- El sello "verificado" solo se enciende si en /admin están marcadas las casillas: videollamada hecha y registros oficiales revisados por el equipo. No pedir capturas al postulante ni guardar el DNI digital durante el piloto.
- /admin protegido con una contraseña desde variable de entorno.

### 4.7 Datos de ejemplo y reseñas
Paseadores y reseñas inventados llevan esEjemplo y la etiqueta "Ejemplo", con interruptor para ocultarlos. Una reseña solo se puede escribir después de un paseo completado. Nunca mostrar datos de ejemplo como reales.

### 4.8 Privacidad
Nunca mostrar celulares entre cliente y paseador. Texto corto y claro de qué datos se guardan y dónde (en el piloto, solo en el teléfono). El cliente ve del paseador solo lo necesario.

## 5. Pantallas nuevas
- Quiénes somos: equipo real con su permiso, WhatsApp de contacto y etiqueta "Piloto". Decir que son 3 estudiantes.
- Si algo pasa: pasos claros ante un perro perdido, herido o una pelea, con el botón de SOS.
- Primera pantalla: tres pruebas concretas (foto de cada paseo, mismo tamaño de perros siempre, código de recojo).

## 6. Texto en pantalla
Prohibido: seguro, custodia, escrow, soporte 24/7, 100 %, garantizado, no falsificable, sin riesgo, y "verificado" si las casillas de /admin no están marcadas.
Permitido: lo que la app hace de verdad, en lenguaje simple y sin tecnicismos. Si algo es demo o ejemplo, dilo.

## 7. Cómo probar
- Pruebas automáticas (Vitest): máquina de estados (cada transición válida e inválida), pago acordado, reglas de tamaño y cupo, alertas de ubicación, disputas.
- Pruebas en un celular real (no las reemplazan las automáticas): cámara, GPS con HTTPS, SOS, pantalla chica, conexión lenta.
- Explica siempre cómo probarlo en el celular con una versión publicada con HTTPS.

## 8. Una tarea está terminada cuando
- Pasan las pruebas automáticas y nada anterior se rompió.
- Un cliente desconfiado entendería qué pasa si algo sale mal, quién responde y cómo se prueba que el paseo ocurrió.
- La pantalla no promete nada que no exista, no muestra celulares ni DNI completo, y no presenta datos de ejemplo como reales.
- Funciona con la pantalla chica de un celular.
- Resumiste: qué cambió, qué probaste, qué sigue simulado y qué riesgos ves.

## 9. Cuándo parar y preguntar
Antes de elegir base de datos, hosting, pasarela de pagos o cualquier servicio externo; antes de guardar datos personales; antes de borrar o reescribir algo que no sea de la tarea; y cuando una regla de esta skill choque con lo que se pide.

## 10. Orden de tareas
0 Git y .gitignore. 1 lib/config.ts. 2 máquina de estados. 3 pago acordado. 4 doble confirmación y disputa. 5 SOS. 6 pruebas del paseo. 7 selfie. 8 mini curso. 9 reasignación. 10 datos de ejemplo. 11 pantallas Quiénes somos y Si algo pasa. 12 /admin protegido y casillas. 13 solo si se pide: Supabase gratuito para chat y estado entre celulares.

## 11. Para después (no hacer ahora)
Empresa y RUC, póliza, pasarela de pagos automática, filtro anti-fuga del chat, dominio propio, registro de marca, app Android nativa.
