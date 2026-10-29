-- Patitas Conectadas · paso 8 del plan del servidor (fotos en el almacén privado). Dos arreglos chicos a lo ya aplicado.
-- NUNCA edita una migración aplicada: solo suma reglas nuevas.

/* ---------------------------------------------------------------- 1) cambiar la foto de hoy el mismo día */
-- La foto de hoy vive en `hoy/<paseador_id>/<archivo>.jpg` (ver 20261014120200_fotos_almacen.sql). Si el paseador toma otra el
-- mismo día, la app sube la nueva, borra la anterior del almacén y cambia la fila de `fotos`. Sin esta regla la imagen anterior
-- quedaría en el almacén SIN ninguna fila que la venza (el borrado a los 7 días recorre las filas de `fotos`): una foto guardada
-- para siempre. Esta regla solo deja borrar la carpeta propia `hoy/<su id>/`; las fotos de los paseos y las del chat no las borra
-- nadie desde la app.
-- OJO con el orden: Storage solo deja borrar lo que la persona también puede VER, y una imagen se ve gracias a su fila de `fotos`.
-- Por eso la app borra primero la imagen y después la fila (al revés, la imagen quedaría huérfana).
create policy fotos_almacen_borrar_hoy on storage.objects for delete to authenticated
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = 'hoy'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and privado.es_paseador()
  );

/* ---------------------------------------------------------------- 2) la ruta de la imagen tiene que ser la de su paseo */
-- Una imagen del almacén se ve cuando existe una fila visible de `fotos` con su ruta. Sin esta comprobación, un paseador podía
-- guardar una fila de SU paseo con la ruta de la imagen de OTRO paseo y así verla (las rutas llevan un identificador que no se
-- adivina, pero la regla no debe depender de eso). Ahora la ruta de una foto de un paseo tiene que empezar por
-- `paseo/<ese paseo>/` y la de una foto de hoy por `hoy/<ese paseador>/`, que son las únicas carpetas donde puede subir.
alter table public.fotos add constraint fotos_ruta_coincide check (
  (tipo = 'paseo' and starts_with(ruta, 'paseo/' || paseo_id || '/'))
  or (tipo = 'hoy' and starts_with(ruta, 'hoy/' || paseador_id::text || '/'))
);
