-- Patitas Conectadas · Bloque 6 (16 de octubre de 2026): la hora y el lugar de las fotos, fotos «sospechosas» (solo el equipo)
-- y la ubicación en vivo del paseo. NADA de esto está aplicado: la aplica una persona del equipo (después de
-- `20261016200000_respuestas_escritas`). NUNCA edita una migración aplicada: solo suma columnas, tablas y funciones.
--
-- Lo que NO promete: la ubicación la lee el teléfono y se puede falsificar (apps de ubicación simulada). Esto solo deja una hora
-- que NO puede poner el teléfono (la del servidor) y avisa al equipo de cosas raras. «Sospechosa» no es «falsa»: lo mira una persona.
-- Los umbrales (60 m, 500 m, 25 km/h) son una copia de `sospechaPrecisionMetros`, `sospechaRadioMetros` y `sospechaVelocidadKmh`
-- de lib/config.ts: una prueba los compara.

/* ---------------------------------------------------------------- precisión y hora oficial */
alter table public.fotos
  add column precision_m double precision check (precision_m is null or (precision_m >= 0 and precision_m <= 100000)),
  add column hora_servidor timestamptz not null default now();
alter table public.puntos_control
  add column hora_servidor timestamptz not null default now();

-- La hora oficial la pone el SERVIDOR: aunque el teléfono mande otra, se ignora. (`en` sigue siendo la hora que dice el teléfono.)
create function privado.sellar_hora() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.hora_servidor := now();
  return new;
end $$;
create trigger fotos_sellar_hora before insert on public.fotos
  for each row execute function privado.sellar_hora();
create trigger puntos_sellar_hora before insert on public.puntos_control
  for each row execute function privado.sellar_hora();

/* ---------------------------------------------------------------- distancia entre dos puntos (metros) */
create function privado.distancia_m(p_lat1 double precision, p_lng1 double precision, p_lat2 double precision, p_lng2 double precision)
returns double precision
language sql immutable set search_path = '' as $$
  select 2 * 6371000 * asin(least(1, sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
  )))
$$;

/* ---------------------------------------------------------------- fotos «sospechosas»: solo las ve el equipo */
create table public.fotos_sospechas (
  foto_id uuid primary key references public.fotos (id) on delete cascade,
  paseo_id text not null references public.paseos (id) on delete cascade,
  -- 'precision' (la lectura tenía mucho error), 'lejos' (lejos de la casa del paseo) o 'salto' (se movió más rápido de lo posible)
  motivos text[] not null check (cardinality(motivos) > 0),
  calculada_en timestamptz not null default now()
);
create index fotos_sospechas_paseo_idx on public.fotos_sospechas (paseo_id);
alter table public.fotos_sospechas enable row level security;
create policy fotos_sospechas_equipo on public.fotos_sospechas for select to authenticated
  using (privado.es_equipo());
grant select on public.fotos_sospechas to authenticated;

-- Al guardar una foto del paseo con ubicación, se revisa y, si algo no cuadra, se anota (solo para el equipo).
create function privado.marcar_sospechosa() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_motivos text[] := '{}';
  v_casa record;
  v_prev record;
  v_dist double precision;
  v_seg double precision;
begin
  if new.tipo <> 'paseo' or new.lat is null or new.lng is null then
    return new;
  end if;
  if new.precision_m is not null and new.precision_m > 60 then
    v_motivos := array_append(v_motivos, 'precision');
  end if;
  select c.lat, c.lng into v_casa
    from public.paseos s join public.casas c on c.familia_id = s.familia_id
   where s.id = new.paseo_id;
  if v_casa.lat is not null and v_casa.lng is not null
     and privado.distancia_m(new.lat, new.lng, v_casa.lat, v_casa.lng) > 500 then
    v_motivos := array_append(v_motivos, 'lejos');
  end if;
  select f.lat, f.lng, f.hora_servidor into v_prev
    from public.fotos f
   where f.paseo_id = new.paseo_id and f.id <> new.id and f.tipo = 'paseo' and f.lat is not null and f.lng is not null
   order by f.hora_servidor desc limit 1;
  if v_prev.lat is not null then
    v_dist := privado.distancia_m(v_prev.lat, v_prev.lng, new.lat, new.lng);
    v_seg := greatest(extract(epoch from new.hora_servidor - v_prev.hora_servidor), 1);
    -- Menos de 100 m no cuenta: es el error normal del GPS (con segundos de diferencia saldría una velocidad enorme).
    if v_dist >= 100 and (v_dist / 1000.0) / (v_seg / 3600.0) > 25 then
      v_motivos := array_append(v_motivos, 'salto');
    end if;
  end if;
  if cardinality(v_motivos) > 0 then
    insert into public.fotos_sospechas (foto_id, paseo_id, motivos) values (new.id, new.paseo_id, v_motivos)
      on conflict (foto_id) do nothing;
  end if;
  return new;
end $$;
create trigger fotos_marcar_sospechosa after insert on public.fotos
  for each row execute function privado.marcar_sospechosa();

/* ---------------------------------------------------------------- ubicación en vivo (solo con la app abierta) */
-- Una sola fila por paseo con la última lectura del paseador. Solo existe mientras el paseo está «en_paseo»: al salir de ese
-- estado se borra. La hora la pone el servidor. La ven el paseador, la familia de ese paseo y el equipo.
create table public.ubicacion_en_vivo (
  paseo_id text primary key references public.paseos (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  precision_m double precision check (precision_m is null or (precision_m >= 0 and precision_m <= 100000)),
  en timestamptz not null default now()
);
alter table public.ubicacion_en_vivo enable row level security;
create policy ubicacion_en_vivo_ver on public.ubicacion_en_vivo for select to authenticated
  using (privado.participa(paseo_id) or privado.es_equipo());
grant select on public.ubicacion_en_vivo to authenticated;

-- La única puerta para escribir. Un «no» de las reglas llega como respuesta con motivo: 'no_es_tuyo', 'no_en_paseo',
-- 'lugar' o 'muy_seguido' (más de una lectura cada 2 segundos).
create function public.publicar_ubicacion(p_paseo text, p_lat double precision, p_lng double precision, p_precision double precision default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_estado public.estado_paseo;
  v_ultima timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Entra a tu cuenta.' using errcode = '42501';
  end if;
  if not privado.es_paseador_de(p_paseo) then
    return jsonb_build_object('publicado', false, 'motivo', 'no_es_tuyo');
  end if;
  select s.estado into v_estado from public.paseos s where s.id = p_paseo;
  if v_estado is distinct from 'en_paseo' then
    return jsonb_build_object('publicado', false, 'motivo', 'no_en_paseo');
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180
     or (p_precision is not null and (p_precision < 0 or p_precision > 100000)) then
    return jsonb_build_object('publicado', false, 'motivo', 'lugar');
  end if;
  select u.en into v_ultima from public.ubicacion_en_vivo u where u.paseo_id = p_paseo;
  if v_ultima is not null and v_ultima > now() - interval '2 seconds' then
    return jsonb_build_object('publicado', false, 'motivo', 'muy_seguido');
  end if;
  insert into public.ubicacion_en_vivo (paseo_id, lat, lng, precision_m, en)
    values (p_paseo, p_lat, p_lng, p_precision, now())
    on conflict (paseo_id) do update set lat = excluded.lat, lng = excluded.lng, precision_m = excluded.precision_m, en = excluded.en;
  return jsonb_build_object('publicado', true);
end $$;
revoke all on function public.publicar_ubicacion(text, double precision, double precision, double precision) from public, anon;
grant execute on function public.publicar_ubicacion(text, double precision, double precision, double precision) to authenticated;

-- Al terminar de pasear (o si el paseo se reporta, cancela o cierra), la ubicación en vivo se borra.
create function privado.borrar_ubicacion_en_vivo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estado is distinct from 'en_paseo' then
    delete from public.ubicacion_en_vivo where paseo_id = new.id;
  end if;
  return new;
end $$;
create trigger paseos_borrar_ubicacion_en_vivo after update of estado on public.paseos
  for each row when (old.estado is distinct from new.estado) execute function privado.borrar_ubicacion_en_vivo();
