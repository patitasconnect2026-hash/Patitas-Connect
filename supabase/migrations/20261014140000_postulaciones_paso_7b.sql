-- Patitas Conectadas · paso 7b del plan del servidor (postulaciones y casos en la base).
-- NUNCA edita una migración aplicada: solo suma reglas nuevas. La aplica una persona del equipo, aparte de las anteriores.

/* ---------------------------------------------------------------- las notas internas del equipo, solo para el equipo */
-- `postulaciones.revision_notas` (ya aplicada) es una columna de una tabla que el POSTULANTE puede leer entera (su fila):
-- las «notas internas» que el equipo escribe en /admin («qué notaste en la videollamada, dudas…») quedarían a su alcance
-- si llamara a la base directo, aunque la pantalla del paseador no las muestre. Con servidor, la app guarda esas notas
-- aquí, en una tabla que lee y escribe SOLO el equipo. La columna vieja queda sin usar (el postulante no la puede cambiar:
-- `limitar_postulacion` lo impide) y se deja como está para no tocar lo aplicado.
create table public.notas_revision (
  paseador_id uuid primary key references public.postulaciones (paseador_id) on delete cascade,
  nota text not null default '' check (char_length(nota) <= 2000),
  marcado_por uuid references public.perfiles (id),
  actualizado_en timestamptz not null default now()
);
alter table public.notas_revision enable row level security;
grant select, insert, update, delete on public.notas_revision to authenticated;
revoke all on public.notas_revision from anon;

create policy notas_revision_ver on public.notas_revision for select to authenticated
  using (privado.es_equipo());
create policy notas_revision_crear on public.notas_revision for insert to authenticated
  with check (privado.es_equipo());
create policy notas_revision_editar on public.notas_revision for update to authenticated
  using (privado.es_equipo()) with check (privado.es_equipo());
