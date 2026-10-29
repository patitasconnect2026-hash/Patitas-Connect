-- El borrado de fotos a los 7 días (paso 8): qué fotos entrega `fotos_para_borrar` al script
-- (supabase/scripts/borrar_fotos_vencidas.mjs, que corre con la clave de servicio). Las fotos de un paseo con un caso
-- abierto o en disputa SE CONSERVAN hasta que se cierre el caso. Este archivo NO borra nada: solo prueba la lista.
begin;
select plan(15);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'familia.a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, perfil) values ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe', '{"rate": 22}');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true);
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe');

-- Seis paseos de la misma familia con la misma paseadora (se crean como la familia, como lo hace la app).
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto) values
  ('b-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 9:00 am', 60, 17.6, 22, 4.4, 17.6),
  ('b-2', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6),
  ('b-3', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 11:00 am', 60, 17.6, 22, 4.4, 17.6),
  ('b-4', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 12:00 m', 60, 17.6, 22, 4.4, 17.6),
  ('b-5', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 1:00 pm', 60, 17.6, 22, 4.4, 17.6);
reset role;

-- Las fotos (se insertan como administrador de la base, sin sesión: aquí solo importa cuáles entrega la función).
select set_config('request.jwt.claims', '', true);
insert into public.fotos (id, tipo, paseo_id, paseador_id, dia, en, ruta, vence_en) values
  ('f0000000-0000-0000-0000-000000000001', 'paseo', 'b-1', 'bbbbbbbb-0000-0000-0000-000000000001', null, now() - interval '9 days', 'paseo/b-1/vieja.jpg', now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000002', 'paseo', 'b-2', 'bbbbbbbb-0000-0000-0000-000000000001', null, now() - interval '9 days', 'paseo/b-2/caso-abierto.jpg', now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000003', 'paseo', 'b-3', 'bbbbbbbb-0000-0000-0000-000000000001', null, now() - interval '9 days', 'paseo/b-3/disputa.jpg', now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000004', 'paseo', 'b-4', 'bbbbbbbb-0000-0000-0000-000000000001', null, now() - interval '9 days', 'paseo/b-4/caso-resuelto.jpg', now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000005', 'paseo', 'b-5', 'bbbbbbbb-0000-0000-0000-000000000001', null, now(), 'paseo/b-5/nueva.jpg', now() + interval '7 days'),
  ('f0000000-0000-0000-0000-000000000006', 'hoy', null, 'bbbbbbbb-0000-0000-0000-000000000001', current_date - 9, now() - interval '9 days', 'hoy/bbbbbbbb-0000-0000-0000-000000000001/vieja.jpg', now() - interval '2 days');
-- Un caso abierto en b-2, uno ya resuelto en b-4 y un paseo en disputa (b-3).
insert into public.casos (id, paseo_id, tipo, abierto_en, resuelto_en) values
  ('pago-b-2', 'b-2', 'pago', now() - interval '8 days', null),
  ('pago-b-4', 'b-4', 'pago', now() - interval '8 days', now() - interval '3 days');
update public.paseos set estado = 'aceptado' where id = 'b-3';
update public.paseos set estado = 'en_disputa' where id = 'b-3';

set local role service_role;
select is((select count(*)::int from public.fotos_para_borrar()), 3, 'se entregan 3 fotos: la vencida sin caso, la del caso ya resuelto y la foto de hoy vieja');
select ok(exists (select 1 from public.fotos_para_borrar() where ruta = 'paseo/b-1/vieja.jpg'), 'una foto vencida sin ningún caso se borra');
select ok(exists (select 1 from public.fotos_para_borrar() where ruta = 'paseo/b-4/caso-resuelto.jpg'), 'una foto de un paseo con el caso ya resuelto se borra');
select ok(exists (select 1 from public.fotos_para_borrar() where ruta = 'hoy/bbbbbbbb-0000-0000-0000-000000000001/vieja.jpg'), 'una foto de hoy vencida se borra (no es de ningún paseo)');
select ok(not exists (select 1 from public.fotos_para_borrar() where ruta = 'paseo/b-2/caso-abierto.jpg'), 'una foto de un paseo con un caso ABIERTO se conserva');
select ok(not exists (select 1 from public.fotos_para_borrar() where ruta = 'paseo/b-3/disputa.jpg'), 'una foto de un paseo EN DISPUTA se conserva');
select ok(not exists (select 1 from public.fotos_para_borrar() where ruta = 'paseo/b-5/nueva.jpg'), 'una foto que todavía no venció se conserva');

-- Cuando el caso se cierra, esa foto entra a la lista.
reset role;
select set_config('request.jwt.claims', '', true);
update public.casos set resuelto_en = now() where id = 'pago-b-2';
update public.paseos set estado = 'cerrado' where id = 'b-3';
set local role service_role;
select ok(exists (select 1 from public.fotos_para_borrar() where ruta = 'paseo/b-2/caso-abierto.jpg'), 'al cerrarse el caso, su foto vencida se borra');
select ok(exists (select 1 from public.fotos_para_borrar() where ruta = 'paseo/b-3/disputa.jpg'), 'al salir el paseo de la disputa, su foto vencida se borra');
select is((select count(*)::int from public.fotos_para_borrar()), 5, 'ahora son 5 las que se entregan');

-- Un paseo con VARIAS fotos: mientras el caso siga abierto, se conservan todas.
reset role;
insert into public.fotos (id, tipo, paseo_id, paseador_id, en, ruta, vence_en) values
  ('f0000000-0000-0000-0000-000000000007', 'paseo', 'b-5', 'bbbbbbbb-0000-0000-0000-000000000001', now() - interval '9 days', 'paseo/b-5/vieja-1.jpg', now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000008', 'paseo', 'b-5', 'bbbbbbbb-0000-0000-0000-000000000001', now() - interval '9 days', 'paseo/b-5/vieja-2.jpg', now() - interval '1 day');
insert into public.casos (id, paseo_id, tipo) values ('disputa-b-5', 'b-5', 'disputa');
set local role service_role;
select is((select count(*)::int from public.fotos_para_borrar() where ruta like 'paseo/b-5/%'), 0, 'con un caso abierto en el paseo b-5 no se entrega ninguna de sus fotos vencidas');

-- Nadie más puede pedir la lista (ni la familia, ni la paseadora, ni el equipo desde la app, ni sin sesión).
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select * from public.fotos_para_borrar()$$, '42501', null, 'equipo (desde la app): no puede pedir la lista de fotos a borrar');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select * from public.fotos_para_borrar()$$, '42501', null, 'familia: no puede pedirla');
reset role;
select set_config('request.jwt.claims', 'null', true);
set local role anon;
select throws_ok($$select * from public.fotos_para_borrar()$$, '42501', null, 'sin sesión: no puede pedirla');
-- Las imágenes del chat no tienen fila en `fotos`: la función no las conoce (límite conocido, documentado en supabase/LEEME.md).
reset role;
select ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mensajes' and column_name = 'vence_en'), 'LÍMITE: las imágenes del chat no tienen fecha de vencimiento y el script no las borra');

select * from finish();
rollback;
