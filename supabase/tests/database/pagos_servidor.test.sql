-- Pruebas de los pagos en el servidor (paso 7 del plan): quién ve qué y quién puede mover un pago.
-- Se corren con `node supabase/tests/probar_en_pglite.cjs pagos` (sin Docker, sin red) o con `supabase test db`.
-- Cada bloque entra como una persona distinta, igual que lo hará la app (nunca con la clave de servicio).
-- La app no mueve dinero: estas pruebas solo hablan del REGISTRO del pago.
begin;
select plan(64);

create function public.test_filas(q text) returns int language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.test_filas(text) to authenticated;

-- Personas: dos familias, dos paseadores aprobados, un paseador sin aprobar y una persona del equipo.
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
  ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'activo', 'Mateo', 'Rojas', '{"rate": 25}'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'PAT-R', 'enviada', 'Renzo', 'Vega', '{"rate": 20}');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values
  ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true),
  ('bbbbbbbb-0000-0000-0000-000000000002', true, true, true, true, true),
  ('bbbbbbbb-0000-0000-0000-000000000003', true, false, false, false, false);
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'plin', '912345678', 'Mateo Rojas');

/* ---- cada familia pide un paseo a su paseador: el pago nace solo, sin que la app lo escriba */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto) values
  ('p-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6);
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto) values
  ('p-2', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Luna"}', 'Rosa', 'Mateo', 'Hoy · 11:00 am', 60, 20, 25, 5, 20);

/* ---- quién ve los pagos ---- */
select is((select count(*)::int from public.pagos), 1, 'familia B: ve solo el pago de su paseo');
select is((select paseo_id from public.pagos), 'p-2', 'familia B: es el de ella, no el de la familia A');
select is((select count(*)::int from public.pagos where paseo_id = 'p-1'), 0, 'familia B: no ve el pago de la familia A');
select is((select estado::text from public.pagos where paseo_id = 'p-2'), 'sin_pagar', 'el pago nace «sin_pagar»');
select is((select paseo_estado::text from public.pagos where paseo_id = 'p-2'), 'solicitado', 'y sabe cómo va el paseo (solicitado)');
select is((select neto from public.pagos where paseo_id = 'p-2'), 20::numeric, 'y guarda la foto de los montos del paseo');
select is((select count(*)::int from public.cobros_paseador), 0, 'familia B: no ve dónde cobra NINGÚN paseador (ni el de su paseo)');

reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.pagos), 1, 'familia A: ve solo el pago de su paseo');
select is((select count(*)::int from public.pagos where paseo_id = 'p-2'), 0, 'familia A: no ve el pago de la familia B');
select is((select count(*)::int from public.cobros_paseador), 0, 'familia A: no ve dónde cobra su paseador');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.pagos), 1, 'paseadora P: ve solo el pago de su paseo');
select is((select count(*)::int from public.pagos where paseo_id = 'p-2'), 0, 'paseadora P: no ve el pago del paseo de Q');
select is((select count(*)::int from public.cobros_paseador), 1, 'paseadora P: ve solo dónde cobra ELLA');
select is((select titular from public.cobros_paseador), 'Lucía Quispe', 'paseadora P: y es el suyo, no el de otro paseador');
select is(public.test_filas($$update public.cobros_paseador set celular = '900000000' where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000002'$$), 0, 'paseadora P: no puede cambiar el Yape o Plin de otro paseador (0 filas)');
select throws_ok($$insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values ('bbbbbbbb-0000-0000-0000-000000000003', 'yape', '900000000', 'Intruso')$$, '42501', null, 'paseadora P: no puede crear el cobro de otra persona');
select lives_ok($$insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values ('bbbbbbbb-0000-0000-0000-000000000001', 'plin', '911111111', 'Lucía Quispe')
  on conflict (paseador_id) do update set metodo = excluded.metodo, celular = excluded.celular, titular = excluded.titular$$, 'paseadora P: guarda o cambia el suyo en una sola operación (upsert)');
select is((select metodo from public.cobros_paseador where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 'plin', 'paseadora P: el cambio quedó');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.pagos), 1, 'paseador Q: ve solo el pago de su paseo');
select is((select count(*)::int from public.cobros_paseador where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'paseador Q: no ve el Yape o Plin de P');

reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.pagos), 2, 'equipo: ve todos los pagos');
select is((select count(*)::int from public.cobros_paseador), 2, 'equipo: ve dónde cobra cada paseador');

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok($$select count(*) from public.pagos$$, '42501', null, 'sin sesión: la tabla de pagos no se puede ni consultar');
select throws_ok($$select count(*) from public.cobros_paseador$$, '42501', null, 'sin sesión: tampoco dónde cobra nadie');
select throws_ok($$select public.mover_pago('p-1', 'ver_pago')$$, '42501', null, 'sin sesión: no se mueve ningún pago');

/* ---- nadie escribe un pago directo: solo por `mover_pago` ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$update public.pagos set estado = 'pagado_paseador' where paseo_id = 'p-1'$$, '42501', null, 'equipo: ni el equipo marca «pagado» editando la tabla (solo por mover_pago)');
select throws_ok($$delete from public.pagos where paseo_id = 'p-1'$$, '42501', null, 'equipo: tampoco borra pagos');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$update public.pagos set estado = 'pagado_paseador' where paseo_id = 'p-1'$$, '42501', null, 'paseadora P: no se marca «pagado» editando la tabla');
select throws_ok($$insert into public.pagos (paseo_id, familia_id, paseador_id, monto, comision, neto) values ('x', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 1, 0, 1)$$, '42501', null, 'paseadora P: no crea un pago a mano (nace con el paseo)');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$update public.pagos set monto = 1 where paseo_id = 'p-1'$$, '42501', null, 'familia A: no cambia el monto de su pago');

/* ---- «Vi el pago» antes de que el paseo termine: no ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.mover_pago('p-1', 'ver_pago')$$, '22023', null, 'paseadora P: no puede decir «Vi el pago» antes de entregar al perro');
select is((select estado::text from public.pagos where paseo_id = 'p-1'), 'sin_pagar', 'y el pago sigue «sin_pagar»');

-- El paseo de P avanza hasta «entregado» (cada cambio lo hace quien le toca).
select lives_ok($$update public.paseos set estado = 'aceptado' where id = 'p-1' and estado = 'solicitado'$$, 'P acepta');
select lives_ok($$update public.paseos set estado = 'en_camino' where id = 'p-1' and estado = 'aceptado'$$, 'P sale');
select lives_ok($$update public.paseos set estado = 'en_paseo' where id = 'p-1' and estado = 'en_camino'$$, 'P recoge');
select lives_ok($$update public.paseos set estado = 'entregado' where id = 'p-1' and estado = 'en_paseo'$$, 'P entrega');
select is((select paseo_estado::text from public.pagos where paseo_id = 'p-1'), 'entregado', 'el pago se entera solo de que el paseo se entregó');
select ok((select hecho_en is not null from public.pagos where paseo_id = 'p-1'), 'y anota desde cuándo corre el plazo de pago (hecho_en)');

/* ---- quién puede mover el pago ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.mover_pago('p-1', 'ver_pago')$$, '42501', null, 'familia A: no dice «Vi el pago» (es del paseador)');
select throws_ok($$select public.mover_pago('p-1', 'pagar_al_paseador')$$, '42501', null, 'familia A: no marca «Pagado al paseador» (es del equipo)');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.mover_pago('p-1', 'ver_pago')$$, '42501', null, 'paseador Q: no dice «Vi el pago» de un paseo que no es suyo');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.mover_pago('p-1', 'ver_pago')$$, '42501', null, 'equipo: tampoco dice «Vi el pago» (lo dice el paseador)');
select throws_ok($$select public.mover_pago('p-1', 'pagar_al_paseador')$$, '22023', null, 'equipo: no paga lo que el paseador todavía no vio (el pago está «sin_pagar»)');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select estado::text from public.mover_pago('p-1', 'ver_pago', null, '10:45')), 'visto', 'paseadora P: dice «Vi el pago» y el pago pasa a «visto»');
select is((select hora_pago from public.pagos where paseo_id = 'p-1'), '10:45', 'y queda la hora que anotó');
select ok((select visto_en is not null from public.pagos where paseo_id = 'p-1'), 'y la hora en que lo vio');
select throws_ok($$select public.mover_pago('p-1', 'ver_pago')$$, '22023', null, 'una segunda vez ya no corresponde: el pago ya está «visto»');
select throws_ok($$select public.mover_pago('p-1', 'pagar_al_paseador')$$, '42501', null, 'paseadora P: NO puede marcarse «Pagado al paseador» (solo el equipo)');
select throws_ok($$select public.mover_pago('p-1', 'no_encontrado', 'No lo veo en mi cuenta')$$, '42501', null, 'paseadora P: tampoco «No lo encuentro» (es del equipo)');
select throws_ok($$select public.mover_pago('p-1', 'inventada')$$, '22023', null, 'una acción que no existe se rechaza');
select throws_ok($$select public.mover_pago('no-existe', 'ver_pago')$$, 'P0002', null, 'un pago que no existe se rechaza');
select is((select estado::text from public.pagos where paseo_id = 'p-1'), 'visto', 'después de tantos intentos el pago sigue «visto»');

reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select estado::text from public.pagos where paseo_id = 'p-1'), 'visto', 'familia A: ve que el paseador ya vio el pago');

/* ---- el equipo: «No lo encuentro» con nota, y «Pagado al paseador» ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.mover_pago('p-1', 'no_encontrado')$$, '22023', null, 'equipo: «No lo encuentro» sin nota se rechaza');
select throws_ok($$select public.mover_pago('p-1', 'no_encontrado', '  a ')$$, '22023', null, 'equipo: y con una nota de menos de 3 letras también');
select is((select estado::text from public.mover_pago('p-1', 'no_encontrado', 'No aparece en mi Yape')), 'no_encontrado', 'equipo: «No lo encuentro» con nota pasa a «no_encontrado»');
select is((select nota from public.pagos where paseo_id = 'p-1'), 'No aparece en mi Yape', 'y la nota queda en el pago');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select nota from public.pagos where paseo_id = 'p-1'), 'No aparece en mi Yape', 'familia A: ve la nota del equipo');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select estado::text from public.mover_pago('p-1', 'ver_pago')), 'visto', 'paseadora P: puede volver a decir «Vi el pago» después de un «No lo encuentro»');
select ok((select nota is null and no_encontrado_en is null from public.pagos where paseo_id = 'p-1'), 'y la nota anterior se limpia');

reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select estado::text from public.mover_pago('p-1', 'pagar_al_paseador')), 'pagado_paseador', 'equipo: SOLO el equipo marca «Pagado al paseador»');
select ok((select pagado_paseador_en is not null from public.pagos where paseo_id = 'p-1'), 'y queda la hora');
select throws_ok($$select public.mover_pago('p-1', 'no_encontrado', 'Otra nota')$$, '22023', null, 'equipo: un pago ya pagado no se puede volver a «no encontrado»');
select throws_ok($$select public.mover_pago('p-1', 'pagar_al_paseador')$$, '22023', null, 'equipo: ni pagar dos veces');

select * from finish();
rollback;
