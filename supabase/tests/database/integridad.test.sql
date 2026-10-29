-- INTEGRIDAD (migración 20261015130000_integridad.sql): lo que hasta el 15 de octubre solo cuidaba la app y ahora exige también la base.
-- Cada prueba demuestra que la base RECHAZA algo que la app nunca manda, y que lo que la app sí manda sigue pasando.
begin;
select plan(82);

create function public.test_error(q text) returns text language plpgsql as $$
begin
  execute q;
  return null;
exception when others then
  return SQLERRM;
end $$;
grant execute on function public.test_error(text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'familia.a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'familia.b@prueba.local', '{"rol":"familia","nombre_pila":"Rosa"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'familia.c@prueba.local', '{"rol":"familia","nombre_pila":"Camila"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'paseador.q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';
-- Lucía (P) está aprobada: sus cinco casillas y dónde cobra.
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, perfil) values ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe', '{"rate": 22}');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true);
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe');
insert into public.perros (id, familia_id, nombre, tamano, notas) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Max', 'small', 'Ficha de Valeria'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Luna', 'small', 'Ficha de Rosa'),
  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Kira', 'small', 'Segunda ficha de Valeria');

/* ================================================================ 1) el perro del paseo es de la familia que lo pide */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, reserva, distrito)
    values ('i-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6, '{"walkPrice":22}', 'San Isidro')$$,
  '1. Valeria pide un paseo con SU perro');
select throws_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('i-x', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', '{"name":"Luna"}', 'Valeria', 'Lucía', 'Hoy', 60, 17.6, 22, 4.4, 17.6)$$,
  '42501', null, '2. no puede apuntar al perro de OTRA familia (la paseadora vería su ficha al aceptar)');
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('i-2', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Otro"}', 'Valeria', 'Lucía', 'Hoy · 11:00 am', 60, 17.6, 22, 4.4, 17.6)$$,
  '3. un paseo sin ficha de perro (perro_id vacío) sigue entrando');
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('i-3', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000003', '{"name":"Kira"}', 'Valeria', 'Lucía', 'Hoy · 12:00 m', 60, 17.6, 22, 4.4, 17.6)$$,
  '4. otro paseo con su segunda ficha');

/* ================================================================ 2) un paseo ya pedido no cambia */
select throws_ok($$update public.paseos set horario = 'Mañana · 6:00 am' where id = 'i-1'$$, '42501', null, '5. la familia no cambia el horario de un paseo ya pedido');
select throws_ok($$update public.paseos set duracion_min = 90 where id = 'i-1'$$, '42501', null, '6. ni la duración');
select throws_ok($$update public.paseos set reserva = '{"walkPrice":1}'::jsonb where id = 'i-1'$$, '42501', null, '7. ni la reserva');
select throws_ok($$update public.paseos set perro = '{"name":"Otro"}'::jsonb where id = 'i-1'$$, '42501', null, '8. ni el resumen del perro');
select throws_ok($$update public.paseos set perro_id = 'dddddddd-0000-0000-0000-000000000002' where id = 'i-1'$$, '42501', null, '9. ni lo apunta después al perro de otra familia');
select throws_ok($$update public.paseos set dueno_nombre = 'Otra persona' where id = 'i-1'$$, '42501', null, '10. ni los nombres');
select throws_ok($$update public.paseos set vigilancia = '{"ultima":{"pos":[-12.1,-77.03],"t":1}}'::jsonb where id = 'i-1'$$, '42501', null, '11. los avisos de ubicación (`vigilancia`) no se guardan en la base');
select throws_ok($$update public.paseos set ubicacion = 'activa' where id = 'i-1'$$, '42501', null, '12. ni el permiso de ubicación');
-- Borrar la ficha de un perro deja el paseo con el perro en blanco (no lo cambia a otro): eso sí pasa.
select lives_ok($$delete from public.perros where id = 'dddddddd-0000-0000-0000-000000000003'$$, '13. la familia borra la ficha de Kira');
select is((select perro_id from public.paseos where id = 'i-3'), null, '14. el paseo i-3 queda con el perro en blanco (y sigue ahí)');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$update public.paseos set horario = 'Cuando yo quiera' where id = 'i-1'$$, '42501', null, '15. el paseador tampoco cambia el horario');
select throws_ok($$update public.paseos set vigilancia = '{"ultima":{"pos":[-12.1,-77.03],"t":1}}'::jsonb, ubicacion = 'activa' where id = 'i-1'$$, '42501', null, '16. ni guarda la memoria de los avisos de ubicación');
-- Lo que la app sí manda: el estado. Y la base pone las horas (creado_en y aceptado_en no se falsifican).
select lives_ok($$update public.paseos set estado = 'aceptado', creado_en = '2001-01-01', aceptado_en = '2001-01-01' where id = 'i-1' and estado = 'solicitado'$$, '17. acepta (aunque quiera mandar horas inventadas)');
select ok((select creado_en > now() - interval '1 hour' from public.paseos where id = 'i-1'), '18. la hora de creación sigue siendo la de la base');
select ok((select aceptado_en > now() - interval '1 minute' from public.paseos where id = 'i-1'), '19. la hora de aceptación la pone la base, no quien acepta');
select lives_ok($$update public.paseos set aceptado_en = '2001-01-01' where id = 'i-1'$$, '20. mandar una hora de aceptación inventada no hace nada (se ignora)');
select ok((select aceptado_en > now() - interval '1 minute' from public.paseos where id = 'i-1'), '20b. la hora de aceptación sigue siendo la de la base');

/* ================================================================ 3) el reporte se hace una vez y lo firma quien lo envía */
select lives_ok($$update public.paseos set estado = 'en_camino' where id = 'i-1' and estado = 'aceptado'$$, '21. sale a recoger');
select throws_ok($$update public.paseos set reporte = '{"quien":"paseador","motivo":"trato","texto":"Sin pasar a disputa"}'::jsonb where id = 'i-1'$$, '42501', null, '22. el reporte no se escribe sin pasar a «en disputa»');
select throws_ok($$update public.paseos set estado = 'en_disputa', reporte = '{"quien":"dueno","motivo":"trato","texto":"Firmado como la familia"}'::jsonb where id = 'i-1' and estado = 'en_camino'$$, '42501', null, '23. el paseador no reporta a nombre de la familia');
select lives_ok($$update public.paseos set estado = 'en_disputa', reporte = '{"quien":"paseador","motivo":"trato","texto":"El reporte del paseador"}'::jsonb where id = 'i-1' and estado = 'en_camino'$$, '24. el paseador reporta con su firma');
select throws_ok($$update public.paseos set reporte = '{"quien":"paseador","motivo":"otro","texto":"Reescrito"}'::jsonb where id = 'i-1'$$, '42501', null, '25. el reporte ya hecho no se reescribe');

reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$update public.paseos set reporte = '{"quien":"dueno","motivo":"otro","texto":"Lo reescribí"}'::jsonb where id = 'i-1'$$, '42501', null, '26. la familia tampoco reescribe el reporte del paseador');
select is((select reporte ->> 'texto' from public.paseos where id = 'i-1'), 'El reporte del paseador', '27. el reporte quedó como lo escribió quien reportó');

/* ================================================================ 4) cerrar el paseo del lado del paseador */
select throws_ok($$update public.paseos set cerrado_paseador = true where id = 'i-2'$$, '42501', null, '28. la familia no cierra el paseo por el paseador');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.paseos set cerrado_paseador = true where id = 'i-2'$$, '29. el paseador cierra el paseo de su lado');
select throws_ok($$update public.paseos set cerrado_paseador = false where id = 'i-2'$$, '42501', null, '30. y no lo deshace');

/* ================================================================ 5) el equipo y la base conservan su poder */
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.paseos set horario = 'Corregido por el equipo', reporte = '{"quien":"dueno","motivo":"otro","texto":"Corregido por el equipo"}'::jsonb where id = 'i-1'$$, '31. el equipo sí corrige un paseo');
reset role;

/* ================================================================ 6) con un pago pendiente no se pide otro paseo */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('c-1', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Nube"}', 'Camila', 'Lucía', 'Hoy · 8:00 am', 60, 17.6, 22, 4.4, 17.6)$$,
  '32. Camila pide su primer paseo');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
update public.paseos set estado = 'aceptado' where id = 'c-1';
update public.paseos set estado = 'en_camino' where id = 'c-1';
update public.paseos set estado = 'en_paseo' where id = 'c-1';
update public.paseos set estado = 'entregado' where id = 'c-1';
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('c-2', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Nube"}', 'Camila', 'Lucía', 'Mañana · 8:00 am', 60, 17.6, 22, 4.4, 17.6)$$,
  '23514', null, '33. el paseo c-1 ya se hizo y no está pagado: la base no deja pedir otro');
select ok(public.test_error($$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('c-2', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Nube"}', 'Camila', 'Lucía', 'Mañana · 8:00 am', 60, 17.6, 22, 4.4, 17.6)$$) ~* 'pago pendiente',
  '34. y el aviso dice «pago pendiente» (la app lo cambia por su frase)');
select throws_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('c-1', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Nube"}', 'Camila', 'Lucía', 'Hoy · 8:00 am', 60, 17.6, 22, 4.4, 17.6)$$,
  '23505', null, '34b. el reintento del MISMO paseo (mismo id) da el choque de siempre, no el aviso de pago pendiente');
-- Otra familia que intente pedir EN NOMBRE de Camila recibe el «no» de siempre: la base no le cuenta que Camila debe un pago.
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('c-3', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Nube"}', 'Camila', 'Lucía', 'Hoy', 60, 17.6, 22, 4.4, 17.6)$$,
  '42501', null, '35. pedir a nombre de otra familia sigue siendo un «no tienes permiso» (no se filtra que debe un pago)');
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('b-1', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Luna"}', 'Rosa', 'Lucía', 'Hoy', 60, 17.6, 22, 4.4, 17.6)$$,
  '36. la deuda de Camila no frena a otra familia');
-- El paseador dice «Vi el pago»: ya no se debe y se puede pedir otro.
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.mover_pago('c-1', 'ver_pago', null, '8:50 am')$$, '37. el paseador dice «Vi el pago»');
select ok((select marcado_por is null from public.pagos where paseo_id = 'c-1'), '38. «Vi el pago» lo hace el paseador: no queda como acción del equipo');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('c-2', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Nube"}', 'Camila', 'Lucía', 'Mañana · 8:00 am', 60, 17.6, 22, 4.4, 17.6)$$,
  '39. mostrado el pago, Camila ya puede pedir otro paseo');
-- Si el equipo no encuentra el pago, vuelve a deberse.
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.mover_pago('c-1', 'no_encontrado', 'No llegó a la cuenta', null)$$, '40. el equipo no encuentra el pago');
select is((select marcado_por from public.pagos where paseo_id = 'c-1'), 'cccccccc-0000-0000-0000-000000000001'::uuid, '41. el pago guarda QUÉ persona del equipo lo marcó');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('c-4', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Nube"}', 'Camila', 'Lucía', 'Pasado mañana', 60, 17.6, 22, 4.4, 17.6)$$,
  '23514', null, '42. «No lo encuentro» vuelve a bloquear: el pago sigue pendiente');
select throws_ok($$update public.pagos set marcado_por = 'aaaaaaaa-0000-0000-0000-000000000003' where paseo_id = 'c-1'$$, '42501', null, '43. nadie escribe `marcado_por` a mano (los pagos solo cambian por `mover_pago`)');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.mover_pago('c-1', 'pagar_al_paseador', null, null)$$, '44. el equipo le paga al paseador');
select is((select marcado_por from public.pagos where paseo_id = 'c-1'), 'cccccccc-0000-0000-0000-000000000001'::uuid, '45. y queda su nombre en el pago');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('c-4', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Nube"}', 'Camila', 'Lucía', 'Pasado mañana', 60, 17.6, 22, 4.4, 17.6)$$,
  '46. ya sin deuda, Camila pide otro');
-- Un paseo que no se hizo (rechazado) no deja nada pendiente.
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.paseos set estado = 'rechazado' where id = 'c-4' and estado = 'solicitado'$$, '47. la paseadora rechaza c-4');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('c-5', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Nube"}', 'Camila', 'Lucía', 'Otro día', 60, 17.6, 22, 4.4, 17.6)$$,
  '48. un paseo rechazado no se debe: puede pedir otro');
reset role;

/* ================================================================ 7) puntos de control */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('i-2', 'inicio', now(), -12.0999, -77.0374)$$, '49. el paseador anota el inicio con su lugar');
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('i-2', 'inicio', now(), -12.1, -77.03)$$, '23505', null, '50. un segundo inicio en el mismo paseo no entra');
select lives_ok($$insert into public.puntos_control (paseo_id, tipo, en, sin_ubicacion) values ('i-2', 'fin', now(), 'negada')$$, '51. el fin sin lugar entra si dice por qué');
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en, sin_ubicacion) values ('i-2', 'fin', now(), 'omitida')$$, '23505', null, '52. un segundo fin tampoco');
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('c-1', 'inicio', now(), 999, 999)$$, '23514', null, '53. unas coordenadas que no existen no entran');
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en) values ('c-1', 'inicio', now())$$, '23514', null, '54. un punto sin lugar y sin motivo no entra');
select throws_ok($$insert into public.puntos_control (paseo_id, tipo, en, lat) values ('c-1', 'inicio', now(), -12.1)$$, '23514', null, '55. ni con la mitad del lugar');
select lives_ok($$insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('c-1', 'inicio', now(), 40.0, 10.0)$$, '56. un lugar posible pero lejos de Lima entra (la hora y el lugar los pone el teléfono: son señales)');
reset role;

/* ================================================================ 8) casos */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.casos (id, paseo_id, tipo, reporte, perro, dueno, paseador, estado_paseo, pago_estado, monto, registro) values ('disputa-i-1', 'i-1', 'disputa', '{"quien":"dueno","motivo":"trato","texto":"x","at":1}'::jsonb, 'Max', 'Valeria', 'Lucía', 'en_disputa', 'sin_pagar', 22, '[]'::jsonb)$$, '57. la familia abre el caso de su paseo');
select throws_ok($$update public.casos set registro = '[{"accion":"inventada"}]'::jsonb where id = 'disputa-i-1'$$, '42501', null, '58. quien abrió el caso no cambia su registro');
select throws_ok($$update public.casos set monto = 1 where id = 'disputa-i-1'$$, '42501', null, '59. ni el monto');
select throws_ok($$update public.casos set perro = 'Otro perro', dueno = 'Otra persona' where id = 'disputa-i-1'$$, '42501', null, '60. ni los nombres');
select throws_ok($$update public.casos set estado_paseo = 'cerrado', pago_estado = 'pagado_paseador' where id = 'disputa-i-1'$$, '42501', null, '61. ni el estado del paseo ni el del pago');
select throws_ok($$update public.casos set reporte = '{"quien":"dueno","motivo":"otro","texto":"Reescrito","at":2}'::jsonb where id = 'disputa-i-1'$$, '42501', null, '62. el reporte del caso se hace una vez');
select throws_ok($$insert into public.casos (id, paseo_id, tipo) values ('mi-propio-id', 'i-1', 'disputa')$$, '23514', null, '63. el id de un caso es siempre «<tipo>-<paseo>»');
select throws_ok($$insert into public.casos (id, paseo_id, tipo, pago_estado) values ('entrega_sin_confirmar-i-1', 'i-1', 'entrega_sin_confirmar', 'inventado')$$, '23514', null, '64. el estado del pago es uno de los que la app conoce');
-- Un caso que abrió el equipo (por un pago) sin reporte: el paseador suma el suyo, una vez.
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.casos (id, paseo_id, tipo, perro, dueno, paseador, estado_paseo, pago_estado, monto) values ('pago-c-1', 'c-1', 'pago', 'Nube', 'Camila', 'Lucía', 'entregado', 'no_encontrado', 22)$$, '65. el equipo abre un caso de pago');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.casos set reporte = '{"quien":"paseador","motivo":"pago","texto":"Mi versión","at":3}'::jsonb where id = 'pago-c-1'$$, '66. el paseador suma su reporte al caso');
select throws_ok($$update public.casos set reporte = '{"quien":"paseador","motivo":"pago","texto":"Otra versión","at":4}'::jsonb where id = 'pago-c-1'$$, '42501', null, '67. y no lo reescribe');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.casos set registro = '[{"accion":"nota del equipo"}]'::jsonb, resolucion = '{"como":"cerrado","nota":"Resuelto","at":5}'::jsonb, resuelto_en = now() where id = 'pago-c-1'$$, '68. el equipo sí corrige y resuelve');
reset role;

/* ================================================================ 9) postulaciones */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$insert into public.postulaciones (paseador_id, codigo, estado, paseos_acompanados) values ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'enviada', 5)$$, '42501', null, '69. el paseador no se pone solo paseos acompañados al crear su postulación');
select throws_ok($$insert into public.postulaciones (paseador_id, codigo, estado, revision_notas) values ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'enviada', 'Aprobado sin dudas')$$, '42501', null, '70. ni escribe las notas del equipo');
select lives_ok($$insert into public.postulaciones (paseador_id, codigo, estado, nombre) values ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'borrador', 'Mateo') on conflict (paseador_id) do update set estado = excluded.estado, nombre = excluded.nombre$$, '71. crea su postulación (con la forma de «insertar o actualizar» que usa la app)');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.postulaciones set paseos_acompanados = 2 where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000002'$$, '72. el equipo anota 2 paseos acompañados');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.postulaciones (paseador_id, codigo, estado, nombre) values ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'enviada', 'Mateo R.') on conflict (paseador_id) do update set estado = excluded.estado, nombre = excluded.nombre$$, '73. si corrige y vuelve a enviar su postulación, sigue entrando…');
select is((select paseos_acompanados from public.postulaciones where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 2, '74. …y no borra los paseos acompañados que anotó el equipo');
reset role;

/* ================================================================ 10) fotos */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, bytes) values ('paseo', 'i-2', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/i-2/justa.jpg', 1048576)$$, '75. una foto de 1 MB justo entra');
select throws_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, bytes) values ('paseo', 'i-2', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/i-2/grande.jpg', 1048577)$$, '23514', null, '76. una foto que dice pesar más de 1 MB no entra');
select throws_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, bytes) values ('paseo', 'i-2', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/i-2/vacia.jpg', 0)$$, '23514', null, '77. ni una de 0 bytes');
select throws_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, lat, lng) values ('paseo', 'i-2', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/i-2/luna.jpg', 91, 0)$$, '23514', null, '78. un lugar imposible no entra');
select lives_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, lat, lng) values ('paseo', 'i-2', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/i-2/lejos.jpg', 40.0, 10.0)$$, '79. un lugar posible lejos de Lima sí (son señales)');
select lives_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta) values ('paseo', 'i-2', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/i-2/sin-peso.jpg')$$, '80. una foto sin peso anotado sigue entrando');
reset role;

select * from finish();
rollback;
