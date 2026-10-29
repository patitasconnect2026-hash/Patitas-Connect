-- Patitas Conectadas · decisión de la usuaria (15 de octubre de 2026): la videollamada es solo entre el paseador y el equipo.
-- NUNCA edita una migración aplicada: solo quita lo que ya no se usa. La aplica una persona del equipo.

/* ---------------------------------------------------------------- se quitan las referencias */
-- El paseador solo escoge la HORA de la videollamada (`postulaciones.cita_videollamada`). Ya no hay forma de traer o invitar
-- a otras personas (acompañantes, invitados ni referencias): la pantalla ya no las pide y la app ya no las manda. Esta columna
-- guardaba el nombre, la relación y el celular de DOS personas ajenas; se borra con sus datos (los de quien ya las escribió
-- también: son datos de terceros que ya no se usan para nada).
-- `paseadores_publicos` y las reglas de `postulaciones` no la usaban.
alter table public.postulaciones drop column if exists referencias;
