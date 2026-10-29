-- Patitas Conectadas · paso 7b del plan del servidor (el paseador corrige su DNI).
-- NUNCA edita una migración aplicada: solo suma una función nueva. La aplica una persona del equipo.

/* ---------------------------------------------------------------- guardar o corregir el propio DNI */
-- Hasta ahora el paseador solo podía INSERTAR su DNI: la base no le deja volver a leerlo (a propósito: solo lo lee el equipo)
-- y, para actualizar una fila, Postgres también exige poder verla; su «update» afectaba 0 filas sin avisar. Un DNI mal escrito
-- lo corregía el equipo a mano en el editor de SQL.
-- Esta función es la única puerta: guarda el DNI de QUIEN LLAMA (no recibe a nombre de quién), y la persona sigue sin poder leerlo.
--   · 'nuevo'      → no había DNI: se guardó.
--   · 'igual'      → ya estaba ese mismo número: no se toca nada (un reintento no hace daño).
--   · 'corregido'  → había otro número: se cambió, y la casilla «DNI» del equipo vuelve a quedar SIN marcar (el equipo había
--                    comprobado OTRO número y tiene que revisar el nuevo). Mientras tanto no figura aprobado: la vista pública
--                    pide las cinco casillas.
create function public.guardar_dni(p_dni text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_actual text;
begin
  if v_uid is null or not privado.es_paseador() then
    raise exception 'Solo un paseador guarda su DNI.' using errcode = '42501';
  end if;
  if p_dni is null or p_dni !~ '^[0-9]{8}$' then
    raise exception 'El DNI tiene 8 números.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.postulaciones where paseador_id = v_uid) then
    raise exception 'Primero envía tu postulación.' using errcode = '23503';
  end if;
  select d.dni into v_actual from public.datos_dni d where d.paseador_id = v_uid;
  if v_actual is null then
    insert into public.datos_dni (paseador_id, dni) values (v_uid, p_dni);
    return 'nuevo';
  end if;
  if v_actual = p_dni then
    return 'igual';
  end if;
  update public.datos_dni set dni = p_dni where paseador_id = v_uid;
  update public.comprobaciones set dni = false, marcado_por = null, actualizado_en = now() where paseador_id = v_uid and dni;
  return 'corregido';
end $$;
revoke all on function public.guardar_dni(text) from public, anon;
grant execute on function public.guardar_dni(text) to authenticated;
