-- Pruebas de `guardar_dni` (paso 7b): el paseador guarda y CORRIGE su propio DNI sin poder volver a leerlo.
-- Se corren con `node supabase/tests/probar_en_pglite.cjs dni_servidor` (sin Docker, sin red) o con `supabase test db`.
begin;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'familia.a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'paseador.q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'enviada', 'Lucía', 'Quispe'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'enviada', 'Mateo', 'Rojas');

/* ---- guardar y corregir ---- */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.guardar_dni('12345678'), 'nuevo', 'paseador P: guarda su DNI la primera vez');
select is(public.guardar_dni('12345678'), 'igual', 'paseador P: mandar el mismo número otra vez no cambia nada (un reintento no hace daño)');
select is((select count(*)::int from public.datos_dni), 0, 'paseador P: NO puede leer su DNI de vuelta');

/* ---- el equipo lo marca como comprobado ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select dni from public.datos_dni), '12345678', 'equipo: lee el DNI completo');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen, marcado_por) values
  ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true, 'cccccccc-0000-0000-0000-000000000001');

/* ---- lo corrige ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.guardar_dni('12345678'), 'igual', 'con el mismo número, la casilla del equipo NO se toca');
select is(public.guardar_dni('87654321'), 'corregido', 'paseador P: corrige su DNI');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select dni from public.datos_dni), '87654321', 'equipo: lee el número nuevo');
select is((select dni from public.comprobaciones), false, 'al corregir, la casilla «DNI» vuelve a quedar SIN marcar');
select is((select (distrito and celular and consultas and examen) from public.comprobaciones), true, 'las otras cuatro casillas siguen como estaban');
select is((select marcado_por from public.comprobaciones), null, 'y ya no figura quién la marcó');
select is((select count(*)::int from public.paseadores_publicos), 0, 'sin la casilla del DNI no figura aprobado (la vista pide las cinco)');

/* ---- quién NO ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.guardar_dni('1234567')$$, '23514', null, 'un DNI de 7 números no se guarda');
select throws_ok($$select public.guardar_dni('1234567a')$$, '23514', null, 'un DNI con letras no se guarda');
select is(public.guardar_dni('55555555'), 'nuevo', 'paseador Q: guarda el suyo (la función solo toca el de quien llama)');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.guardar_dni('12345678')$$, '42501', null, 'familia A: no guarda DNI (solo un paseador)');
reset role;
set local role anon;
select throws_ok($$select public.guardar_dni('12345678')$$, '42501', null, 'sin sesión: no puede llamar a la función');
reset role;

select * from finish();
rollback;
