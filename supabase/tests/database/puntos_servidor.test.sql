-- Pruebas de los puntos de control en el servidor (paso 9 del plan): el INICIO y el FIN del paseo con su ubicación.
-- (Las fotos, que son los demás puntos de control, se prueban en fotos_servidor.test.sql.) Se corren con
-- `node supabase/tests/probar_en_pglite.cjs puntos` (sin Docker, sin red) o con `supabase test db`.
-- Cada bloque entra como una persona distinta, igual que la app. NO es seguimiento continuo: la tabla solo guarda esos dos
-- puntos por paseo; la memoria del motor de avisos (`paseos.vigilancia`) no la escribe la app.
begin;
select plan(31);

create function public.test_filas(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.test_filas(text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'familia.a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'familia.b@prueba.local', '{"rol":"familia","nombre_pila":"Rosa"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'paseador.q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, perfil) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe', '{"rate": 22}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'activo', 'Mateo', 'Rojas', '{"rate": 25}');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values
  ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true),
  ('bbbbbbbb-0000-0000-0000-000000000002', true, true, true, true, true);
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'plin', '912345678', 'Mateo Rojas');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto) values
  ('p-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6);
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto) values
  ('p-2', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Luna"}', 'Rosa', 'Mateo', 'Hoy · 11:00 am', 60, 20, 25, 5, 20);

/* ---- quién escribe: solo la paseadora de ESE paseo ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.puntos_control (id, paseo_id, tipo, en, lat, lng) values ('eeeeeeee-0000-0000-0000-000000000001', 'p-1', 'inicio', now(), -12.0999, -77.0374)$$, 'paseadora P: anota el inicio de SU paseo, con su ubicación');
select lives_ok($$insert into public.puntos_control (id, paseo_id, tipo, en, sin_ubicacion) values ('eeeeeeee-0000-0000-0000-000000000002', 'p-1', 'fin', now(), 'negada')$$, 'paseadora P: anota el fin sin ubicación y dice por qué');
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('p-2', 'inicio', now(), -12.07, -77.05)$$, '42501', null, 'paseadora P: no anota puntos en el paseo de otro paseador');
select throws_ok($$insert into public.puntos_control (id, paseo_id, tipo, en, lat, lng) values ('eeeeeeee-0000-0000-0000-000000000001', 'p-1', 'inicio', now(), -12.0999, -77.0374)$$, '23505', null, 'el mismo id no se guarda dos veces: un reintento no duplica el punto');
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en) values ('p-1', 'foto', now())$$, '23514', null, 'solo hay «inicio» y «fin» (las fotos tienen su propia tabla)');
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en, sin_ubicacion) values ('p-1', 'fin', now(), 'inventada')$$, '23514', null, 'el motivo de «sin ubicación» tiene que ser uno de los conocidos');
select throws_ok($$insert into public.puntos_control (paseo_id, tipo) values ('p-1', 'fin')$$, '23502', null, 'un punto sin hora no se guarda');
select is((select count(*)::int from public.puntos_control), 2, 'paseadora P: ve sus dos puntos');

reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('p-1', 'inicio', now(), -12.1, -77.0)$$, '42501', null, 'familia A: no anota puntos ni en su propio paseo (los anota la paseadora; la familia solo lee)');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('p-1', 'inicio', now(), -12.1, -77.0)$$, '42501', null, 'paseador Q: no anota puntos en el paseo de P');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en) values ('p-1', 'inicio', now())$$, '42501', null, 'equipo: no anota puntos (solo los lee)');
reset role;
select set_config('request.jwt.claims', 'null', true);
set local role anon;
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en) values ('p-1', 'inicio', now())$$, '42501', null, 'sin sesión: no se anota nada');
select throws_ok($$select count(*) from public.puntos_control$$, '42501', null, 'sin sesión: ni se puede consultar');

/* ---- quién ve la ubicación del paseo ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.puntos_control), 2, 'familia A: ve el inicio y el fin de SU paseo');
select is((select lat from public.puntos_control where tipo = 'inicio'), -12.0999::double precision, 'familia A: con su ubicación');
select is((select sin_ubicacion from public.puntos_control where tipo = 'fin'), 'negada', 'y, cuando no hay, el motivo');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.puntos_control), 0, 'familia B: no ve los puntos del paseo de A');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.puntos_control), 0, 'paseador Q: no ve los puntos del paseo de P');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.puntos_control), 2, 'equipo: ve los puntos de todos los paseos');

/* ---- nadie edita ni borra un punto: lo que se anotó, anotado queda ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_filas($$update public.puntos_control set lat = 0, lng = 0 where paseo_id = 'p-1'$$), 0, 'paseadora P: no cambia un punto ya anotado (0 filas)');
select is(public.test_filas($$delete from public.puntos_control where paseo_id = 'p-1'$$), 0, 'paseadora P: ni lo borra (0 filas)');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_filas($$update public.puntos_control set lat = 0 where paseo_id = 'p-1'$$), 0, 'familia A: no cambia puntos (0 filas)');
select is(public.test_filas($$delete from public.puntos_control$$), 0, 'familia A: ni los borra (0 filas)');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_filas($$delete from public.puntos_control$$), 0, 'equipo: ni los borra desde la app (0 filas)');

/* ---- la tabla no tiene dónde guardar un recorrido ---- */
reset role;
select is((select array_agg(column_name::text order by column_name) from information_schema.columns where table_schema = 'public' and table_name = 'puntos_control'),
  array['en', 'hora_servidor', 'id', 'lat', 'lng', 'paseo_id', 'precision_m', 'sin_ubicacion', 'tipo'],
  'la tabla de puntos solo tiene hora, hora oficial del servidor, lugar, motivo y tipo (no hay columnas de recorrido ni de «última lectura»)');
select is((select array_agg(distinct tipo::text order by tipo::text) from public.puntos_control), array['fin', 'inicio'], 'y solo guarda inicio y fin');
select ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'paseo_eventos' and column_name in ('lat', 'lng', 'pos', 'ubicacion')),
  'los avisos de zona (paseo_eventos) no traen ubicación: solo tipo, hora y nota');
select ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'bitacora' and column_name in ('lat', 'lng', 'pos', 'ubicacion')),
  'la bitácora tampoco');
select ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mensajes' and column_name in ('lat', 'lng', 'pos', 'ubicacion')),
  'ni el chat');
select ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pagos' and column_name in ('lat', 'lng', 'pos', 'ubicacion')),
  'ni los pagos');
-- Las únicas tablas con coordenadas del paseo: puntos_control, fotos y `ubicacion_en_vivo` (UNA fila por paseo con la última lectura, solo mientras pasea) (y `casas`, la dirección de la familia, y `paseos.vigilancia`, que la app no escribe).
select is((select array_agg(distinct table_name::text order by table_name::text) from information_schema.columns where table_schema = 'public' and column_name in ('lat', 'lng')),
  array['casas', 'fotos', 'puntos_control', 'ubicacion_en_vivo'], 'las únicas tablas con coordenadas son la casa de la familia, las fotos, los puntos de control y la última lectura en vivo (una fila por paseo)');

select * from finish();
rollback;
