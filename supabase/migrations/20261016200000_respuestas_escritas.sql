-- Patitas Conectadas · Bloque 5 (16 de octubre de 2026): las respuestas ESCRITAS del examen del paseador.
-- NADA de esto está aplicado: la aplica una persona del equipo (después de `20261016100000_pedidos`).
-- NUNCA edita una migración aplicada: solo suma una tabla y una función.
--
-- Qué guarda: lo que el paseador escribió en cada pregunta del examen. Solo lo lee el EQUIPO (no el paseador ni las familias).
-- Al borrar su cuenta se borran en cadena (`on delete cascade` desde `perfiles`, igual que su DNI y su postulación).
-- Los largos (40 y 600 letras) son una copia de `respuestaMinima` y `respuestaMaxima` de lib/config.ts: una prueba los compara.

create table public.respuestas_escritas (
  paseador_id uuid not null references public.perfiles (id) on delete cascade,
  pregunta_id text not null check (pregunta_id ~ '^[a-z0-9_-]{1,40}$'),
  texto text not null check (char_length(texto) between 40 and 600),
  escrito_en timestamptz not null default now(),
  primary key (paseador_id, pregunta_id)
);

alter table public.respuestas_escritas enable row level security;
-- Solo el equipo lee. Nadie escribe directo: la única puerta es `guardar_respuestas_examen`.
create policy respuestas_escritas_equipo on public.respuestas_escritas for select to authenticated
  using (privado.es_equipo());
grant select on public.respuestas_escritas to authenticated;

/* ---------------------------------------------------------------- guardar las respuestas del propio examen */
-- Guarda las respuestas de QUIEN LLAMA (un paseador). Recibe un objeto {pregunta: texto}. Un «no» de las reglas llega como
-- respuesta con motivo (no como error de red): 'rol', 'formato', 'corta' o 'larga'. Volver a mandar lo mismo no hace daño
-- (se reemplaza la respuesta de esa pregunta). No borra respuestas de otras preguntas.
create function public.guardar_respuestas_examen(p_respuestas jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_k text;
  v_v jsonb;
  v_t text;
  v_n int := 0;
begin
  if v_uid is null then
    raise exception 'Entra a tu cuenta.' using errcode = '42501';
  end if;
  if not privado.es_paseador() then
    return jsonb_build_object('guardado', false, 'motivo', 'rol');
  end if;
  if p_respuestas is null or jsonb_typeof(p_respuestas) <> 'object' or (select count(*) from jsonb_object_keys(p_respuestas)) > 20 then
    return jsonb_build_object('guardado', false, 'motivo', 'formato');
  end if;
  -- Primero se revisan todas: o se guardan todas o ninguna.
  for v_k, v_v in select key, value from jsonb_each(p_respuestas) loop
    if v_k !~ '^[a-z0-9_-]{1,40}$' or jsonb_typeof(v_v) <> 'string' then
      return jsonb_build_object('guardado', false, 'motivo', 'formato');
    end if;
    v_t := btrim(v_v #>> '{}');
    if char_length(v_t) < 40 then
      return jsonb_build_object('guardado', false, 'motivo', 'corta', 'pregunta', v_k);
    end if;
    if char_length(v_t) > 600 then
      return jsonb_build_object('guardado', false, 'motivo', 'larga', 'pregunta', v_k);
    end if;
  end loop;
  for v_k, v_v in select key, value from jsonb_each(p_respuestas) loop
    insert into public.respuestas_escritas (paseador_id, pregunta_id, texto)
      values (v_uid, v_k, btrim(v_v #>> '{}'))
      on conflict (paseador_id, pregunta_id) do update set texto = excluded.texto, escrito_en = now();
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('guardado', true, 'n', v_n);
end $$;
revoke all on function public.guardar_respuestas_examen(jsonb) from public, anon;
grant execute on function public.guardar_respuestas_examen(jsonb) to authenticated;
