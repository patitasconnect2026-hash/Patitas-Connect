-- Patitas Conectadas · integridad (15 de octubre de 2026): cierra en la base lo que hasta hoy solo cuidaba la app.
-- NADA de esto está aplicado: la aplica una persona del equipo, DESPUÉS de las anteriores (ver docs/PUBLICAR.md).
-- NUNCA edita una migración aplicada: solo suma reglas nuevas.
--
-- Todo lo de abajo es algo que la app YA hace así (la app nunca manda lo que estas reglas rechazan); ahora además lo exige la
-- base. No decide nada del negocio: no toca precios, plazos, cupos, números de DNI ni textos.
--
--  1. Un paseo ya pedido no cambia (horario, duración, reserva, perro…): solo su estado, su reporte (una vez, al reportar) y
--     que el paseador lo cierre de su lado. La memoria del motor de avisos (`vigilancia`) y el permiso de ubicación no suben.
--  2. El perro de un paseo es de la familia que lo pide.
--  3. Con un pago pendiente no se pide otro paseo (la regla de lib/pagos.ts `pagoPendiente`).
--  4. El pago guarda qué persona del equipo lo marcó (`marcado_por`).
--  5. Puntos de control: un inicio y un fin por paseo, coordenadas posibles y siempre ubicación o motivo.
--  6. Casos: lo que se anota al abrirlos no se cambia, el reporte se hace una vez y el id es «<tipo>-<paseo>».
--  7. Postulaciones: nadie se pone solo los paseos acompañados ni escribe las notas del equipo al crear su fila.
--  8. Fotos: peso máximo de 1 MB y coordenadas posibles.
--  9. Chat: un mensaje no pasa de 1.000 letras (la app corta en 500).
--
-- Las reglas nuevas de tipo CHECK se crean «not valid»: valen para lo que se escriba desde ahora y NO revisan lo que ya hay
-- guardado (así esta migración no puede fallar por datos viejos). La excepción es el índice único de los puntos de control.
-- Las reglas que miran «quién es» dejan pasar al equipo y a la base (SQL Editor, clave de servicio), y a `borrar_mi_cuenta()`
-- mientras trabaja (el aviso `patitas.borrando_cuenta` lo prende solo esa función).

/* ---------------------------------------------------------------- 1) un paseo ya pedido no cambia */
-- Igual que antes (solo cambios de estado que existen y que le tocan a esa persona; nadie cambia la familia, el paseador ni los
-- montos; `borrar_mi_cuenta()` puede dejar en blanco a la persona que se va) y, además, para quien NO es del equipo:
--   · no cambia el horario, la duración, la reserva, el resumen del perro, la entrega, el grupo ni el distrito; el perro solo
--     puede quedar en blanco (cuando la familia borra la ficha de ese perro);
--   · no guarda `vigilancia` ni `ubicacion` (viven en el teléfono);
--   · el reporte solo se escribe junto con el paso a «en disputa» y lo firma quien lo envía (nadie reescribe el de la otra
--     persona ni reporta a su nombre);
--   · `cerrado_paseador` solo lo pone el paseador de ese paseo, y no se deshace;
--   · la hora de creación y la de aceptación las pone la base.
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

/* ---------------------------------------------------------------- 2) el perro del paseo es de la familia que lo pide */
-- Igual que antes (solo una familia crea un paseo, con un paseador aprobado) y, además, `perro_id` es una ficha de esa familia
-- (o ninguna). Sin esto, quien conociera el identificador de otro perro haría que el paseador viera su ficha al aceptar.
drop policy paseos_crear on public.paseos;
create policy paseos_crear on public.paseos for insert to authenticated
  with check (
    familia_id = (select auth.uid())
    and privado.es_familia()
    and estado = 'solicitado'
    and exists (select 1 from public.paseadores_publicos v where v.paseador_id = paseos.paseador_id)
    and (perro_id is null or exists (select 1 from public.perros d where d.id = paseos.perro_id and d.familia_id = (select auth.uid())))
  );

/* ---------------------------------------------------------------- 3) con un pago pendiente no se pide otro paseo */
-- La misma regla de la app (lib/pagos.ts `debeLaFamilia`): la familia debe un paseo que ya se hizo («entregado» o «cerrado»)
-- mientras no le mostró el pago al paseador (`sin_pagar`) o el equipo no lo encontró (`no_encontrado`). Solo mira a la familia
-- que pide (a las demás las rechazan las reglas de fila, sin contarles nada). El equipo y la base pasan. Un reintento del MISMO
-- paseo (mismo id, porque la primera respuesta se perdió) recibe el choque de siempre, no este aviso.
create function privado.paseo_nuevo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or privado.es_equipo() or new.familia_id is distinct from auth.uid()
     or exists (select 1 from public.paseos p where p.id = new.id) then
    return new;
  end if;
  if exists (
    select 1 from public.pagos g
    where g.familia_id = new.familia_id
      and g.estado in ('sin_pagar', 'no_encontrado')
      and g.paseo_estado in ('entregado', 'cerrado')
  ) then
    raise exception 'Tienes un pago pendiente: hasta pagarlo no se puede pedir otro paseo.' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger paseo_nuevo before insert on public.paseos for each row execute function privado.paseo_nuevo();

/* ---------------------------------------------------------------- 4) qué persona del equipo marcó cada pago */
-- La columna se llena sola en `mover_pago` cuando la acción es del equipo («No lo encuentro», «Pagado al paseador»). Nadie la
-- escribe a mano (los pagos solo cambian por `mover_pago`). Si la persona del equipo borra su cuenta, queda en blanco.
alter table public.pagos add column marcado_por uuid references public.perfiles (id) on delete set null;

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
         pagado_paseador_en = case when p_accion = 'pagar_al_paseador' then now() else pagado_paseador_en end,
         marcado_por = case when v_t.quien = 'equipo' then v_uid else marcado_por end
   where paseo_id = p_paseo
   returning * into v_pago;
  return v_pago;
end $$;
revoke all on function public.mover_pago(text, text, text, text) from public, anon;
grant execute on function public.mover_pago(text, text, text, text) to authenticated;

/* ---------------------------------------------------------------- 5) puntos de control */
-- Un paseo tiene a lo sumo UN inicio y UN fin (la app arma el id de cada punto con el paseo y el tipo, así que nunca los
-- repite). Si a mano hubiera quedado alguno repetido, se queda el primero: son señales, no registros.
delete from public.puntos_control a using public.puntos_control b
 where a.paseo_id = b.paseo_id and a.tipo = b.tipo and (a.en, a.id) > (b.en, b.id);
create unique index puntos_control_uno_por_tipo_idx on public.puntos_control (paseo_id, tipo);
alter table public.puntos_control
  add constraint puntos_control_lugar_posible check (lat between -90 and 90 and lng between -180 and 180) not valid,
  add constraint puntos_control_lugar_o_motivo check ((lat is not null and lng is not null) or sin_ubicacion is not null) not valid;

/* ---------------------------------------------------------------- 6) casos */
-- Igual que antes (la familia o el paseador solo pueden sumar su reporte; resolver es del equipo) y, además: lo que se anota al
-- abrir el caso (registro, perro, nombres, estado del paseo, estado y monto del pago) no se cambia, y el reporte se escribe una vez.
create or replace function privado.limitar_caso() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_borrando boolean := coalesce(current_setting('patitas.borrando_cuenta', true), '') = 'on';
begin
  if auth.uid() is null or privado.es_equipo() or v_borrando then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.paseo_id is distinct from old.paseo_id
     or new.tipo is distinct from old.tipo
     or new.resolucion is distinct from old.resolucion
     or new.resuelto_en is distinct from old.resuelto_en
     or new.abierto_en is distinct from old.abierto_en then
    raise exception 'Resolver un caso lo hace el equipo.' using errcode = '42501';
  end if;
  if new.registro is distinct from old.registro
     or new.perro is distinct from old.perro
     or new.paseador is distinct from old.paseador
     or new.dueno is distinct from old.dueno
     or new.estado_paseo is distinct from old.estado_paseo
     or new.pago_estado is distinct from old.pago_estado
     or new.monto is distinct from old.monto then
    raise exception 'Lo que se anota al abrir un caso no se cambia.' using errcode = '42501';
  end if;
  if new.reporte is distinct from old.reporte and old.reporte is not null then
    raise exception 'El reporte de un caso se hace una sola vez.' using errcode = '42501';
  end if;
  return new;
end $$;
-- Un caso por tipo y paseo (el id siempre fue «<tipo>-<paseo>») y un estado de pago que la app conoce.
alter table public.casos
  add constraint casos_id_es_tipo_y_paseo check (id = tipo::text || '-' || paseo_id) not valid,
  add constraint casos_pago_estado_conocido check (pago_estado is null or pago_estado in ('sin_registro', 'sin_pagar', 'visto', 'no_encontrado', 'pagado_paseador')) not valid;

/* ---------------------------------------------------------------- 7) postulaciones */
-- Igual que antes (el paseador crea la suya, en «borrador» o «enviada») y, además, nace con 0 paseos acompañados y sin notas
-- del equipo. Esos dos datos los decide el equipo (al actualizar ya lo impedía `limitar_postulacion`; al crear no).
drop policy postulaciones_crear on public.postulaciones;
create policy postulaciones_crear on public.postulaciones for insert to authenticated
  with check (
    paseador_id = (select auth.uid())
    and privado.es_paseador()
    and estado in ('borrador', 'enviada')
    and paseos_acompanados = 0
    and revision_notas = ''
  );

/* ---------------------------------------------------------------- 8) fotos */
-- El peso anotado no pasa del tope del almacén (1 MB) y el lugar es una coordenada posible. (La hora y que el lugar sea Lima los
-- sigue poniendo el teléfono: son señales, no pruebas.)
alter table public.fotos
  add constraint fotos_peso_posible check (bytes is null or bytes between 1 and 1048576) not valid,
  add constraint fotos_lugar_posible check (lat between -90 and 90 and lng between -180 and 180) not valid;

/* ---------------------------------------------------------------- 9) chat */
alter table public.mensajes
  add constraint mensajes_texto_corto check (texto is null or char_length(texto) <= 1000) not valid;
