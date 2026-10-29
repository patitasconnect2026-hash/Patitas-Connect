-- Patitas Conectadas · borrar mi cuenta (15 de octubre de 2026).
-- NADA de esto está aplicado: las migraciones las aplica la usuaria a mano, en orden (ver supabase/LEEME.md).
--
-- `public.borrar_mi_cuenta()` la llama la propia persona con su sesión (nunca la clave de servicio). Devuelve
-- `{"borrada": true}` si la borró y `{"borrada": false, "motivo": ...}` si se negó (no es un error: es algo que la persona
-- tiene que saber). Solo da error si no hay sesión o la cuenta ya no existe.
--
-- SE NIEGA, y no borra nada, si la persona tiene:
--   · un paseo en marcha (pedido, aceptado, en camino, paseando o entregado sin cerrar) → motivo «paseo_pendiente»,
--   · un reporte o un caso abierto (un paseo en disputa también cuenta) → «reporte_abierto»,
--   · un pago pendiente de un paseo terminado: para la familia, que todavía no mostró el pago (o que el equipo no encontró); para
--     el paseador, que el equipo todavía no le pagó (nadie se va debiendo ni sin cobrar) → «pago_pendiente».
-- La cuenta del equipo no se borra desde la app → «equipo».
--
-- SI NO HAY NADA PENDIENTE, BORRA lo personal: el perfil, la casa, los perros, la postulación (con su DNI y sus casillas), dónde
-- cobra, las fotos, el chat, la bitácora, las ubicaciones, los códigos y el correo de acceso.
--
-- LO QUE QUEDA es el registro del equipo, SIN el nombre de la persona: los paseos ya terminados, su pago (para poder cuadrar
-- cuentas) y los reportes ya resueltos. Cuánto tiempo se guarda ese registro lo decide el equipo con un abogado: está
-- anotado en docs/AVANCE.md.
--
-- Los archivos de las fotos NO se borran por SQL (Supabase pide hacerlo por su API): sus rutas quedan en `archivos_por_borrar` y
-- `supabase/scripts/borrar_fotos_vencidas.mjs` los borra con la clave de servicio.

/* ---------------------------------------------------------------- 1) paseos y pagos que sobreviven a una cuenta */
-- Un paseo terminado y su pago se guardan aunque una de las dos personas borre su cuenta: ya no apuntan a nadie.
alter table public.paseos
  alter column familia_id drop not null,
  alter column paseador_id drop not null,
  drop constraint paseos_familia_id_fkey,
  drop constraint paseos_paseador_id_fkey,
  add constraint paseos_familia_id_fkey foreign key (familia_id) references public.perfiles (id) on delete set null,
  add constraint paseos_paseador_id_fkey foreign key (paseador_id) references public.perfiles (id) on delete set null;

alter table public.pagos
  alter column familia_id drop not null,
  alter column paseador_id drop not null,
  drop constraint pagos_familia_id_fkey,
  drop constraint pagos_paseador_id_fkey,
  add constraint pagos_familia_id_fkey foreign key (familia_id) references public.perfiles (id) on delete set null,
  add constraint pagos_paseador_id_fkey foreign key (paseador_id) references public.perfiles (id) on delete set null;

/* ---------------------------------------------------------------- 2) el paseo deja pasar «en blanco» solo al borrar una cuenta */
-- Igual que antes (solo cambios de estado que existen y que le tocan a esa persona; nadie cambia la familia, el paseador ni los
-- montos), con UNA excepción: mientras `borrar_mi_cuenta()` trabaja, la base puede dejar en blanco a la persona que se va (nunca
-- poner a otra). Ese aviso lo prende la propia función, dentro de su transacción: la app no tiene cómo prenderlo.
create or replace function privado.paseo_cambia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_quien text[];
  v_es_equipo boolean := auth.uid() is null or privado.es_equipo();
  v_borrando boolean := coalesce(current_setting('patitas.borrando_cuenta', true), '') = 'on';
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
  if new.estado is distinct from old.estado then
    select t.quien into v_quien from public.transiciones_paseo t where t.de = old.estado and t.a = new.estado limit 1;
    if v_quien is null then
      raise exception 'Ese cambio de estado del paseo no existe (% → %).', old.estado, new.estado using errcode = '22023';
    end if;
    if not v_es_equipo then
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

/* ---------------------------------------------------------------- 3) mover_pago: un paseador en blanco no es «cualquiera» */
-- Antes: `v_uid <> v_pago.paseador_id`. Con el paseador en blanco esa comparación no da «sí» ni «no» y la regla se saltaba.
-- Ahora un pago sin paseador no lo mueve nadie como paseador. El resto es igual.
create or replace function public.mover_pago(p_paseo text, p_accion text, p_nota text default null, p_hora text default null)
returns public.pagos
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_t public.transiciones_pago;
  v_pago public.pagos;
  v_nota text := btrim(coalesce(p_nota, ''));
begin
  if v_uid is null then
    raise exception 'Sin sesión.' using errcode = '42501';
  end if;
  select * into v_t from public.transiciones_pago where accion = p_accion;
  if not found then
    raise exception 'Acción desconocida: %.', p_accion using errcode = '22023';
  end if;
  select * into v_pago from public.pagos where paseo_id = p_paseo for update;
  if not found then
    raise exception 'No existe ese pago.' using errcode = 'P0002';
  end if;
  if v_t.quien = 'equipo' and not privado.es_equipo() then
    raise exception 'Solo el equipo puede hacer esto.' using errcode = '42501';
  end if;
  if v_t.quien = 'paseador' and v_uid is distinct from v_pago.paseador_id then
    raise exception 'Solo el paseador de este paseo puede hacer esto.' using errcode = '42501';
  end if;
  if not (v_pago.estado = any (v_t.de)) then
    raise exception 'No se puede «%» con el pago «%».', p_accion, v_pago.estado using errcode = '22023';
  end if;
  if v_t.paseo is not null and not (v_pago.paseo_estado = any (v_t.paseo)) then
    raise exception 'No se puede «%» con el paseo «%».', p_accion, v_pago.paseo_estado using errcode = '22023';
  end if;
  if v_t.pide_nota and char_length(v_nota) < 3 then
    raise exception 'La nota es obligatoria.' using errcode = '22023';
  end if;
  update public.pagos
     set estado = v_t.a,
         visto_en = case when p_accion = 'ver_pago' then now() else visto_en end,
         hora_pago = case when p_accion = 'ver_pago' then nullif(left(btrim(coalesce(p_hora, '')), 20), '') else hora_pago end,
         nota = case when p_accion = 'ver_pago' then null when p_accion = 'no_encontrado' then v_nota else nota end,
         no_encontrado_en = case when p_accion = 'no_encontrado' then now() when p_accion = 'ver_pago' then null else no_encontrado_en end,
         pagado_paseador_en = case when p_accion = 'pagar_al_paseador' then now() else pagado_paseador_en end
   where paseo_id = p_paseo
   returning * into v_pago;
  return v_pago;
end $$;
revoke all on function public.mover_pago(text, text, text, text) from public, anon;
grant execute on function public.mover_pago(text, text, text, text) to authenticated;

/* ---------------------------------------------------------------- 4) los archivos que quedan por borrar */
-- Las rutas de las imágenes de una cuenta borrada. Nadie las lee desde la app: solo el script con la clave de servicio, que
-- primero borra el archivo por la API del almacén y después la fila.
create table public.archivos_por_borrar (
  ruta text primary key,
  motivo text not null default 'cuenta borrada',
  anotado_en timestamptz not null default now()
);
alter table public.archivos_por_borrar enable row level security;
revoke all on public.archivos_por_borrar from public, anon, authenticated;
grant select, delete on public.archivos_por_borrar to service_role;
-- La regla explícita es «nadie desde la app» (ni siquiera el equipo): el script usa la clave de servicio, que no pasa por las reglas.
create policy archivos_por_borrar_nadie on public.archivos_por_borrar for all to authenticated using (false) with check (false);

/* ---------------------------------------------------------------- 5) borrar mi cuenta */
create function public.borrar_mi_cuenta()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_rol public.rol_usuario;
  v_todos text[];
  v_quedan text[];
begin
  if v_uid is null then
    raise exception 'Entra a tu cuenta para borrarla.' using errcode = '42501';
  end if;
  select p.rol into v_rol from public.perfiles p where p.id = v_uid;
  if v_rol is null then
    raise exception 'No encontramos tu cuenta.' using errcode = 'P0002';
  end if;
  if v_rol = 'equipo' then
    return jsonb_build_object('borrada', false, 'motivo', 'equipo');
  end if;

  /* ---- lo que lo impide: no se borra nada */
  if exists (
    select 1 from public.paseos s
    where v_uid in (s.familia_id, s.paseador_id) and s.estado in ('solicitado', 'aceptado', 'en_camino', 'en_paseo', 'entregado')
  ) then
    return jsonb_build_object('borrada', false, 'motivo', 'paseo_pendiente');
  end if;
  if exists (select 1 from public.paseos s where v_uid in (s.familia_id, s.paseador_id) and s.estado = 'en_disputa')
     or exists (
       select 1 from public.casos c join public.paseos s on s.id = c.paseo_id
       where v_uid in (s.familia_id, s.paseador_id) and c.resuelto_en is null
     ) then
    return jsonb_build_object('borrada', false, 'motivo', 'reporte_abierto');
  end if;
  -- La familia debe mientras no mostró el pago (o el equipo no lo encontró). El paseador espera hasta que el equipo le pague.
  if exists (
    select 1 from public.pagos g
    where g.paseo_estado in ('entregado', 'cerrado')
      and ((g.familia_id = v_uid and g.estado in ('sin_pagar', 'no_encontrado'))
        or (g.paseador_id = v_uid and g.estado <> 'pagado_paseador'))
  ) then
    return jsonb_build_object('borrada', false, 'motivo', 'pago_pendiente');
  end if;

  -- Desde aquí la base puede dejar en blanco a esta persona en sus paseos y pagos (ver `privado.paseo_cambia`).
  perform set_config('patitas.borrando_cuenta', 'on', true);

  select coalesce(array_agg(s.id), '{}') into v_todos from public.paseos s where v_uid in (s.familia_id, s.paseador_id);

  /* ---- los archivos: sus rutas se anotan y las filas se borran */
  insert into public.archivos_por_borrar (ruta)
  select f.ruta from public.fotos f where f.paseador_id = v_uid or f.paseo_id = any (v_todos)
  union
  select m.imagen_ruta from public.mensajes m where m.paseo_id = any (v_todos) and m.imagen_ruta is not null
  union
  select r.foto_ruta from public.perros r where r.familia_id = v_uid and r.foto_ruta is not null
  union
  select q.foto_ruta from public.postulaciones q where q.paseador_id = v_uid and q.foto_ruta is not null
  on conflict (ruta) do nothing;
  delete from public.fotos f where f.paseador_id = v_uid or f.paseo_id = any (v_todos);

  /* ---- los paseos que nunca se hicieron (rechazados, vencidos o cancelados) y no tienen ningún caso no dejan nada que guardar */
  delete from public.paseos s
  where s.id = any (v_todos)
    and s.estado in ('rechazado', 'expirado', 'cancelado')
    and not exists (select 1 from public.casos c where c.paseo_id = s.id);

  /* ---- los que se quedan: sin chat, sin bitácora, sin ubicaciones, sin código, y sin el nombre de esta persona */
  select coalesce(array_agg(s.id), '{}') into v_quedan from public.paseos s where s.id = any (v_todos);
  delete from public.mensajes where paseo_id = any (v_quedan);
  delete from public.bitacora where paseo_id = any (v_quedan);
  delete from public.puntos_control where paseo_id = any (v_quedan);
  delete from public.codigos_recojo where paseo_id = any (v_quedan);

  update public.paseos s
     set dueno_nombre = case when s.familia_id = v_uid then 'Cuenta borrada' else s.dueno_nombre end,
         paseador_nombre = case when s.paseador_id = v_uid then 'Cuenta borrada' else s.paseador_nombre end,
         -- la reserva guarda cómo se veía el paseador al reservar (su nombre y su foto)
         reserva = case when s.reserva is not null and s.paseador_id = v_uid then s.reserva - 'walker' else s.reserva end,
         -- el reporte lo escribió una de las dos personas: si fue esta, se va su foto (el texto queda para el equipo)
         reporte = case
           when s.reporte is not null and (s.reporte ->> 'quien') = (case when s.familia_id = v_uid then 'dueno' else 'paseador' end) then s.reporte - 'foto'
           else s.reporte
         end
   where s.id = any (v_quedan);

  update public.casos c
     set dueno = case when s.familia_id = v_uid then 'Cuenta borrada' else c.dueno end,
         paseador = case when s.paseador_id = v_uid then 'Cuenta borrada' else c.paseador end,
         reporte = case
           when c.reporte is not null and (c.reporte ->> 'quien') = (case when s.familia_id = v_uid then 'dueno' else 'paseador' end) then c.reporte - 'foto'
           else c.reporte
         end
    from public.paseos s
   where c.paseo_id = s.id and s.id = any (v_quedan);

  /* ---- la cuenta: de aquí salen, en cadena, el perfil, la casa, los perros, la postulación, el DNI, dónde cobra y los paseos y pagos quedan en blanco */
  delete from auth.users where id = v_uid;

  perform set_config('patitas.borrando_cuenta', '', true);
  return jsonb_build_object('borrada', true);
end $$;
revoke all on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;
