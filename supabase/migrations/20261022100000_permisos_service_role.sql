-- Patitas Conectadas · permisos explícitos para `service_role` en las tablas nuevas (22 de octubre de 2026).
-- NADA de esto está aplicado: la aplica una persona del equipo (después de `20261016400000_usos_ia`).
-- NUNCA edita una migración aplicada: solo suma permisos.
--
-- Por qué: Supabase ya no da permisos por sí solo a las tablas nuevas del esquema `public`, y `service_role` (la clave de servicio,
-- que se usa solo en la terminal y en scripts del equipo) solo se salta las REGLAS DE FILA, no los permisos de la tabla. Sin un
-- `grant` explícito, un script con la clave de servicio no podría leer ni limpiar estas tablas.
--
-- Qué hace:
--   1. Da `select, insert, update, delete` a `service_role` en las 7 tablas que crearon las migraciones del 16 de octubre.
--      Nada más (ni `truncate`, ni `references`, ni `trigger`).
--   2. Quita todo permiso a `anon` en las 4 tablas que no lo tenían quitado (las otras 3 ya lo traían de su migración).
--      Con eso, quien entra sin cuenta no tiene ningún permiso sobre ninguna de las 7, aunque Supabase diera permisos por defecto.
--
-- Qué NO hace: no da permiso de `execute` a `service_role` en ninguna función. Las funciones públicas nuevas (`crear_pedido`,
-- `cancelar_pedido`, `pedidos_abiertos`, `ofertar`, `elegir_oferta`, `contadores_pedido`, `guardar_respuestas_examen` y
-- `publicar_ubicacion`) dependen de `auth.uid()`: con la clave de servicio no hay sesión y rechazan la llamada, así que no hace falta.
-- Tampoco toca a `authenticated`: sus permisos siguen como los dejó cada migración.

/* ---------------------------------------------------------------- anon: ningún permiso (las 4 que faltaban) */
revoke all on public.respuestas_escritas, public.fotos_sospechas, public.ubicacion_en_vivo, public.usos_ia from anon;

/* ---------------------------------------------------------------- service_role: lo mínimo para leer y limpiar */
grant select, insert, update, delete on
  public.pedidos,
  public.ofertas,
  public.pedidos_vistos,
  public.respuestas_escritas,
  public.fotos_sospechas,
  public.ubicacion_en_vivo,
  public.usos_ia
to service_role;
