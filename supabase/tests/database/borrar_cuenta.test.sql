-- Borrar mi cuenta (parte 3a): quién puede borrarla, qué se borra y qué queda (el registro del equipo, sin el nombre de la persona).
-- Se corren con `node supabase/tests/probar_en_pglite.cjs borrar_cuenta` (sin Docker, sin red) o con `supabase test db`.
-- Cada bloque entra como una persona distinta, igual que lo hará la app (nunca con la clave de servicio).
begin;
select plan(92);

-- Devuelve «código mensaje» del error que da una consulta (o '' si salió bien). Lo que se pidió se queda hecho si salió bien.
create function public.test_error(q text) returns text language plpgsql as $$
begin
  execute q;
  return '';
exception when others then
  return SQLSTATE || ' ' || SQLERRM;
end $$;
grant execute on function public.test_error(text) to authenticated;

-- Personas: tres familias, tres paseadores, una persona del equipo.
--   A (Valeria): se va sin nada pendiente.   B (Rosa): tiene de todo pendiente y NO se va.   C (Camila): ya mostró el pago.
--   P (Lucía): se va sin nada pendiente.     Q (Mateo): espera que el equipo le pague.        R (Renzo): paseador de B.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'familia.a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'familia.b@prueba.local', '{"rol":"familia","nombre_pila":"Rosa"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'familia.c@prueba.local', '{"rol":"familia","nombre_pila":"Camila"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'paseador.q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'paseador.r@prueba.local', '{"rol":"paseador","nombre_pila":"Renzo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';

insert into public.datos_personales (id, apellido, celular, distrito) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Rojas', '987111000', 'San Isidro'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Vega', '987222000', 'San Isidro'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Díaz', '987333000', 'Jesús María'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Quispe', '987654321', 'San Isidro');
insert into public.casas (familia_id, calle, unidad, distrito, emergencia_nombre, emergencia_telefono) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Calle Lizardo Alzamora', 'Dpto. 502', 'San Isidro', 'Tía Mary', '999000111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Av. Arequipa', 'Dpto. 101', 'San Isidro', '', ''),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Jr. Cuba', 'Casa 4', 'Jesús María', '', '');
insert into public.perros (id, familia_id, nombre, tamano, notas) values
  ('d0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'Max', 'large', 'Le da miedo el ruido'),
  ('d0000000-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000002', 'Luna', 'small', ''),
  ('d0000000-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-000000000003', 'Toby', 'medium', '');

insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, perfil) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe', '{"rate": 22}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'activo', 'Mateo', 'Rojas', '{"rate": 25}'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'PAT-R', 'activo', 'Renzo', 'Vega', '{"rate": 20}');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values
  ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true),
  ('bbbbbbbb-0000-0000-0000-000000000002', true, true, true, true, true),
  ('bbbbbbbb-0000-0000-0000-000000000003', true, true, true, true, true);
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'plin', '912345678', 'Mateo Rojas'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'yape', '955555555', 'Renzo Vega');
insert into public.datos_dni (paseador_id, dni) values ('bbbbbbbb-0000-0000-0000-000000000001', '45678912');
insert into public.notas_revision (paseador_id, nota) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Se la vio tranquila en la videollamada.');

-- Paseos (los inserta la base como si ya hubieran pasado; cada uno crea su pago solo).
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, estado, reserva, reporte) values
  ('a-hecho', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Lun · 7:00 am', 60, 17.6, 22, 4.4, 17.6, 'cerrado',
   '{"walker":{"id":"bbbbbbbb-0000-0000-0000-000000000001","name":"Lucía Q.","photo":"https://ejemplo.pe/lucia.jpg"},"total":22}',
   '{"quien":"dueno","motivo":"trato","texto":"Llegó tarde pero todo bien.","foto":"data:image/jpeg;base64,AAAA","at":1}'),
  ('a-cancelado', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Max"}', 'Valeria', 'Mateo', 'Mar · 7:00 am', 60, 20, 25, 5, 20, 'cancelado', null, null),
  ('a-rechazado', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Max"}', 'Valeria', 'Mateo', 'Mié · 7:00 am', 60, 20, 25, 5, 20, 'rechazado', null, null),
  ('b-fin', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', '{"name":"Luna"}', 'Rosa', 'Renzo', 'Lun · 9:00 am', 60, 16, 20, 4, 16, 'cerrado', null, null),
  ('c-1', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Toby"}', 'Camila', 'Mateo', 'Jue · 8:00 am', 60, 20, 25, 5, 20, 'cerrado', null, null);
update public.paseos set perro_id = 'd0000000-0000-0000-0000-00000000000a' where id = 'a-hecho';
update public.paseos set perro_id = 'd0000000-0000-0000-0000-00000000000c' where id = 'c-1';
update public.pagos set estado = 'pagado_paseador', pagado_paseador_en = now() where paseo_id in ('a-hecho', 'b-fin');
update public.pagos set estado = 'visto', visto_en = now() where paseo_id = 'c-1';

-- Lo que dejó el paseo de A con P: fotos, chat, bitácora, ubicación, código y un caso ya resuelto.
insert into public.fotos (id, tipo, paseo_id, paseador_id, en, ruta) values
  ('f0000000-0000-0000-0000-000000000001', 'paseo', 'a-hecho', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/a-hecho/f1.jpg');
insert into public.fotos (id, tipo, paseo_id, paseador_id, dia, en, ruta) values
  ('f0000000-0000-0000-0000-000000000002', 'hoy', null, 'bbbbbbbb-0000-0000-0000-000000000001', date '2026-10-15', now(), 'hoy/bbbbbbbb-0000-0000-0000-000000000001/2026-10-15.jpg');
insert into public.mensajes (id, paseo_id, de, texto, imagen_ruta) values
  ('m-1', 'a-hecho', 'owner', 'Hola, ¿ya llegaste?', null),
  ('m-2', 'a-hecho', 'walker', null, 'chat/a-hecho/m-2.jpg');
insert into public.bitacora (id, paseo_id, tipo, texto) values ('bi-1', 'a-hecho', 'start', 'Lucía recogió a Max');
insert into public.puntos_control (paseo_id, tipo, en, lat, lng) values ('a-hecho', 'inicio', now(), -12.0999, -77.0374);
insert into public.codigos_recojo (paseo_id, codigo) values ('a-hecho', '1234');
insert into public.casos (id, paseo_id, tipo, reporte, perro, paseador, dueno, estado_paseo, pago_estado, resolucion, resuelto_en) values
  ('disputa-a-hecho', 'a-hecho', 'disputa', '{"quien":"dueno","motivo":"trato","texto":"Llegó tarde pero todo bien.","foto":"data:image/jpeg;base64,AAAA","at":1}', 'Max', 'Lucía', 'Valeria', 'cerrado', 'pagado_paseador',
   '{"como":"cerrado","nota":"Se habló con las dos partes.","at":2}', now()),
  ('disputa-a-rechazado', 'a-rechazado', 'disputa', '{"quien":"dueno","motivo":"otro","texto":"Cancelaron tarde.","at":3}', 'Max', 'Mateo', 'Valeria', 'rechazado', 'sin_pagar',
   '{"como":"cancelado","nota":"Sin cobro.","at":4}', now());

select is((select count(*)::int from public.pagos), 5, 'cada paseo creó su pago solo');

/* ---------------------------------------------------------------- quién NO puede borrar su cuenta */
select set_config('request.jwt.claims', '', true);
set local role authenticated;
select is(public.test_error($$select public.borrar_mi_cuenta()$$), '42501 Entra a tu cuenta para borrarla.', 'sin sesión no se borra nada');
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000009","role":"authenticated"}', true);
select is(public.test_error($$select public.borrar_mi_cuenta()$$), 'P0002 No encontramos tu cuenta.', 'una sesión de una cuenta que ya no existe: no hay nada que borrar');
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.borrar_mi_cuenta() ->> 'motivo', 'equipo', 'la cuenta del equipo no se borra desde la app');
reset role;
select is((select count(*)::int from auth.users), 7, 'ninguno de esos intentos borró a nadie');

/* ---------------------------------------------------------------- lo que impide borrar (B: Rosa y su paseador R) */
-- 1) un paseo en marcha
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, estado) values
  ('b-1', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', '{"name":"Luna"}', 'Rosa', 'Renzo', 'Mar · 9:00 am', 60, 16, 20, 4, 16, 'aceptado');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.borrar_mi_cuenta() ->> 'motivo', 'paseo_pendiente', 'con un paseo aceptado y sin terminar, la familia no puede borrar su cuenta');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is(public.borrar_mi_cuenta() ->> 'motivo', 'paseo_pendiente', 'el paseador de ese paseo tampoco');
reset role;
select is((select count(*)::int from public.casas where familia_id = 'aaaaaaaa-0000-0000-0000-000000000002'), 1, 'y no se borró nada (la casa de B sigue)');
delete from public.paseos where id = 'b-1';

-- 1b) un pedido sin responder también cuenta
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, estado) values
  ('b-1b', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', '{"name":"Luna"}', 'Rosa', 'Renzo', 'Mar · 9:00 am', 60, 16, 20, 4, 16, 'solicitado');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.borrar_mi_cuenta() ->> 'motivo', 'paseo_pendiente', 'un pedido que nadie respondió todavía también impide borrar');
reset role;
delete from public.paseos where id = 'b-1b';

-- 2) un paseo en disputa
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, estado) values
  ('b-2', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', '{"name":"Luna"}', 'Rosa', 'Renzo', 'Mié · 9:00 am', 60, 16, 20, 4, 16, 'en_disputa');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.borrar_mi_cuenta() ->> 'motivo', 'reporte_abierto', 'con un paseo en disputa no se puede borrar la cuenta');
reset role;
delete from public.paseos where id = 'b-2';

-- 3) un caso abierto en un paseo ya cerrado
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, estado) values
  ('b-3', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', '{"name":"Luna"}', 'Rosa', 'Renzo', 'Jue · 9:00 am', 60, 16, 20, 4, 16, 'cerrado');
update public.pagos set estado = 'pagado_paseador', pagado_paseador_en = now() where paseo_id = 'b-3';
insert into public.casos (id, paseo_id, tipo, perro, paseador, dueno, estado_paseo, pago_estado) values ('pago-b-3', 'b-3', 'pago', 'Luna', 'Renzo', 'Rosa', 'cerrado', 'pagado_paseador');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.borrar_mi_cuenta() ->> 'motivo', 'reporte_abierto', 'con un caso abierto en un paseo cerrado, la familia no puede borrar su cuenta');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is(public.borrar_mi_cuenta() ->> 'motivo', 'reporte_abierto', 'ni su paseador');
reset role;
delete from public.paseos where id = 'b-3';

-- 4) un pago pendiente: la familia que todavía no mostró el pago, y el que el equipo no encontró
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, estado) values
  ('b-4', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', '{"name":"Luna"}', 'Rosa', 'Renzo', 'Vie · 9:00 am', 60, 16, 20, 4, 16, 'cerrado');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.borrar_mi_cuenta() ->> 'motivo', 'pago_pendiente', 'con un paseo terminado sin pagar, la familia no puede borrar su cuenta');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is(public.borrar_mi_cuenta() ->> 'motivo', 'pago_pendiente', 'ni el paseador que espera cobrar');
reset role;
update public.pagos set estado = 'no_encontrado', no_encontrado_en = now(), nota = 'No aparece' where paseo_id = 'b-4';
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.borrar_mi_cuenta() ->> 'motivo', 'pago_pendiente', 'si el equipo no encontró el pago, la familia sigue sin poder borrar su cuenta');
reset role;
delete from public.paseos where id = 'b-4';
select is((select count(*)::int from auth.users), 7, 'ninguno de esos intentos borró a nadie');

/* ---------------------------------------------------------------- C: ya mostró el pago, solo falta que el equipo le pague al paseador */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_error($$select public.borrar_mi_cuenta()$$), '', 'la familia que ya mostró el pago sí puede borrar su cuenta (lo que falta es el pago al paseador)');
reset role;
select is((select count(*)::int from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000003'), 0, 'la cuenta de C ya no existe');
select is((select count(*)::int from public.perfiles where id = 'aaaaaaaa-0000-0000-0000-000000000003'), 0, 'su perfil tampoco');
select is((select count(*)::int from public.datos_personales where id = 'aaaaaaaa-0000-0000-0000-000000000003'), 0, 'ni sus datos personales');
select is((select count(*)::int from public.casas where familia_id = 'aaaaaaaa-0000-0000-0000-000000000003'), 0, 'ni su casa');
select is((select count(*)::int from public.perros where familia_id = 'aaaaaaaa-0000-0000-0000-000000000003'), 0, 'ni su perro');
select is((select familia_id from public.paseos where id = 'c-1'), null, 'el paseo de C se queda, sin apuntar a nadie');
select is((select dueno_nombre from public.paseos where id = 'c-1'), 'Cuenta borrada', 'y sin su nombre');
select is((select paseador_nombre from public.paseos where id = 'c-1'), 'Mateo', 'el nombre del paseador no se toca');
select is((select familia_id from public.pagos where paseo_id = 'c-1'), null, 'el pago se queda, sin apuntar a la familia');
select is((select estado::text from public.pagos where paseo_id = 'c-1'), 'visto', 'y sigue «visto»: al paseador todavía se le tiene que pagar');
select is((select perro_id from public.paseos where id = 'c-1'), null, 'el paseo ya no apunta al perro borrado');

/* ---------------------------------------------------------------- A: se va sin nada pendiente */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_error($$select public.borrar_mi_cuenta()$$), '', 'la familia sin nada pendiente borra su cuenta');
reset role;
select is((select count(*)::int from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'la cuenta de A ya no existe');
select is((select count(*)::int from public.perfiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'su perfil tampoco');
select is((select count(*)::int from public.datos_personales where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'ni su apellido ni su celular');
select is((select count(*)::int from public.casas where familia_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'ni su casa ni su contacto de emergencia');
select is((select count(*)::int from public.perros where familia_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'ni su perro (ni lo que escribió de él)');
select is((select count(*)::int from public.paseos where id = 'a-cancelado'), 0, 'un paseo cancelado y sin ningún caso no deja nada: se borra entero');
select is((select count(*)::int from public.pagos where paseo_id = 'a-cancelado'), 0, 'y su pago también');
select is((select count(*)::int from public.paseos where id in ('a-hecho', 'a-rechazado')), 2, 'el paseo terminado y el que tiene un caso resuelto se quedan (registro del equipo)');
select is((select count(*)::int from public.paseos where id in ('a-hecho', 'a-rechazado') and familia_id is null and dueno_nombre = 'Cuenta borrada'), 2, 'pero sin apuntar a A y sin su nombre');
select is((select paseador_nombre from public.paseos where id = 'a-hecho'), 'Lucía', 'el nombre del paseador no se toca');
select is((select familia_id from public.pagos where paseo_id = 'a-hecho'), null, 'el pago del paseo terminado se queda, sin apuntar a A');
select is((select estado::text from public.pagos where paseo_id = 'a-hecho'), 'pagado_paseador', 'y dice lo mismo que antes');
select is((select count(*)::int from public.mensajes where paseo_id = 'a-hecho'), 0, 'el chat de ese paseo se borró');
select is((select count(*)::int from public.bitacora where paseo_id = 'a-hecho'), 0, 'la bitácora también');
select is((select count(*)::int from public.puntos_control where paseo_id = 'a-hecho'), 0, 'y las ubicaciones');
select is((select count(*)::int from public.codigos_recojo where paseo_id = 'a-hecho'), 0, 'y el código de recojo');
select is((select count(*)::int from public.fotos where paseo_id = 'a-hecho'), 0, 'las fotos del paseo se borraron (la fila)');
select ok(exists (select 1 from public.archivos_por_borrar where ruta = 'paseo/a-hecho/f1.jpg'), 'y la ruta de la foto quedó anotada para que el script borre el archivo');
select ok(exists (select 1 from public.archivos_por_borrar where ruta = 'chat/a-hecho/m-2.jpg'), 'lo mismo con la imagen del chat');
select ok(not (select reporte ? 'foto' from public.paseos where id = 'a-hecho'), 'la foto del reporte que escribió A se fue');
select is((select reporte ->> 'texto' from public.paseos where id = 'a-hecho'), 'Llegó tarde pero todo bien.', 'el texto del reporte queda para el equipo');
select ok((select reserva ? 'walker' from public.paseos where id = 'a-hecho'), 'la reserva conserva al paseador (quien se fue es la familia)');
select is((select dueno from public.casos where id = 'disputa-a-hecho'), 'Cuenta borrada', 'el caso ya resuelto queda sin el nombre de A');
select is((select paseador from public.casos where id = 'disputa-a-hecho'), 'Lucía', 'y con el del paseador');
select ok(not (select reporte ? 'foto' from public.casos where id = 'disputa-a-hecho'), 'y sin la foto que puso A');
select is((select count(*)::int from public.casos where id in ('disputa-a-hecho', 'disputa-a-rechazado')), 2, 'los casos resueltos se conservan');
select is((select count(*)::int from public.casas where familia_id = 'aaaaaaaa-0000-0000-0000-000000000002'), 1, 'lo de B no se tocó (su casa sigue)');
select is((select count(*)::int from public.perros where familia_id = 'aaaaaaaa-0000-0000-0000-000000000002'), 1, 'ni su perro');
select is((select familia_id::text from public.paseos where id = 'b-fin'), 'aaaaaaaa-0000-0000-0000-000000000002', 'ni su paseo');

-- Lo que quedó lo sigue viendo la otra persona y el equipo.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.paseos where id = 'a-hecho'), 1, 'el paseador ve el paseo que terminó');
select is((select dueno_nombre from public.paseos where id = 'a-hecho'), 'Cuenta borrada', 'y ve «Cuenta borrada» en lugar del nombre de A');
select is((select count(*)::int from public.pagos where paseo_id = 'a-hecho'), 1, 'y ve su pago');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.pagos where familia_id is null), 3, 'el equipo ve los tres pagos que quedaron sin familia (c-1, a-hecho y a-rechazado)');
reset role;

/* ---------------------------------------------------------------- P: la paseadora se va sin nada pendiente */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.borrar_mi_cuenta() ->> 'borrada', 'true', 'la paseadora sin nada pendiente borra su cuenta (y la base lo confirma)');
reset role;
select is((select count(*)::int from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'su cuenta ya no existe');
select is((select count(*)::int from public.postulaciones where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'su postulación se borró');
select is((select count(*)::int from public.comprobaciones where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'y sus casillas');
select is((select count(*)::int from public.datos_dni where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'y su DNI');
select is((select count(*)::int from public.notas_revision where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'y lo que el equipo anotó de ella');
select is((select count(*)::int from public.cobros_paseador where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'y dónde cobraba');
select is((select count(*)::int from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'ya no sale entre los paseadores');
select ok(exists (select 1 from public.archivos_por_borrar where ruta = 'hoy/bbbbbbbb-0000-0000-0000-000000000001/2026-10-15.jpg'), 'la ruta de su foto de hoy quedó anotada');
select is((select count(*)::int from public.fotos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'y sus filas de fotos se borraron');
select is((select paseador_id from public.paseos where id = 'a-hecho'), null, 'el paseo que hizo se queda, sin apuntar a ella');
select is((select paseador_nombre from public.paseos where id = 'a-hecho'), 'Cuenta borrada', 'y sin su nombre');
select ok(not (select reserva ? 'walker' from public.paseos where id = 'a-hecho'), 'ni su nombre ni su foto en la reserva');
select is((select paseador from public.casos where id = 'disputa-a-hecho'), 'Cuenta borrada', 'ni en el caso ya resuelto');
select is((select paseador_id from public.pagos where paseo_id = 'a-hecho'), null, 'su pago se queda, sin apuntar a ella');

/* ---------------------------------------------------------------- una segunda vez */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_error($$select public.borrar_mi_cuenta()$$), 'P0002 No encontramos tu cuenta.', 'pedirlo otra vez no hace nada: la cuenta ya no existe');
reset role;

/* ---------------------------------------------------------------- Q: espera que el equipo le pague (la familia ya mostró el pago) */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.borrar_mi_cuenta() ->> 'motivo', 'pago_pendiente', 'el paseador al que el equipo todavía no le pagó no puede borrar su cuenta');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((public.mover_pago('c-1', 'pagar_al_paseador')).estado::text, 'pagado_paseador', 'el equipo todavía puede pagarle a Mateo aunque la familia ya se fue');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_error($$select public.borrar_mi_cuenta()$$), '', 'ya cobró: ahora sí borra su cuenta');
reset role;
select is((select count(*)::int from public.postulaciones where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 0, 'su postulación se borró');
select is((select count(*)::int from public.paseos where id = 'a-cancelado'), 0, 'lo cancelado seguía borrado');
select is((select count(*)::int from public.paseos where id in ('c-1', 'a-rechazado') and paseador_id is null and paseador_nombre = 'Cuenta borrada'), 2, 'sus paseos quedan sin su nombre');
select is((select count(*)::int from public.paseos where id in ('c-1', 'a-rechazado') and familia_id is null and dueno_nombre = 'Cuenta borrada'), 2, 'y sin el de las familias que ya se fueron');

/* ---------------------------------------------------------------- nadie deja en blanco a otra persona a mano */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_error($$update public.paseos set familia_id = null where id = 'b-fin'$$), '42501 No se pueden cambiar la familia, el paseador ni los montos de un paseo.', 'la familia no puede dejarse en blanco a mano en un paseo');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is(public.test_error($$update public.paseos set paseador_id = null where id = 'b-fin'$$), '42501 No se pueden cambiar la familia, el paseador ni los montos de un paseo.', 'el paseador tampoco');
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.test_error($$update public.paseos set familia_id = null where id = 'b-fin'$$), '42501 No se pueden cambiar la familia, el paseador ni los montos de un paseo.', 'ni el equipo');
reset role;

/* ---------------------------------------------------------------- un pago sin paseador no lo mueve nadie como paseador */
update public.pagos set estado = 'sin_pagar', pagado_paseador_en = null where paseo_id = 'a-hecho';
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_error($$select public.mover_pago('a-hecho', 'ver_pago')$$), '42501 Solo el paseador de este paseo puede hacer esto.', 'otro paseador no puede decir «Vi el pago» de un pago que quedó sin paseador');
reset role;

/* ---------------------------------------------------------------- la lista de archivos por borrar es solo del script */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(left(public.test_error($$select * from public.archivos_por_borrar$$), 5), '42501', 'una familia no puede leer la lista de archivos por borrar');
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(left(public.test_error($$select * from public.archivos_por_borrar$$), 5), '42501', 'ni el equipo desde la app: solo el script con la clave de servicio');
reset role;
select is((select count(*)::int from public.archivos_por_borrar), 3, 'quedaron anotadas las 3 rutas (foto del paseo, imagen del chat y foto de hoy)');

select * from finish();
rollback;
