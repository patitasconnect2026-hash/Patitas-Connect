-- Permisos de `service_role` y de `anon` en las tablas nuevas (migración 20261022100000_permisos_service_role.sql).
-- Mira los PERMISOS de cada tabla y función (has_table_privilege / has_function_privilege), no las filas: esta base temporal no
-- imita cómo Supabase deja que `service_role` se salte las reglas de fila.
begin;
select plan(7);

create temp table nuevas as
  select unnest(array['pedidos', 'ofertas', 'pedidos_vistos', 'respuestas_escritas', 'fotos_sospechas', 'ubicacion_en_vivo', 'usos_ia']) as tabla;

select is((select count(*)::int from nuevas), 7, '1. son las 7 tablas nuevas de las migraciones del 16 de octubre');
select is(
  (select count(*)::int from nuevas n join information_schema.tables t on t.table_schema = 'public' and t.table_name = n.tabla),
  7, '2. y las 7 existen');

select is(
  (select count(*)::int from nuevas n cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) p
    where not has_table_privilege('service_role', 'public.' || n.tabla, p)),
  0, '3. service_role puede leer, crear, cambiar y borrar en las 7');

select is(
  (select count(*)::int from nuevas n cross join unnest(array['TRUNCATE', 'REFERENCES', 'TRIGGER']) p
    where has_table_privilege('service_role', 'public.' || n.tabla, p)),
  0, '4. y nada más (sin truncate, references ni trigger)');

select is(
  (select count(*)::int from nuevas n cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p
    where has_table_privilege('anon', 'public.' || n.tabla, p)),
  0, '5. anon no tiene ningún permiso en ninguna de las 7');

select is(
  (select count(*)::int
     from unnest(array['public.ofertar(text, numeric)', 'public.publicar_ubicacion(text, double precision, double precision, double precision)', 'public.guardar_respuestas_examen(jsonb)', 'public.pedidos_abiertos()']) f
    where has_function_privilege('service_role', f, 'EXECUTE') or has_function_privilege('anon', f, 'EXECUTE')),
  0, '6. ninguna función pública nueva se le da a service_role ni a anon (dependen de la sesión de una persona)');

-- authenticated sigue como lo dejó cada migración: la app no escribe directo en estas tablas (lo hacen las funciones).
select is(
  (select count(*)::int from nuevas n cross join unnest(array['INSERT', 'UPDATE', 'DELETE']) p
    where n.tabla <> 'usos_ia' and has_table_privilege('authenticated', 'public.' || n.tabla, p)),
  0, '7. authenticated no escribe directo en ninguna (salvo usos_ia, que es del equipo): esta migración no lo cambió');

select * from finish();
rollback;
