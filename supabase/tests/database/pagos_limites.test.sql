-- LÍMITES CONOCIDOS de los pagos (paso 7): lo que la base NO comprueba hoy y solo cuida la app (o nadie).
-- Cada prueba demuestra que algo PASA (la base lo deja hacer) para que nadie crea que está protegido. Son hechos, no
-- aprobaciones: si el equipo decide cerrar uno, se escribe una migración nueva y se cambia o se borra la prueba.
begin;
select plan(3);

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
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido) values ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true);
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe');

-- Un paseo entregado, con el pago sin pagar.
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto) values
  ('d-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6);
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
update public.paseos set estado = 'aceptado' where id = 'd-1';
update public.paseos set estado = 'en_camino' where id = 'd-1';
update public.paseos set estado = 'en_paseo' where id = 'd-1';
update public.paseos set estado = 'entregado' where id = 'd-1';

-- (Cerrados el 15 de octubre con la migración 20261015130000_integridad.sql y probados en integridad.test.sql: con un pago
-- pendiente la base ya no deja pedir otro paseo, y cada pago guarda qué persona del equipo lo marcó.)

-- 1. El plazo de pago (horasParaPagar) no existe en la base: pasadas varias semanas, el paseador todavía puede decir «Vi el pago».
reset role;
update public.pagos set hecho_en = now() - interval '30 days' where paseo_id = 'd-1';
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.mover_pago('d-1', 'ver_pago', null, 'cualquier cosa')$$,
  'LÍMITE: el plazo de pago (24 h) no lo comprueba la base: 30 días después todavía se acepta «Vi el pago» (es solo un recordatorio de la app)');
-- 2. La hora que anota el paseador es texto libre (hasta 20 letras), sin formato.
select is((select hora_pago from public.pagos where paseo_id = 'd-1'), 'cualquier cosa', 'LÍMITE: la hora anotada es texto libre, la base no revisa el formato');

-- 3. El pago de un paseo nunca se compara con lo que se cobró de verdad: la base no sabe de dinero real.
select is((select monto from public.pagos where paseo_id = 'd-1'), 22::numeric, 'LÍMITE: el monto es el de la reserva; que la plata llegó a la cuenta del equipo se confirma a mano, la base no lo sabe');

reset role;

select * from finish();
rollback;
