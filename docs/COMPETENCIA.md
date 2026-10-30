# Competencia, funciones nuevas y modelo de ganancias

Pedido de Yahrod, 30 de octubre de 2026. Se revisaron las webs públicas de gudog.com, paseaperros.pe, mimopet.lat, dimu.app, mipaseador.pe, paseadores.pe, mywak.com.co y wakypet.com (solo lo que muestran sin cuenta). Lo que es **simulado** está marcado; nada cobra dinero todavía.

## Qué tomamos de cada una

| Idea | Dónde la vimos | Cómo quedó en Patitas Connect |
|---|---|---|
| Perfiles con reseñas y puntaje | Gudog, Wakypet, Mywak | Calificación por barras (1–100 %) en las dos direcciones y ranking final 1–10 solo del paseador (`lib/calificacionDetallada.ts`) |
| Paseo en vivo con mapa y fotos | DIMU, Mywak, Wakypet | Ya existía; ahora con panel de señal, Google Maps para compartir y llamadas rápidas (`PanelSenal.tsx`) |
| Servicios extra (entrenamiento, visitas) | Gudog, Mimo, DIMU | `lib/servicios.ts`: paseo y paseo de cuidado especial activos; el resto «Pronto» |
| Planes y suscripciones | Mimo, Mywak | Gratis / Plus / Club con límites (`lib/planes.ts`), **simulados** |
| Reemplazo si el paseador falla | Gudog | Rescate tipo InDrive: el pedido se reabre con bono (`lib/penalizaciones.ts`) |
| Registro rápido de paseadores | paseadores.pe, mipaseador.pe | Registro de 7 a 6 pasos y «Trae a tu grupo» con código |
| Alianzas con veterinarias | Mimo, DIMU | Invitación a veterinarias; la lista está vacía hasta firmar con alguna |

## Reglas clave

- **Calificación:** la familia califica al paseador (puntualidad, cuidado, comunicación, fotos, trato) y le da un puntaje 1–10. El paseador califica al perro (limpieza, fuerza, agresividad, energía…) y a la familia; si lo que ve contradice la ficha, la app lo marca (agresividad observada ≥ 60 = alerta). Ranking bayesiano: con pocas notas no sube ni baja de golpe.
- **Faltas del paseador:** cancelar 12 h antes no suma; 2–12 h, 1 punto; menos de 2 h, 2; no llegar, 3. Emergencia con constancia, 0. 3 puntos = aviso, 5 = pausa de 7 días, 8 = revisión.
- **Rescate:** si el paseador cancela, el pedido vuelve a la zona con un bono pagado de la comisión (nunca más que la comisión).
- **GPS perdido:** 3 min se demora, 6 min sin ubicación, 12 min llamamos, 20 min alerta con botones a serenazgo y Policía. Si se mueve como vehículo (más de 20 km/h dos veces), alerta directa.
- **Celular apagado / taxi con perro caro:** revisión de batería antes de salir, puntos de control con foto, reglas de perros de alto valor (solo paseadores Pro o Élite, sin subir a vehículos, foto al recoger con el portero).
- **Quién paga la vete (ej. S/ 400):** enfermedad previa o ficha falsa → familia; el paseador rompió una regla → paseador; accidente sin culpa → fondo de cuidado hasta su tope (**en diseño, no cubre nada hoy**) y el resto la familia. Se reporta en 24 h con boleta; la familia deja en la ficha cuánto autoriza gastar.
- **Nadie acusa sin evidencia:** fotos de recojo y entrega, puntos de control, chat guardado. Dos reportes sin sustento pausan la cuenta de quien reporta.

## Recomendaciones legales (no reemplazan a un abogado)

1. **Constituir la empresa** (SAC o EIRL) antes de cobrar: separa tu patrimonio personal del negocio. Una queja grave contra una persona natural sí puede alcanzar sus bienes.
2. **Seguro de responsabilidad civil** apenas haya empresa: es lo que realmente paga un daño a terceros. Mientras tanto, el texto legal dice claro que hoy no hay póliza.
3. **Términos firmados** (ya están en la app, versión `2026-10-v5`): paseador independiente, quién paga cada caso, plazo para reportar, autorización de gasto veterinario.
4. **Evidencia siempre**: las fotos, la ubicación y el chat son la defensa de las dos partes.
5. **Libro de reclamaciones virtual** (obligatorio en Perú para quien vende al público) cuando haya empresa.
6. Que un abogado revise los textos de `lib/legal.ts` antes de cobrar.

## Modelo de ganancias (por mes)

Salen de `lib/ganancias.ts` (`ESCENARIOS`). Comisión por nivel: Nuevo 20 %, Pro 15 %, Élite 10 %. Se restan fondo de cuidado (S/ 1 por paseo), bonos de rescate, pasarela de pago y gastos fijos.

| | Mínimo | Medio | Máximo |
|---|---|---|---|
| Paseadores | 10 | 40 | 150 |
| Familias | 40 | 250 | 1 200 |
| Paseos al mes | 240 | 2 000 | 12 000 |
| Lo que pagan las familias | S/ 5 280 | S/ 46 000 | S/ 288 000 |
| Comisión promedio | 19,5 % | 17 % | 15,5 % |
| Ingreso por comisión | S/ 1 030 | S/ 7 820 | S/ 44 640 |
| Membresías + destacados | S/ 80 | S/ 1 665 | S/ 10 816 |
| Costos (fondo, bonos, pasarela, fijos) | S/ 381 | S/ 4 540 | S/ 30 800 |
| **Ganancia neta al mes** | **S/ 728** | **S/ 4 945** | **S/ 24 656** |
| Ganancia al año | S/ 8 738 | S/ 59 341 | S/ 295 872 |
| Lo que recibe un paseador al mes | S/ 425 | S/ 955 | S/ 1 622 |

Son supuestos, no promesas: cambian con el precio del paseo, cuántas veces pasea cada familia y los gastos reales (sueldos no incluidos en el mínimo).
