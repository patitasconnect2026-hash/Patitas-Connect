-- Patitas Conectadas · «Pedir paseo» (16 de octubre de 2026). NADA de esto está aplicado: la aplica una persona del equipo,
-- DESPUÉS de las anteriores (ver docs/PUBLICAR.md). NUNCA edita una migración aplicada.
--
-- La familia pide un paseo (día, hora, duración, su perro y cuánto pagaría por UNA hora); le llega SOLO a los paseadores aprobados,
-- disponibles y de su zona; cada uno acepta al monto o manda UNA contraoferta de más dinero (dentro del tope); la familia elige.
-- Al elegir nace el paseo de siempre (sin pago adelantado). Todo se escribe por funciones: nadie toca las tablas directo.
-- Privacidad: el paseador ve solo el distrito y una zona APROXIMADA (cuadrícula de ~330 m) hasta que lo eligen; el punto exacto
-- lo ve la familia y el equipo (y el paseador, como hoy, la casa recién después de aceptar).
-- Los topes de dinero (16 y 34) son una copia de `tarifaMinima` y `tarifaMaxima` de lib/config.ts: una prueba los compara.

/* ---------------------------------------------------------------- cuándo empieza cada paseo */
-- Para saber si un paseador ya tiene otro paseo a esa hora. Los paseos que ya existen quedan en null (no cuentan).
alter table public.paseos add column inicio timestamptz;

/* ---------------------------------------------------------------- tablas */
create table public.pedidos (
  id text primary key,
  familia_id uuid not null references public.perfiles (id) on delete cascade,
  perro_id uuid references public.perros (id) on delete set null,
  perro jsonb not null,
  dueno_nombre text not null,
  horario text not null,
  inicio timestamptz not null,
  duracion_min int not null check (duracion_min in (30, 60, 90)),
  tamano text not null check (tamano in ('small', 'medium', 'large')),
  distrito text not null check (distrito in ('San Isidro', 'Jesús María')),
  -- Los parques cercanos a la casa (los calcula la app de la familia con el radio de lib/config.ts). Vacío = todo el distrito.
  parques_cerca text[] not null default '{}' check (cardinality(parques_cerca) <= 12),
  -- El punto aproximado (lo único de lugar que ve el paseador) y el exacto (solo la familia y el equipo).
  zona_lat double precision not null check (zona_lat between -90 and 90),
  zona_lng double precision not null check (zona_lng between -180 and 180),
  punto_lat double precision check (punto_lat between -90 and 90),
  punto_lng double precision check (punto_lng between -180 and 180),
  monto_hora numeric(10, 2) not null check (monto_hora between 16 and 34),
  estado text not null default 'abierto' check (estado in ('abierto', 'con_ofertas', 'elegido', 'vencido', 'cancelado')),
  expira_en timestamptz not null,
  paseo_id text,
  creado_en timestamptz not null default now()
);
-- Una familia, un pedido activo.
create unique index pedidos_uno_activo_idx on public.pedidos (familia_id) where estado in ('abierto', 'con_ofertas');

create table public.ofertas (
  id text primary key,
  pedido_id text not null references public.pedidos (id) on delete cascade,
  paseador_id uuid not null references public.perfiles (id) on delete cascade,
  paseador_nombre text not null,
  monto_hora numeric(10, 2) not null check (monto_hora between 16 and 34),
  tipo text not null check (tipo in ('acepta', 'contraoferta')),
  estado text not null default 'enviada' check (estado in ('enviada', 'elegida', 'descartada')),
  creado_en timestamptz not null default now(),
  check (id = pedido_id || ':' || paseador_id::text),
  unique (pedido_id, paseador_id)
);
create index ofertas_paseador_idx on public.ofertas (paseador_id, creado_en desc);

-- Quién vio el pedido (solo para contar: la familia nunca ve nombres).
create table public.pedidos_vistos (
  pedido_id text not null references public.pedidos (id) on delete cascade,
  paseador_id uuid not null references public.perfiles (id) on delete cascade,
  visto_en timestamptz not null default now(),
  primary key (pedido_id, paseador_id)
);

alter table public.pedidos enable row level security;
alter table public.ofertas enable row level security;
alter table public.pedidos_vistos enable row level security;
-- Solo se lee; todo lo demás va por las funciones de abajo.
revoke all on public.pedidos, public.ofertas, public.pedidos_vistos from anon;
grant select on public.pedidos, public.ofertas to authenticated;

-- El paseador NO lee `pedidos` directo (traería el punto exacto): los ve por `pedidos_abiertos()`.
create policy pedidos_ver on public.pedidos for select to authenticated
  using (familia_id = (select auth.uid()) or privado.es_equipo());
create policy ofertas_ver on public.ofertas for select to authenticated
  using (
    paseador_id = (select auth.uid())
    or privado.es_equipo()
    or exists (select 1 from public.pedidos p where p.id = ofertas.pedido_id and p.familia_id = (select auth.uid()))
  );
-- «Vistos» no lo lee nadie desde la app: solo cuentan las funciones.
create policy pedidos_vistos_nadie on public.pedidos_vistos for all to authenticated using (false) with check (false);

/* ---------------------------------------------------------------- ayudas */
-- ¿El paseador ya tiene un paseo aceptado a esa hora?
create function privado.paseador_ocupado(p_paseador uuid, p_inicio timestamptz, p_duracion int) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.paseos s
    where s.paseador_id = p_paseador
      and s.estado in ('aceptado', 'en_camino', 'en_paseo')
      and s.inicio is not null
      and tstzrange(s.inicio, s.inicio + make_interval(mins => s.duracion_min)) && tstzrange(p_inicio, p_inicio + make_interval(mins => p_duracion))
  )
$$;

-- ¿Este paseador (con sesión) está aprobado, disponible y es de la zona del pedido?
create function privado.pedido_es_de_mi_zona(p_pedido public.pedidos, p_paseador uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.paseadores_publicos v
    join public.postulaciones po on po.paseador_id = v.paseador_id
    where v.paseador_id = p_paseador
      and coalesce(v.perfil ->> 'disponible', 'true') <> 'false'
      and v.distrito = p_pedido.distrito
      and (cardinality(p_pedido.parques_cerca) = 0 or p_pedido.parques_cerca && array(select jsonb_array_elements_text(coalesce(v.perfil -> 'spots', '[]'::jsonb))))
  )
$$;

-- Marca como «vencido» lo que ya pasó de hora (se hace cada vez que alguien lo mira o lo pide).
create function privado.vencer_pedidos() returns void
language sql security definer set search_path = '' as $$
  update public.pedidos set estado = 'vencido' where estado in ('abierto', 'con_ofertas') and expira_en <= now();
  update public.ofertas o set estado = 'descartada' from public.pedidos p where p.id = o.pedido_id and p.estado in ('vencido', 'cancelado') and o.estado = 'enviada';
$$;

/* ---------------------------------------------------------------- crear el pedido */
-- Devuelve `{creado: true}` o `{creado: false, motivo}` (un «no» de las reglas no es un error de la red).
create function public.crear_pedido(
  p_id text, p_perro_id uuid, p_perro jsonb, p_dueno text, p_horario text, p_inicio timestamptz, p_duracion int, p_tamano text,
  p_lat double precision, p_lng double precision, p_parques text[], p_monto numeric, p_vida_min int
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_distrito text;
  v_expira timestamptz;
begin
  if v_uid is null then
    raise exception 'Entra a tu cuenta para pedir un paseo.' using errcode = '42501';
  end if;
  if not privado.es_familia() then
    return jsonb_build_object('creado', false, 'motivo', 'solo_familias');
  end if;
  perform privado.vencer_pedidos();
  if exists (select 1 from public.pedidos where id = p_id and familia_id = v_uid) then
    return jsonb_build_object('creado', true, 'repetido', true);
  end if;
  if p_monto is null or p_monto < 16 or p_monto > 34 then
    return jsonb_build_object('creado', false, 'motivo', 'monto');
  end if;
  v_expira := now() + make_interval(mins => least(greatest(coalesce(p_vida_min, 15), 5), 60));
  if p_inicio is null or p_inicio <= v_expira or p_inicio > now() + interval '8 days' then
    return jsonb_build_object('creado', false, 'motivo', 'hora');
  end if;
  select c.distrito into v_distrito from public.casas c where c.familia_id = v_uid;
  if v_distrito is null then
    return jsonb_build_object('creado', false, 'motivo', 'sin_casa');
  end if;
  if p_perro_id is not null and not exists (select 1 from public.perros d where d.id = p_perro_id and d.familia_id = v_uid) then
    return jsonb_build_object('creado', false, 'motivo', 'perro');
  end if;
  if exists (
    select 1 from public.pagos g
    where g.familia_id = v_uid and g.estado in ('sin_pagar', 'no_encontrado') and g.paseo_estado in ('entregado', 'cerrado')
  ) then
    return jsonb_build_object('creado', false, 'motivo', 'pago_pendiente');
  end if;
  if exists (select 1 from public.pedidos where familia_id = v_uid and estado in ('abierto', 'con_ofertas')) then
    return jsonb_build_object('creado', false, 'motivo', 'ya_tienes_pedido');
  end if;
  insert into public.pedidos (id, familia_id, perro_id, perro, dueno_nombre, horario, inicio, duracion_min, tamano, distrito, parques_cerca,
                              zona_lat, zona_lng, punto_lat, punto_lng, monto_hora, expira_en)
  values (p_id, v_uid, p_perro_id, p_perro, left(btrim(p_dueno), 40), left(btrim(p_horario), 40), p_inicio, p_duracion, p_tamano, v_distrito,
          coalesce(p_parques, '{}'), round(p_lat / 0.003) * 0.003, round(p_lng / 0.003) * 0.003, p_lat, p_lng, p_monto, v_expira);
  return jsonb_build_object('creado', true);
end $$;

create function public.cancelar_pedido(p_pedido text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_n int;
begin
  if auth.uid() is null then
    raise exception 'Entra a tu cuenta.' using errcode = '42501';
  end if;
  update public.pedidos set estado = 'cancelado' where id = p_pedido and familia_id = auth.uid() and estado in ('abierto', 'con_ofertas');
  get diagnostics v_n = row_count;
  perform privado.vencer_pedidos();
  update public.ofertas o set estado = 'descartada' from public.pedidos p where p.id = o.pedido_id and p.estado = 'cancelado' and o.estado = 'enviada';
  return jsonb_build_object('cancelado', v_n > 0);
end $$;

/* ---------------------------------------------------------------- lo que ve el paseador */
-- Solo pedidos abiertos de SU zona, con lo mínimo: nombre de pila, perro (nombre y tamaño), hora y la zona APROXIMADA.
-- Al pedirla, queda anotado que los vio (para el contador de la familia).
create function public.pedidos_abiertos() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Entra a tu cuenta.' using errcode = '42501';
  end if;
  if not privado.es_paseador() then
    return '[]'::jsonb;
  end if;
  perform privado.vencer_pedidos();
  insert into public.pedidos_vistos (pedido_id, paseador_id)
  select p.id, v_uid from public.pedidos p
  where p.estado in ('abierto', 'con_ofertas') and p.expira_en > now() and privado.pedido_es_de_mi_zona(p, v_uid)
  on conflict do nothing;
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.expira_en)
    from (
      select p.id as pedido_id, split_part(p.dueno_nombre, ' ', 1) as dueno_nombre, p.perro ->> 'name' as perro_nombre, p.tamano, p.horario,
             p.inicio, p.duracion_min, p.distrito, p.zona_lat, p.zona_lng, p.monto_hora, p.expira_en,
             o.monto_hora as mi_oferta_monto, o.estado as mi_oferta_estado, privado.paseador_ocupado(v_uid, p.inicio, p.duracion_min) as ocupado
      from public.pedidos p
      left join public.ofertas o on o.pedido_id = p.id and o.paseador_id = v_uid
      where p.estado in ('abierto', 'con_ofertas') and p.expira_en > now() and privado.pedido_es_de_mi_zona(p, v_uid)
    ) t
  ), '[]'::jsonb);
end $$;

/* ---------------------------------------------------------------- ofertar */
create function public.ofertar(p_pedido text, p_monto numeric) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_p public.pedidos;
  v_nombre text;
begin
  if v_uid is null then
    raise exception 'Entra a tu cuenta.' using errcode = '42501';
  end if;
  if not privado.es_paseador() then
    return jsonb_build_object('ofertado', false, 'motivo', 'solo_paseadores');
  end if;
  perform privado.vencer_pedidos();
  select * into v_p from public.pedidos where id = p_pedido;
  if not found or v_p.estado not in ('abierto', 'con_ofertas') or v_p.expira_en <= now() then
    return jsonb_build_object('ofertado', false, 'motivo', 'ya_no');
  end if;
  if not privado.pedido_es_de_mi_zona(v_p, v_uid) then
    return jsonb_build_object('ofertado', false, 'motivo', 'fuera_de_zona');
  end if;
  if exists (select 1 from public.ofertas where pedido_id = p_pedido and paseador_id = v_uid) then
    return jsonb_build_object('ofertado', false, 'motivo', 'ya_ofertaste');
  end if;
  if p_monto is null or p_monto < v_p.monto_hora or p_monto > 34 then
    return jsonb_build_object('ofertado', false, 'motivo', 'monto');
  end if;
  if privado.paseador_ocupado(v_uid, v_p.inicio, v_p.duracion_min) then
    return jsonb_build_object('ofertado', false, 'motivo', 'ocupado');
  end if;
  select split_part(btrim(po.nombre), ' ', 1) into v_nombre from public.postulaciones po where po.paseador_id = v_uid;
  insert into public.ofertas (id, pedido_id, paseador_id, paseador_nombre, monto_hora, tipo)
  values (p_pedido || ':' || v_uid::text, p_pedido, v_uid, coalesce(v_nombre, ''), p_monto, case when p_monto = v_p.monto_hora then 'acepta' else 'contraoferta' end);
  update public.pedidos set estado = 'con_ofertas' where id = p_pedido and estado = 'abierto';
  return jsonb_build_object('ofertado', true);
end $$;

/* ---------------------------------------------------------------- elegir */
-- La familia ya creó el paseo (con el paseador y el monto de la oferta, como una reserva normal); aquí se cierra el pedido:
-- el paseo pasa a «aceptado» (el paseador ya había dicho que sí), la oferta queda elegida y las demás se descartan.
create function public.elegir_oferta(p_oferta text, p_paseo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_o public.ofertas;
  v_p public.pedidos;
begin
  if v_uid is null then
    raise exception 'Entra a tu cuenta.' using errcode = '42501';
  end if;
  perform privado.vencer_pedidos();
  select * into v_o from public.ofertas where id = p_oferta;
  if not found then
    return jsonb_build_object('elegido', false, 'motivo', 'ya_no');
  end if;
  select * into v_p from public.pedidos where id = v_o.pedido_id and familia_id = v_uid;
  if not found then
    return jsonb_build_object('elegido', false, 'motivo', 'ya_no');
  end if;
  if v_p.estado = 'elegido' and v_o.estado = 'elegida' then
    return jsonb_build_object('elegido', true, 'repetido', true);
  end if;
  if v_p.estado not in ('abierto', 'con_ofertas') or v_o.estado <> 'enviada' then
    return jsonb_build_object('elegido', false, 'motivo', 'ya_no');
  end if;
  if not exists (
    select 1 from public.paseos s
    where s.id = p_paseo and s.familia_id = v_uid and s.paseador_id = v_o.paseador_id and s.estado = 'solicitado'
  ) then
    return jsonb_build_object('elegido', false, 'motivo', 'paseo');
  end if;
  perform set_config('patitas.pedido_elige', 'on', true);
  update public.paseos set estado = 'aceptado' where id = p_paseo;
  perform set_config('patitas.pedido_elige', '', true);
  update public.pedidos set estado = 'elegido', paseo_id = p_paseo where id = v_p.id;
  update public.ofertas set estado = case when id = p_oferta then 'elegida' else 'descartada' end where pedido_id = v_p.id and estado = 'enviada';
  return jsonb_build_object('elegido', true);
end $$;

/* ---------------------------------------------------------------- los números para la familia */
-- «X paseadores lo vieron · Y disponibles en tu zona». Solo cifras.
create function public.contadores_pedido(p_pedido text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_p public.pedidos;
begin
  if auth.uid() is null then
    raise exception 'Entra a tu cuenta.' using errcode = '42501';
  end if;
  select * into v_p from public.pedidos where id = p_pedido and (familia_id = auth.uid() or privado.es_equipo());
  if not found then
    return jsonb_build_object('vistos', 0, 'disponibles', 0);
  end if;
  return jsonb_build_object(
    'vistos', (select count(*) from public.pedidos_vistos v where v.pedido_id = p_pedido),
    'disponibles', (select count(*) from public.paseadores_publicos v where privado.pedido_es_de_mi_zona(v_p, v.paseador_id))
  );
end $$;

revoke all on function public.crear_pedido(text, uuid, jsonb, text, text, timestamptz, int, text, double precision, double precision, text[], numeric, int) from public, anon;
revoke all on function public.cancelar_pedido(text), public.pedidos_abiertos(), public.ofertar(text, numeric), public.elegir_oferta(text, text), public.contadores_pedido(text) from public, anon;
grant execute on function public.crear_pedido(text, uuid, jsonb, text, text, timestamptz, int, text, double precision, double precision, text[], numeric, int) to authenticated;
grant execute on function public.cancelar_pedido(text), public.pedidos_abiertos(), public.ofertar(text, numeric), public.elegir_oferta(text, text), public.contadores_pedido(text) to authenticated;
grant execute on function privado.paseador_ocupado(uuid, timestamptz, int), privado.pedido_es_de_mi_zona(public.pedidos, uuid), privado.vencer_pedidos() to authenticated;

/* ---------------------------------------------------------------- el paseo nace «aceptado» al elegir una oferta */
create or replace function privado.paseo_cambia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_quien text[];
  v_es_equipo boolean := auth.uid() is null or privado.es_equipo();
  v_borrando boolean := coalesce(current_setting('patitas.borrando_cuenta', true), '') = 'on';
  -- Lo prende solo `elegir_oferta()`: la familia eligió una oferta del pedido y el paseo nace ya aceptado.
  v_elige boolean := coalesce(current_setting('patitas.pedido_elige', true), '') = 'on';
begin
  new.actualizado_en := now();
  if new.id is distinct from old.id
     or (new.familia_id is distinct from old.familia_id and not (v_borrando and new.familia_id is null))
     or (new.paseador_id is distinct from old.paseador_id and not (v_borrando and new.paseador_id is null))
     or new.monto is distinct from old.monto
     or new.comision is distinct from old.comision
     or new.neto is distinct from old.neto
     or new.pago_paseador is distinct from old.pago_paseador then
    raise exception 'No se pueden cambiar la familia, el paseador ni los montos de un paseo.' using errcode = '42501';
  end if;
  if not v_es_equipo and not v_borrando then
    if new.horario is distinct from old.horario
       or new.duracion_min is distinct from old.duracion_min
       or new.reserva is distinct from old.reserva
       or new.perro is distinct from old.perro
       or (new.perro_id is distinct from old.perro_id and new.perro_id is not null)
       or new.entrega is distinct from old.entrega
       or new.perros_en_grupo is distinct from old.perros_en_grupo
       or new.tamano_grupo is distinct from old.tamano_grupo
       or new.distrito is distinct from old.distrito
       or new.dueno_nombre is distinct from old.dueno_nombre
       or new.paseador_nombre is distinct from old.paseador_nombre then
      raise exception 'El horario, el perro y lo demás de un paseo ya pedido no se cambian.' using errcode = '42501';
    end if;
    if new.vigilancia is distinct from old.vigilancia or new.ubicacion is distinct from old.ubicacion then
      raise exception 'Los avisos de ubicación se quedan en cada teléfono: no se guardan en la base.' using errcode = '42501';
    end if;
    if new.reporte is distinct from old.reporte then
      if not (new.estado = 'en_disputa' and old.estado <> 'en_disputa') then
        raise exception 'El reporte se hace una sola vez, al reportar el problema.' using errcode = '42501';
      end if;
      -- Cada quien firma el suyo: la familia como «dueno» y el paseador como «paseador».
      if (new.reporte ->> 'quien') is distinct from (case when auth.uid() = old.familia_id then 'dueno' else 'paseador' end) then
        raise exception 'El reporte lo firma quien lo envía.' using errcode = '42501';
      end if;
    end if;
    if new.cerrado_paseador is distinct from old.cerrado_paseador and not (new.cerrado_paseador and auth.uid() = old.paseador_id) then
      raise exception 'Solo el paseador cierra el paseo de su lado.' using errcode = '42501';
    end if;
    new.creado_en := old.creado_en;
    new.aceptado_en := old.aceptado_en;
  end if;
  if new.estado is distinct from old.estado then
    select t.quien into v_quien from public.transiciones_paseo t where t.de = old.estado and t.a = new.estado limit 1;
    if v_quien is null then
      raise exception 'Ese cambio de estado del paseo no existe (% → %).', old.estado, new.estado using errcode = '22023';
    end if;
    if not v_es_equipo and not (v_elige and old.estado = 'solicitado' and new.estado = 'aceptado') then
      if not ((auth.uid() = old.familia_id and v_quien && array['dueno', 'sistema'])
           or (auth.uid() = old.paseador_id and v_quien && array['paseador', 'sistema'])) then
        raise exception 'A esta persona no le toca ese cambio de estado.' using errcode = '42501';
      end if;
      -- El paseo no se cierra solo: antes el dueño tiene que haber confirmado la entrega (lib/bus.ts `cerrarSiListo`).
      if old.estado = 'entregado' and new.estado = 'cerrado'
         and not exists (select 1 from public.paseo_eventos e where e.paseo_id = old.id and e.accion = 'confirmar_entrega') then
        raise exception 'Falta que el dueño confirme la entrega.' using errcode = '42501';
      end if;
    end if;
    if new.estado = 'aceptado' then
      new.aceptado_en := now();
    end if;
  end if;
  return new;
end $$;
