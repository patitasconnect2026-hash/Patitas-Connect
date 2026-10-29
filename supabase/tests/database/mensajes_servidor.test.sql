-- Pruebas del chat del paseo en el servidor (paso 6b del plan): quién lee y quién escribe en `mensajes`.
-- Se corren con `node supabase/tests/probar_en_pglite.cjs mensajes` (sin Docker, sin red) o con `supabase test db`.
-- No cambian ninguna regla: demuestran las que ya están en 20261014120100_reglas.sql. Cada bloque entra como una
-- persona distinta, igual que lo hará la app (nunca con la clave de servicio).
begin;
select plan(35);

create function public.test_filas(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.test_filas(text) to authenticated;

-- Dos familias, tres paseadores (P y Q con un paseo cada uno, R sin paseo) y una persona del equipo.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'familia.a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'familia.b@prueba.local', '{"rol":"familia","nombre_pila":"Rosa"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'paseador.q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'paseador.r@prueba.local', '{"rol":"paseador","nombre_pila":"Renzo"}', 'authenticated', 'authenticated'),
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

-- La familia A pide a P; la familia B pide a Q (como lo hace la app, con la sesión de cada familia).
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, reserva) values
  ('p-a', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6, '{"walkPrice":22}');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, reserva) values
  ('p-b', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Luna"}', 'Rosa', 'Mateo', 'Hoy · 11:00 am', 60, 17.6, 22, 4.4, 17.6, '{"walkPrice":22}');

/* ---- la familia A escribe en SU paseo, como «owner» */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-a1', 'p-a', 'owner', 'Hola Lucía')$$, 'la familia escribe en el chat de su paseo');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-a2', 'p-a', 'walker', 'Soy Lucía')$$, '42501', null, 'la familia no escribe «como» la paseadora');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-a3', 'p-b', 'owner', 'Intruso')$$, '42501', null, 'la familia no escribe en el paseo de otra familia');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-a4', 'p-a', 'owner', null)$$, '23514', null, 'un mensaje sin texto ni foto no vale');
select lives_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-a5', 'p-a', 'owner', 'Segundo mensaje')$$, 'puede escribir más de uno');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-a1', 'p-a', 'owner', 'Otra vez')$$, '23505', null, 'el mismo id no se repite (un reintento no duplica)');
select is((select count(*)::int from public.mensajes), 2, 'la familia lee los dos mensajes de su paseo');
select is((select count(*)::int from public.mensajes where paseo_id = 'p-b'), 0, 'no lee nada del paseo de otra familia');

/* ---- la paseadora P escribe en SU paseo, como «walker», incluso antes de aceptar */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.mensajes), 2, 'la paseadora lee lo que escribió la familia');
select lives_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-p1', 'p-a', 'walker', 'Hola Valeria, llego en 5')$$, 'la paseadora escribe en el chat de su paseo');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-p2', 'p-a', 'owner', 'Soy la familia')$$, '42501', null, 'la paseadora no escribe «como» la familia');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-p3', 'p-b', 'walker', 'En el paseo de Mateo')$$, '42501', null, 'la paseadora no escribe en el paseo de otro paseador');
select is((select count(*)::int from public.mensajes where paseo_id = 'p-b'), 0, 'la paseadora no lee el chat de otro paseo');

/* ---- ni cambiar ni borrar: ni quien lo escribió */
select throws_ok($$update public.mensajes set texto = 'cambiado' where id = 'm-p1'$$, '42501', null, 'ni quien lo escribió cambia un mensaje');
select throws_ok($$delete from public.mensajes where id = 'm-p1'$$, '42501', null, 'ni quien lo escribió borra un mensaje');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$update public.mensajes set texto = 'cambiado' where id = 'm-p1'$$, '42501', null, 'la familia no cambia un mensaje de la paseadora');
select throws_ok($$delete from public.mensajes where id = 'm-a1'$$, '42501', null, 'la familia no borra ni sus propios mensajes');

/* ---- otra familia y otro paseador: no leen ni escriben en el chat ajeno */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.mensajes), 0, 'la familia B no lee ninguno de los chats de la A');
select is((select count(*)::int from public.mensajes where paseo_id = 'p-a'), 0, 'ni pidiéndolos por el paseo');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-x1', 'p-a', 'owner', 'Soy una intrusa')$$, '42501', null, 'la familia B no escribe en el chat de la A, como «owner»');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-x2', 'p-a', 'walker', 'Soy una intrusa')$$, '42501', null, 'la familia B no escribe en el chat de la A, como «walker»');
select lives_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-b1', 'p-b', 'owner', 'Hola Mateo')$$, 'la familia B sí escribe en el suyo');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.mensajes), 1, 'el paseador Q solo lee el chat de su paseo');
select is((select count(*)::int from public.mensajes where paseo_id = 'p-a'), 0, 'el paseador Q no lee el chat del paseo de Lucía');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-x3', 'p-a', 'walker', 'Soy un intruso')$$, '42501', null, 'el paseador Q no escribe en el chat del paseo de Lucía');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.mensajes), 0, 'un paseador sin ningún paseo no lee ningún chat');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-x4', 'p-a', 'walker', 'Intruso sin paseo')$$, '42501', null, 'ni escribe en un paseo que no es suyo');

/* ---- el equipo lee todo y no escribe */
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.mensajes), 4, 'el equipo lee los chats de todos los paseos');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-e1', 'p-a', 'owner', 'Soy el equipo')$$, '42501', null, 'el equipo no escribe como «owner»');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-e2', 'p-a', 'walker', 'Soy el equipo')$$, '42501', null, 'el equipo no escribe como «walker»');

/* ---- sin sesión: nada */
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok($$select count(*) from public.mensajes$$, '42501', null, 'sin sesión no se lee el chat');
select throws_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m-n1', 'p-a', 'owner', 'Sin sesión')$$, '42501', null, 'sin sesión no se escribe');

/* ---- el largo está limitado desde el 15 de octubre (migración 20261015130000_integridad.sql); el chat sigue sin depender del estado del paseo */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.mensajes (id, paseo_id, de, texto) values ('m-l1', 'p-a', 'owner', repeat('x', 1000))$$,
  'un mensaje de 1.000 letras entra (la app corta en 500; la base pone un tope más amplio)');
select throws_ok(
  $$insert into public.mensajes (id, paseo_id, de, texto) values ('m-l1b', 'p-a', 'owner', repeat('x', 1001))$$,
  '23514', null, 'un mensaje de más de 1.000 letras no entra');
reset role;
update public.paseos set estado = 'cancelado' where id = 'p-a';
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.mensajes (id, paseo_id, de, texto) values ('m-l2', 'p-a', 'owner', 'Con el paseo ya cancelado')$$,
  'LÍMITE: el chat sigue abierto aunque el paseo esté cancelado o cerrado (la base no mira el estado)');

reset role;
select * from finish();
rollback;
