-- Patitas Conectadas · Bloque 7 (16 de octubre de 2026): el registro de cada uso de la IA de apoyo del equipo.
-- NADA de esto está aplicado: la aplica una persona del equipo (después de `20261016300000_ubicacion_y_sospechas`).
-- NUNCA edita una migración aplicada: solo suma una tabla.
--
-- Guarda SOLO quién del equipo la usó, sobre quién y cuándo. No guarda lo que se envió ni lo que respondió la IA.
-- La Edge Function `resumen-ia` escribe aquí con la sesión de la persona del equipo (sin clave de servicio) ANTES de llamar a la IA.

create table public.usos_ia (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.perfiles (id) on delete cascade,
  -- Sobre quién se pidió el resumen. Si esa persona borra su cuenta queda en blanco (el registro del uso se conserva sin datos suyos).
  paseador_id uuid references public.perfiles (id) on delete set null,
  en timestamptz not null default now()
);
create index usos_ia_en_idx on public.usos_ia (en desc);

alter table public.usos_ia enable row level security;
-- Lo lee y lo escribe solo el equipo, y solo a su propio nombre.
create policy usos_ia_ver on public.usos_ia for select to authenticated
  using (privado.es_equipo());
create policy usos_ia_crear on public.usos_ia for insert to authenticated
  with check (privado.es_equipo() and equipo_id = (select auth.uid()));
grant select, insert on public.usos_ia to authenticated;
