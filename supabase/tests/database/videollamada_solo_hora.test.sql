-- La videollamada es solo entre el paseador y el equipo (decisión del 15 de octubre de 2026): la tabla de postulaciones ya no
-- tiene dónde guardar referencias ni invitados, y lo único de la videollamada que se guarda es la hora que eligió el paseador.
-- Se corren con `node supabase/tests/probar_en_pglite.cjs videollamada` (sin Docker, sin red) o con `supabase test db`.
begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated');

select is((select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'postulaciones' and column_name = 'referencias'), 0, 'postulaciones ya no tiene la columna «referencias»');
select is((select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'postulaciones' and column_name = 'cita_videollamada'), 1, 'la hora de la videollamada sigue guardándose');
select is((select count(*)::int from information_schema.columns where table_schema = 'public' and (column_name ~* 'invitad|acompanante|referenc' or table_name ~* 'invitad|acompanante|referenc')), 0, 'ninguna tabla ni columna guarda invitados, acompañantes ni referencias');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.postulaciones (paseador_id, codigo, estado, nombre, cita_videollamada) values ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'enviada', 'Lucía', 'Lun 7:00 pm')$$, 'el paseador guarda su postulación solo con la hora');
select throws_ok($$update public.postulaciones set referencias = '[]' where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$, '42703', null, 'ya no se puede escribir «referencias»');
reset role;

select * from finish();
rollback;
