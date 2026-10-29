-- LÍMITES CONOCIDOS de las reglas del paseo (paso 6a): lo que la base NO comprueba hoy.
-- Cada prueba demuestra que algo PASA (la base lo deja hacer) para que nadie crea que está protegido. Son hechos, no
-- aprobaciones: si el equipo decide cerrar uno, se escribe una migración nueva y se cambia o se borra la prueba.
-- Lo que cuida la app y no la base: el plazo para aceptar, el orden del código de recojo, los montos, los cupos.
-- (Cerrados el 15 de octubre con la migración 20261015130000_integridad.sql, y probados en integridad.test.sql: que el horario, la
-- duración, la reserva y el perro de un paseo ya pedido no cambian, que el perro es de la familia que lo pide, y que el reporte
-- se escribe una sola vez y lo firma quien lo envía.)
begin;
select plan(6);

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
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated');
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido) values ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true);
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe');

-- Un paseo de la familia con la paseadora (como la familia, igual que lo hace la app).
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, reserva) values
  ('l-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6, '{"walkPrice":22}');
-- Un paseo con montos que no son los de la configuración (la base solo exige que sumen).
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('l-4', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy', 60, 1, 2, 1, 1)$$,
  'LÍMITE: los montos los calcula la app; la base solo comprueba que sumen (cualquier cifra que sume pasa)');
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('l-5', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6)$$,
  'LÍMITE: la base no mira si el paseador ya tiene otro paseo a esa hora ni cuántos perros lleva (cupo y tamaños)');

-- El plazo para aceptar: la solicitud más vieja que el plazo se puede aceptar igual (lo cuida la app).
reset role;
update public.paseos set creado_en = now() - interval '5 hours' where id = 'l-1';
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_filas($$update public.paseos set estado = 'aceptado' where id = 'l-1' and estado = 'solicitado'$$), 1,
  'LÍMITE: una solicitud de hace 5 horas se acepta igual; el plazo (minutosParaAceptar) solo lo cuida la app');

-- El código de recojo: nada obliga a comprobarlo antes de «recoger» ni de «entregar».
select lives_ok($$update public.paseos set estado = 'en_camino' where id = 'l-1' and estado = 'aceptado'$$, 'sale a recoger');
select lives_ok($$update public.paseos set estado = 'en_paseo' where id = 'l-1' and estado = 'en_camino'$$,
  'LÍMITE: recoge al perro sin haber comprobado el código; el orden del código solo lo cuida la app');
select lives_ok($$update public.paseos set estado = 'entregado' where id = 'l-1' and estado = 'en_paseo'$$,
  'LÍMITE: entrega sin código (la app lo pide con entregaPideCodigo; la base no)');

reset role;
select * from finish();
rollback;
