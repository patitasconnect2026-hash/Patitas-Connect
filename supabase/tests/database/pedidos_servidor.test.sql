-- «PEDIR PASEO» (migración 20261016100000_pedidos.sql): quién crea, quién lo ve, ofertas, elegir y privacidad.
begin;
select plan(54);

create function public.test_json(q text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  execute q into r;
  return r;
end $$;
grant execute on function public.test_json(text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'b@prueba.local', '{"rol":"familia","nombre_pila":"Rosa"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'c@prueba.local', '{"rol":"familia","nombre_pila":"Camila"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'r@prueba.local', '{"rol":"paseador","nombre_pila":"Rafa"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';
-- Lucía (San Isidro, parque olivar), Mateo (Jesús María) y Rafa (San Isidro, pero «no disponible»): los tres aprobados.
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, distrito, perfil) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe', 'San Isidro', '{"rate": 22, "spots": ["olivar"]}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'activo', 'Mateo', 'Rojas', 'Jesús María', '{"rate": 25, "spots": ["campo-de-marte"]}'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'PAT-R', 'activo', 'Rafa', 'Soto', 'San Isidro', '{"rate": 20, "spots": ["olivar"], "disponible": false}');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen)
  select paseador_id, true, true, true, true, true from public.postulaciones;
insert into public.cobros_paseador (paseador_id, metodo, celular, titular)
  select paseador_id, 'yape', '987654321', 'Titular' from public.postulaciones;
insert into public.casas (familia_id, calle, distrito, lat, lng) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Av. Arequipa', 'San Isidro', -12.0999, -77.0374),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Av. Brasil', 'Jesús María', -12.0700, -77.0500);
insert into public.perros (id, familia_id, nombre, tamano) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Max', 'small'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Luna', 'small');

/* ================================================================ crear */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.crear_pedido('ped-1', 'dddddddd-0000-0000-0000-000000000001', '{"name":"Max"}'::jsonb, 'Valeria', 'Mañana · 10:00 am', now() + interval '1 day', 60, 'small', -12.0999, -77.0374, array['olivar'], 20, 15)$$) ->> 'creado', 'true', '1. Valeria pide un paseo');
select is(public.test_json($$select public.crear_pedido('ped-1', 'dddddddd-0000-0000-0000-000000000001', '{"name":"Max"}'::jsonb, 'Valeria', 'Mañana · 10:00 am', now() + interval '1 day', 60, 'small', -12.0999, -77.0374, array['olivar'], 20, 15)$$) ->> 'repetido', 'true', '2. repetir el mismo pedido (respuesta perdida) no crea otro');
select is(public.test_json($$select public.crear_pedido('ped-2', null, '{"name":"Max"}'::jsonb, 'Valeria', 'Mañana', now() + interval '1 day', 60, 'small', -12.0999, -77.0374, array[]::text[], 20, 15)$$) ->> 'motivo', 'ya_tienes_pedido', '3. una familia, un pedido activo');
select throws_ok($$update public.pedidos set monto_hora = 34 where id = 'ped-1'$$, '42501', null, '4. el pedido no se toca directo');
select is((select count(*)::int from public.pedidos), 1, '5. Valeria ve su pedido');
select is((select (zona_lat)::numeric(9,3) from public.pedidos where id = 'ped-1'), -12.099::numeric(9,3), '6. la zona aproximada es la cuadrícula de ~330 m (no el punto exacto)');
select is((select estado from public.pedidos where id = 'ped-1'), 'abierto', '7. nace abierto');

reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.crear_pedido('ped-x', null, '{"name":"Nube"}'::jsonb, 'Camila', 'Mañana', now() + interval '1 day', 60, 'small', -12.1, -77.03, array[]::text[], 20, 15)$$) ->> 'motivo', 'sin_casa', '8. sin casa guardada no se puede pedir');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.crear_pedido('ped-b0', null, '{"name":"Luna"}'::jsonb, 'Rosa', 'Mañana', now() + interval '1 day', 60, 'small', -12.07, -77.05, array[]::text[], 15, 15)$$) ->> 'motivo', 'monto', '9. menos del mínimo (16) no entra');
select is(public.test_json($$select public.crear_pedido('ped-b0', null, '{"name":"Luna"}'::jsonb, 'Rosa', 'Mañana', now() + interval '1 day', 60, 'small', -12.07, -77.05, array[]::text[], 35, 15)$$) ->> 'motivo', 'monto', '10. más del tope (34) no entra');
select is(public.test_json($$select public.crear_pedido('ped-b0', null, '{"name":"Luna"}'::jsonb, 'Rosa', 'Hoy', now() + interval '5 minutes', 60, 'small', -12.07, -77.05, array[]::text[], 20, 15)$$) ->> 'motivo', 'hora', '11. no puede empezar antes de que el pedido venza');
select is(public.test_json($$select public.crear_pedido('ped-b0', 'dddddddd-0000-0000-0000-000000000001', '{"name":"Max"}'::jsonb, 'Rosa', 'Mañana', now() + interval '1 day', 60, 'small', -12.07, -77.05, array[]::text[], 20, 15)$$) ->> 'motivo', 'perro', '12. no puede usar el perro de otra familia');
select is(public.test_json($$select public.crear_pedido('ped-b1', 'dddddddd-0000-0000-0000-000000000002', '{"name":"Luna"}'::jsonb, 'Rosa', 'Mañana · 10:00 am', now() + interval '1 day', 60, 'small', -12.07, -77.05, array['campo-de-marte'], 18, 15)$$) ->> 'creado', 'true', '13. Rosa (Jesús María) también pide');
select is((select count(*)::int from public.pedidos), 1, '14. Rosa ve solo el suyo');

/* ================================================================ quién lo ve (paseadores) */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.pedidos), 0, '15. el paseador NO lee la tabla de pedidos (traería el punto exacto)');
select is(jsonb_array_length(public.pedidos_abiertos()), 1, '16. Lucía (San Isidro, olivar) ve solo el pedido de su zona');
select is((public.pedidos_abiertos() -> 0 ->> 'distrito'), 'San Isidro', '17. ve el distrito');
select is(((public.pedidos_abiertos() -> 0 ->> 'zona_lat')::numeric(9,3)), -12.099::numeric(9,3), '18. y la zona aproximada, no el punto exacto');
select is((public.pedidos_abiertos() -> 0 ->> 'dueno_nombre'), 'Valeria', '19. del dueño, solo el nombre de pila');
select ok(not (public.pedidos_abiertos() -> 0) ?| array['punto_lat', 'punto_lng', 'calle', 'familia_id', 'perro_id'], '20. lo que recibe el paseador no trae el punto exacto, la dirección ni la cuenta de la familia');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(jsonb_array_length(public.pedidos_abiertos()), 1, '21. Mateo (Jesús María) ve el pedido de Rosa y no el de Valeria');
select is((public.pedidos_abiertos() -> 0 ->> 'pedido_id'), 'ped-b1', '22. ese es el de su zona');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is(jsonb_array_length(public.pedidos_abiertos()), 0, '23. Rafa, «no disponible», no ve ninguno');
select is(public.test_json($$select public.ofertar('ped-1', 20)$$) ->> 'motivo', 'fuera_de_zona', '24. y tampoco puede ofertar');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is(jsonb_array_length(public.pedidos_abiertos()), 0, '25. una familia no ve pedidos ajenos');

/* ================================================================ ofertar */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.ofertar('ped-1', 19)$$) ->> 'motivo', 'monto', '26. no se puede ofertar MENOS que lo pedido');
select is(public.test_json($$select public.ofertar('ped-1', 35)$$) ->> 'motivo', 'monto', '27. ni pasar el tope');
select is(public.test_json($$select public.ofertar('ped-1', 24)$$) ->> 'ofertado', 'true', '28. una contraoferta de más dinero entra');
select is(public.test_json($$select public.ofertar('ped-1', 20)$$) ->> 'motivo', 'ya_ofertaste', '29. UNA sola oferta por pedido (sin regateo)');
select is((select tipo from public.ofertas where pedido_id = 'ped-1'), 'contraoferta', '30. queda como contraoferta');
select is(((public.pedidos_abiertos() -> 0 ->> 'mi_oferta_monto')::numeric), 24::numeric, '31. y ella ve su oferta');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.ofertas), 1, '32. Valeria ve la oferta de su pedido');
select is((select estado from public.pedidos where id = 'ped-1'), 'con_ofertas', '33. el pedido pasa a «con ofertas»');
select is(public.test_json($$select public.contadores_pedido('ped-1')$$) ->> 'vistos', '1', '34. «1 paseador lo vio»');
select is(public.test_json($$select public.contadores_pedido('ped-1')$$) ->> 'disponibles', '1', '35. «1 disponible en tu zona» (Rafa no cuenta; Mateo es de otro distrito)');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.contadores_pedido('ped-1')$$) ->> 'vistos', '0', '36. otra familia no ve los números ajenos');
select is((select count(*)::int from public.ofertas), 0, '37. ni las ofertas ajenas');

/* ================================================================ un paseo a esa hora */
reset role;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, estado, inicio)
  values ('ocupa', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Nube"}', 'Camila', 'Mateo', 'x', 60, 20, 25, 5, 20, 'aceptado', (select inicio from public.pedidos where id = 'ped-b1') + interval '30 minutes');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(((public.pedidos_abiertos() -> 0 ->> 'ocupado')::boolean), true, '38. Mateo ya tiene un paseo a esa hora: el pedido sale como ocupado');
select is(public.test_json($$select public.ofertar('ped-b1', 18)$$) ->> 'motivo', 'ocupado', '39. y no puede ofertar');

/* ================================================================ elegir */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.elegir_oferta('ped-1:bbbbbbbb-0000-0000-0000-000000000001', 'no-existe')$$) ->> 'motivo', 'paseo', '40. sin el paseo creado no se puede elegir');
insert into public.paseos (id, familia_id, paseador_id, perro_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, inicio)
  values ('paseo-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Mañana · 10:00 am', 60, 19.2, 24, 4.8, 19.2, now() + interval '1 day');
select is(public.test_json($$select public.elegir_oferta('ped-1:bbbbbbbb-0000-0000-0000-000000000001', 'paseo-1')$$) ->> 'elegido', 'true', '41. Valeria elige a Lucía');
select is((select estado::text from public.paseos where id = 'paseo-1'), 'aceptado', '42. el paseo nace ya aceptado (sin pago adelantado)');
select is((select estado from public.pedidos where id = 'ped-1'), 'elegido', '43. el pedido queda elegido');
select is((select estado from public.ofertas where pedido_id = 'ped-1'), 'elegida', '44. la oferta queda elegida');
select is(public.test_json($$select public.elegir_oferta('ped-1:bbbbbbbb-0000-0000-0000-000000000001', 'paseo-1')$$) ->> 'repetido', 'true', '45. elegir dos veces es lo mismo que una');
select throws_ok($$update public.paseos set estado = 'en_camino' where id = 'paseo-1'$$, '42501', null, '46. la familia sigue sin poder mover el paseo por el paseador (el aviso interno es solo de la función)');
select is(public.test_json($$select public.crear_pedido('ped-3', null, '{"name":"Max"}'::jsonb, 'Valeria', 'Pasado', now() + interval '2 days', 60, 'small', -12.0999, -77.0374, array[]::text[], 20, 15)$$) ->> 'creado', 'true', '47. ya sin pedido activo puede pedir otro');
select is(public.test_json($$select public.cancelar_pedido('ped-3')$$) ->> 'cancelado', 'true', '48. y cancelarlo');

/* ================================================================ vencer y pago pendiente */
reset role;
update public.pedidos set estado = 'abierto', expira_en = now() - interval '1 minute' where id = 'ped-b1';
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(jsonb_array_length(public.pedidos_abiertos()), 0, '49. un pedido que ya venció no se ve');
select is(public.test_json($$select public.ofertar('ped-b1', 18)$$) ->> 'motivo', 'ya_no', '50. ni se puede ofertar');
reset role;
select is((select estado from public.pedidos where id = 'ped-b1'), 'vencido', '51. y queda «vencido» solo');
update public.pagos set estado = 'sin_pagar', paseo_estado = 'entregado' where paseo_id = 'paseo-1';
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.crear_pedido('ped-4', null, '{"name":"Max"}'::jsonb, 'Valeria', 'Pasado', now() + interval '2 days', 60, 'small', -12.0999, -77.0374, array[]::text[], 20, 15)$$) ->> 'motivo', 'pago_pendiente', '52. quien debe un pago no puede pedir');
reset role;

/* ================================================================ al borrar la cuenta */
select is((select count(*)::int from public.pedidos where familia_id = 'aaaaaaaa-0000-0000-0000-000000000002'), 1, '53a. Rosa tiene un pedido');
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000002';
select is((select count(*)::int from public.pedidos where familia_id = 'aaaaaaaa-0000-0000-0000-000000000002'), 0, '53. al borrar su cuenta se va su pedido (y sus respuestas, en cadena)');

select * from finish();
rollback;
