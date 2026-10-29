-- LÍMITES CONOCIDOS de los puntos de control (paso 9): lo que la base NO comprueba hoy y solo cuida la app (o nadie).
-- Cada prueba demuestra que algo PASA (la base lo deja hacer) para que nadie crea que está protegido. Son hechos, no
-- aprobaciones: si el equipo decide cerrar uno, se escribe una migración nueva y se cambia o se borra la prueba.
begin;
select plan(2);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'familia.a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated');
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, perfil) values ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe', '{"rate": 22}');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true);
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto) values
  ('l-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6);
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- (Cerrados el 15 de octubre con la migración 20261015130000_integridad.sql y probados en integridad.test.sql: un solo inicio y un solo
-- fin por paseo, coordenadas posibles, siempre ubicación o motivo, y la paseadora ya no puede guardar `vigilancia`.)

-- 1. Un fin sin haber llegado a «en paseo»: la base no mira el estado del paseo.
select lives_ok($$insert into public.puntos_control (paseo_id, tipo, en, sin_ubicacion) values ('l-1', 'fin', now(), 'omitida')$$,
  'LÍMITE: la base no mira el estado del paseo: un «fin» entra aunque el paseo siga «solicitado»');
-- 2. La hora y el lugar los pone el teléfono.
select lives_ok($$insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('l-1', 'inicio', now() - interval '400 days', 40.0, 10.0)$$,
  'LÍMITE: la hora y el lugar los pone el teléfono: una hora de hace un año y unas coordenadas lejos de Lima entran igual (son señales)');

select * from finish();
rollback;
