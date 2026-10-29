-- LÍMITES CONOCIDOS de las postulaciones (paso 7b): lo que la base NO comprueba hoy y solo cuida la app (o nadie).
-- Cada prueba demuestra que algo PASA (la base lo deja hacer) para que nadie crea que está protegido. Son hechos, no
-- aprobaciones: si el equipo decide cerrar uno, se escribe una migración nueva y se cambia o se borra la prueba.
begin;
select plan(5);

create function public.test_filas(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.test_filas(text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'paseador.q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';

/* 1. Enviar una postulación VACÍA: la base lo deja. Que esté completa (teléfono, términos, curso, examen…) lo cuida la app. */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.postulaciones (paseador_id, codigo, estado) values ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'enviada')$$, '1. un paseador envía una postulación vacía (la base no mira que esté completa)');

/* 2. El mismo DNI en dos cuentas: la base lo deja (no hay índice único). */
select lives_ok($$insert into public.datos_dni (paseador_id, dni) values ('bbbbbbbb-0000-0000-0000-000000000001', '12345678')$$, '2a. P guarda un DNI');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.postulaciones (paseador_id, codigo, estado) values ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'enviada')$$, '2b. Q se postula');
select lives_ok($$insert into public.datos_dni (paseador_id, dni) values ('bbbbbbbb-0000-0000-0000-000000000002', '12345678')$$, '2c. Q guarda el MISMO DNI que P (la base no lo impide: lo revisa el equipo en la videollamada)');

/* 3. La columna vieja `revision_notas` sí la puede leer el propio postulante: por eso las notas del equipo van en `notas_revision`. */
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
update public.postulaciones set revision_notas = 'nota escrita en la columna vieja' where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001';
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select revision_notas from public.postulaciones), 'nota escrita en la columna vieja', '3. lo que se escriba en la columna vieja `revision_notas` lo lee el postulante (la app ya no la usa)');
reset role;

select * from finish();
rollback;
