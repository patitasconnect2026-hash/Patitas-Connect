-- LÍMITES CONOCIDOS de los casos y disputas (paso 7b): lo que la base NO comprueba hoy y solo cuida la app (o nadie).
-- Cada prueba demuestra que algo PASA (la base lo deja hacer) para que nadie crea que está protegido. Son hechos, no
-- aprobaciones: si el equipo decide cerrar uno, se escribe una migración nueva y se cambia o se borra la prueba.
-- (Cerrado el 15 de octubre con la migración 20261015130000_integridad.sql y probado en integridad.test.sql: lo que se anota al abrir
-- el caso —registro, nombres, estado del paseo y del pago, monto— ya no lo cambia quien lo abrió.)
begin;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'familia.a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido) values ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true);
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe');

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto) values
  ('p-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6);

/* 1. Los datos del caso (perro, monto, estado del paseo…) los pone quien lo abre: la base no los compara con el paseo real. */
select lives_ok($$insert into public.casos (id, paseo_id, tipo, perro, dueno, paseador, estado_paseo, pago_estado, monto) values ('disputa-p-1', 'p-1', 'disputa', 'Otro perro', 'Otra persona', 'Otro', 'cerrado', 'pagado_paseador', 9999)$$, '1. la familia abre un caso con perro, monto y estado que NO son los del paseo (la base no los compara; el equipo debe mirar el paseo)');

/* 2. Un caso se puede abrir aunque el paseo ni haya empezado. */
select is((select estado::text from public.paseos where id = 'p-1'), 'solicitado', '2. el paseo sigue «solicitado» y aun así se abrió una disputa (la base no mira el estado del paseo)');

/* 3. Resolver un caso NO mueve el paseo: eso lo hace la app con otra llamada. */
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
update public.casos set resolucion = '{"como":"cancelado","nota":"Se anuló.","at":3}', resuelto_en = now() where id = 'disputa-p-1';
select is((select estado::text from public.paseos where id = 'p-1'), 'solicitado', '3. el equipo resuelve el caso («se anuló el paseo») y el paseo NO cambia solo: la app lo mueve aparte');
reset role;

select * from finish();
rollback;
