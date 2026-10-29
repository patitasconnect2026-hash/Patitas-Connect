-- Pruebas de los casos y disputas en el servidor (paso 7b del plan): quién abre, quién ve y quién resuelve.
-- Se corren con `node supabase/tests/probar_en_pglite.cjs casos_servidor` (sin Docker, sin red) o con `supabase test db`.
begin;
select plan(21);

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

/* ---- quién abre un caso ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.casos (id, paseo_id, tipo, reporte, perro, paseador, dueno, estado_paseo) values ('disputa-p-1', 'p-1', 'disputa', '{"quien":"dueno","motivo":"trato","texto":"Llegó tarde","at":1}', 'Max', 'Lucía', 'Valeria', 'en_disputa')$$, 'familia A: abre un caso en SU paseo');
select throws_ok($$insert into public.casos (id, paseo_id, tipo, perro) values ('disputa-p-2', 'p-2', 'disputa', 'Luna')$$, '42501', null, 'familia A: no abre un caso en el paseo de otra familia');
select throws_ok($$insert into public.casos (id, paseo_id, tipo, resolucion, resuelto_en) values ('disputa-p-1b', 'p-1', 'entrega_sin_confirmar', '{"como":"cerrado","nota":"x","at":1}', now())$$, '42501', null, 'familia A: no abre un caso ya resuelto');
select throws_ok($$insert into public.casos (id, paseo_id, tipo, reporte) values ('disputa-p-1', 'p-1', 'disputa', '{}')$$, '23505', null, 'el mismo id no se guarda dos veces: un reintento no duplica');
select is((select count(*)::int from public.casos), 1, 'familia A: ve su caso');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.casos), 1, 'paseador P: ve el caso de su paseo');
select lives_ok($$insert into public.casos (id, paseo_id, tipo, reporte, perro, estado_paseo) values ('entrega_sin_confirmar-p-1', 'p-1', 'entrega_sin_confirmar', null, 'Max', 'entregado')$$, 'paseador P: también abre un caso en su paseo');

/* ---- quién NO ve ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.casos), 0, 'familia B: no ve los casos de A');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.casos), 0, 'paseador Q: no ve los casos de P');
select throws_ok($$insert into public.casos (id, paseo_id, tipo) values ('disputa-p-1x', 'p-1', 'disputa')$$, '42501', null, 'paseador Q: no abre casos en el paseo de P');

/* ---- quién resuelve ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.casos set reporte = '{"quien":"dueno","motivo":"otro","texto":"Otra cosa","at":2}' where id = 'entrega_sin_confirmar-p-1'$$, 'familia A: suma su reporte a un caso abierto');
select throws_ok($$update public.casos set resolucion = '{"como":"cerrado","nota":"x","at":1}', resuelto_en = now() where id = 'disputa-p-1'$$, '42501', null, 'familia A: NO resuelve un caso (lo hace el equipo)');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$update public.casos set resolucion = '{"como":"cerrado","nota":"x","at":1}', resuelto_en = now() where id = 'disputa-p-1'$$, '42501', null, 'paseador P: NO resuelve un caso');
select throws_ok($$update public.casos set tipo = 'pago' where id = 'disputa-p-1'$$, '42501', null, 'paseador P: no cambia el tipo de un caso');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.casos), 2, 'equipo: ve todos los casos');
select lives_ok($$insert into public.casos (id, paseo_id, tipo, perro, estado_paseo, pago_estado, monto) values ('pago-p-2', 'p-2', 'pago', 'Luna', 'entregado', 'no_encontrado', 25)$$, 'equipo: abre un caso de pago');
select lives_ok($$update public.casos set resolucion = '{"como":"cerrado","nota":"Hablamos con las dos partes.","at":3}', resuelto_en = now() where id = 'disputa-p-1'$$, 'equipo: resuelve un caso con su nota');

/* ---- después de resuelto ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select (resolucion->>'nota') from public.casos where id = 'disputa-p-1'), 'Hablamos con las dos partes.', 'familia A: ve la resolución del equipo');
select is(public.test_filas($$update public.casos set reporte = '{"quien":"dueno","motivo":"otro","texto":"tarde","at":4}' where id = 'disputa-p-1'$$), 0, 'familia A: ya no puede sumar nada a un caso resuelto (0 filas)');
select is(public.test_filas($$delete from public.casos where id = 'disputa-p-1'$$), 0, 'familia A: no borra casos');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_filas($$update public.casos set estado_paseo = 'cerrado' where id = 'disputa-p-1'$$), 1, 'equipo: puede corregir un caso resuelto');
reset role;
select * from finish();
rollback;
