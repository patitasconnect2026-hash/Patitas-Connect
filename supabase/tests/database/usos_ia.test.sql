-- El registro de uso de la IA de apoyo (migración 20261016400000_usos_ia.sql): solo el equipo, y a su propio nombre.
begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000002', 'f@prueba.local', '{"rol":"familia","nombre_pila":"Otra"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id in ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002');

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.usos_ia (equipo_id, paseador_id) values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001')$$, '1. el equipo registra su uso');
select throws_ok($$insert into public.usos_ia (equipo_id, paseador_id) values ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001')$$, '42501', null, '2. pero no a nombre de otra persona del equipo');
select is((select count(*)::int from public.usos_ia), 1, '3. el equipo lee el registro');
select ok((select en from public.usos_ia) > now() - interval '1 minute', '4. con la hora (la pone la base)');
select throws_ok($$update public.usos_ia set paseador_id = null$$, '42501', null, '5. nadie edita el registro');
select throws_ok($$delete from public.usos_ia$$, '42501', null, '6. ni lo borra');
reset role;

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.usos_ia), 0, '7. el paseador no ve que se usó la IA sobre él');
select throws_ok($$insert into public.usos_ia (equipo_id) values ('bbbbbbbb-0000-0000-0000-000000000001')$$, '42501', null, '8. ni escribe en el registro');
reset role;

-- Si la persona borra su cuenta, el registro del uso queda sin sus datos
delete from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select is((select paseador_id from public.usos_ia), null, '9. al borrar su cuenta, el registro queda sin la persona');

select * from finish();
rollback;
