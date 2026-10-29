-- Patitas Conectadas · almacén privado de fotos y su borrado a los 7 días. Paso 3 del plan del servidor.
-- NADA de esto está aplicado: todavía no hay proyecto.
--
-- Rutas dentro del almacén `fotos` (la app las arma así):
--   paseo/<paseo_id>/<foto_id>.jpg      foto de un paseo
--   hoy/<paseador_id>/<día>.jpg         foto de hoy del paseador
--   chat/<paseo_id>/<mensaje_id>.jpg    imagen del chat
-- El almacén es PRIVADO: nadie tiene una dirección pública; la app pide enlaces que vencen (por ejemplo, 1 hora).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Ver: el equipo, quien tiene una fila visible en `fotos` con esa ruta, y los dos del paseo en las imágenes del chat.
create policy fotos_almacen_ver on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos'
    and (
      privado.es_equipo()
      or exists (select 1 from public.fotos f where f.ruta = storage.objects.name)
      or ((storage.foldername(name))[1] = 'chat' and privado.participa((storage.foldername(name))[2]))
    )
  );

-- Subir: el paseador a su carpeta de paseo o de hoy; cualquiera de los dos del paseo, al chat.
create policy fotos_almacen_subir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and (
      ((storage.foldername(name))[1] = 'paseo' and privado.es_paseador() and privado.es_paseador_de((storage.foldername(name))[2]))
      or ((storage.foldername(name))[1] = 'hoy' and privado.es_paseador() and (storage.foldername(name))[2] = (select auth.uid())::text)
      or ((storage.foldername(name))[1] = 'chat' and privado.participa((storage.foldername(name))[2]))
    )
  );

-- Borrar y reemplazar: nadie desde la app. El borrado a los 7 días lo hace la función de abajo + el script con la clave de servicio.

/* ---------------------------------------------------------------- borrado a los 7 días */
-- Las fotos vencidas, SALVO las de un paseo con un caso abierto o en disputa (se conservan hasta que se cierre el caso).
-- Supabase pide borrar los archivos por su API (no por SQL: quedarían huérfanos), así que el borrado automático NO es solo
-- SQL. Hace falta un script (supabase/scripts/borrar_fotos_vencidas.mjs) que corre con la clave de servicio, a mano
-- o desde un programador. Ver supabase/LEEME.md.
create function public.fotos_para_borrar()
returns table (id uuid, ruta text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.ruta
  from public.fotos f
  where f.vence_en < now()
    and not exists (select 1 from public.casos c where c.paseo_id = f.paseo_id and c.resuelto_en is null)
    and not exists (select 1 from public.paseos s where s.id = f.paseo_id and s.estado = 'en_disputa')
$$;
revoke all on function public.fotos_para_borrar() from public, anon, authenticated;
grant execute on function public.fotos_para_borrar() to service_role;
