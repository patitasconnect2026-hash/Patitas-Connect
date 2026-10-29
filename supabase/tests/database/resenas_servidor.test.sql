-- Reseñas y calificación (parte 3b): una por paseo, solo de un paseo cerrado y solo de su familia; el nombre lo pone la base;
-- las ve su autora, el paseador reseñado, el equipo y cualquier persona con sesión si el paseador está aprobado; nadie las edita.
-- Se corren con `node supabase/tests/probar_en_pglite.cjs resenas` (sin Docker, sin red) o con `supabase test db`.
begin;
select plan(59);

-- Devuelve «código mensaje» del error que da una consulta (o '' si salió bien).
create function public.test_error(q text) returns text language plpgsql as $$
begin
  execute q;
  return '';
exception when others then
  return SQLSTATE || ' ' || SQLERRM;
end $$;
grant execute on function public.test_error(text) to authenticated;

-- Personas: tres familias (A, B y C), tres paseadores (P y Q aprobados, R sin aprobar) y una persona del equipo.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'familia.a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'familia.b@prueba.local', '{"rol":"familia","nombre_pila":"Rosa"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'familia.c@prueba.local', '{"rol":"familia","nombre_pila":"Camila"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'paseador.q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'paseador.r@prueba.local', '{"rol":"paseador","nombre_pila":"Renzo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';

-- A y B dejaron su apellido y su distrito; C solo su casa (sin apellido).
insert into public.datos_personales (id, apellido, celular, distrito) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Rojas', '987111000', 'San Isidro'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Vega', '987222000', 'Jesús María');
insert into public.casas (familia_id, calle, unidad, distrito) values
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Jr. Cuba', 'Casa 4', 'Jesús María');

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
  ('bbbbbbbb-0000-0000-0000-000000000002', 'plin', '912345678', 'Mateo Rojas'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'yape', '955555555', 'Renzo Vega');

-- Los paseos ya pasaron (los inserta la base de prueba directo; el estado es el que se quiere probar).
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto, estado) values
  ('p-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Lun · 7:00 am', 60, 17.6, 22, 4.4, 17.6, 'cerrado'),
  ('p-2', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Mar · 7:00 am', 60, 17.6, 22, 4.4, 17.6, 'cerrado'),
  ('p-3', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Mié · 7:00 am', 60, 17.6, 22, 4.4, 17.6, 'aceptado'),
  ('p-4', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Luna"}', 'Rosa', 'Mateo', 'Lun · 9:00 am', 60, 20, 25, 5, 20, 'cerrado'),
  ('p-5', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', '{"name":"Luna"}', 'Rosa', 'Renzo', 'Mar · 9:00 am', 60, 16, 20, 4, 16, 'cerrado'),
  ('p-6', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Toby"}', 'Camila', 'Lucía', 'Jue · 8:00 am', 60, 17.6, 22, 4.4, 17.6, 'cerrado'),
  ('p-7', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Max"}', 'Valeria', 'Mateo', 'Vie · 7:00 am', 60, 20, 25, 5, 20, 'cerrado');
-- Todos los paseos cerrados ya están pagados (así nadie queda con un pago pendiente al borrar su cuenta más abajo).
update public.pagos set estado = 'pagado_paseador', pagado_paseador_en = now() where paseo_estado = 'cerrado';

/* ---------------------------------------------------------------- antes de cualquier reseña */
select is((select count(*)::int from public.resenas), 0, 'no hay reseñas todavía');
select is((select resenas_n from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'el paseador P aún no tiene reseñas');
select is((select calificacion from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), null, 'y no tiene calificación (no se inventa)');
select is((select paseos_hechos from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 3, 'pero sí cuenta los paseos que terminó (3 cerrados; el aceptado no cuenta)');
select ok(exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'paseadores_publicos' and column_name = 'dni_ultimos3'), 'la vista pública conserva sus columnas de antes');

/* ---------------------------------------------------------------- A reseña sus paseos */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas, texto, etiquetas, autor, distrito) values ('p-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 5, '  Muy puntual y cariñosa.  ', array['Puntual', 'Cariñoso con mi perro'], 'Otra Persona', 'Jesús María')$$), '', 'la familia reseña su paseo cerrado (aunque mande otro nombre y otro distrito)');
select is(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas, texto) values ('p-2', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 4, 'Todo bien.')$$), '', 'otro paseo con el mismo paseador: otra reseña');
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 1)$$), 5), '23505', 'una sola reseña por paseo: la segunda no entra');
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 1)$$), 5), '42501', 'ni cambiando de paseador: el paseador es el del paseo');
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-3', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 5)$$), 5), '42501', 'no se reseña un paseo que todavía no se cerró');
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-4', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 5)$$), 5), '42501', 'ni el paseo de otra familia');
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-4', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 5)$$), 5), '42501', 'ni a nombre de otra familia');
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-6', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 5)$$), 5), '42501', 'ni un paseo que no es suyo, aunque sea del mismo paseador');
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-7', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 5)$$), 5), '42501', 'ni a otro paseador que el de su paseo (p-7 fue con Mateo)');
-- los límites de la propia reseña
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-7', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 0)$$), 5), '23514', 'cero estrellas no vale');
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-7', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 6)$$), 5), '23514', 'seis estrellas tampoco');
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas, texto) values ('p-7', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 5, repeat('a', 281))$$), 5), '23514', 'el comentario no pasa de 280 letras');
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas, etiquetas) values ('p-7', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 5, array['a','b','c','d','e','f','g','h','i'])$$), 5), '23514', 'ni más de 8 etiquetas');
select is(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas, texto) values ('p-7', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 5, repeat('a', 280))$$), '', 'justo 280 letras sí');
reset role;
-- (esa última es solo para probar el límite: se quita para no cambiar las cuentas de más abajo)
delete from public.resenas where paseo_id = 'p-7';

/* ---------------------------------------------------------------- lo que pone la base */
select is((select autor from public.resenas where paseo_id = 'p-1'), 'Valeria R.', 'el nombre sale de la base (nombre y la inicial del apellido), no de lo que mandó la app');
select is((select distrito from public.resenas where paseo_id = 'p-1'), 'San Isidro', 'el distrito también sale de la base');
select is((select texto from public.resenas where paseo_id = 'p-1'), 'Muy puntual y cariñosa.', 'el comentario se guarda sin espacios de más');
select is((select etiquetas from public.resenas where paseo_id = 'p-1'), array['Puntual', 'Cariñoso con mi perro'], 'y las etiquetas');
select ok((select creado_en from public.resenas where paseo_id = 'p-1') > now() - interval '1 minute', 'la hora la pone la base');

-- C no dejó apellido: sin inicial; su distrito sale de su casa.
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas, texto) values ('p-6', 'aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 4, 'Muy amable.')$$), '', 'otra familia reseña a P');
reset role;
select is((select autor from public.resenas where paseo_id = 'p-6'), 'Camila', 'sin apellido, solo el nombre');
select is((select distrito from public.resenas where paseo_id = 'p-6'), 'Jesús María', 'y el distrito de su casa');

-- B reseña con un paseador sin aprobar.
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas, texto) values ('p-5', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', 2, 'Regular.')$$), '', 'se puede reseñar a quien ya hizo un paseo (aunque hoy no esté aprobado)');
select is(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-4', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 5)$$), '', 'y B reseña a Q');
reset role;

/* ---------------------------------------------------------------- quién no puede crear ni cambiar */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-1', 'bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 5)$$), 5), '42501', 'el paseador no se reseña a sí mismo');
select is(left(public.test_error($$update public.resenas set estrellas = 5, texto = 'Cambio' where paseo_id = 'p-2'$$), 5), '42501', 'el paseador no cambia una reseña que le hicieron');
select is(left(public.test_error($$delete from public.resenas where paseo_id = 'p-2'$$), 5), '42501', 'ni la borra');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(left(public.test_error($$update public.resenas set estrellas = 1 where paseo_id = 'p-1'$$), 5), '42501', 'la autora tampoco edita la suya (no se cambia después de publicada)');
select is(left(public.test_error($$delete from public.resenas where paseo_id = 'p-1'$$), 5), '42501', 'ni la borra');
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(left(public.test_error($$insert into public.resenas (paseo_id, familia_id, paseador_id, estrellas) values ('p-1', 'cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 5)$$), 5), '42501', 'el equipo no escribe reseñas');
select is(left(public.test_error($$update public.resenas set estrellas = 5 where paseo_id = 'p-2'$$), 5), '42501', 'ni las cambia');
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select is(left(public.test_error($$select * from public.resenas$$), 5), '42501', 'sin sesión no se lee nada');
reset role;

/* ---------------------------------------------------------------- quién las ve */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.resenas), 4, 'A ve las suyas (2) y las de otras familias sobre paseadores aprobados (C→P y B→Q), no la de B sobre Renzo (sin aprobar)');
select is((select count(*)::int from public.resenas where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000003'), 0, 'la reseña de un paseador sin aprobar no se ve');
select is((select autor from public.resenas where paseo_id = 'p-4'), 'Rosa V.', 'A ve que la reseña de Q la escribió «Rosa V.» (el nombre público)');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.resenas where paseo_id = 'p-5'), 1, 'B sí ve la suya sobre Renzo (es su autora)');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.resenas where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 3, 'P ve las 3 reseñas que le hicieron');
select is((select count(*)::int from public.resenas where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 1, 'P también ve la de Q: es pública porque Q está aprobado');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.resenas where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000003'), 1, 'Renzo (sin aprobar) sí ve la que le hicieron a él');
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.resenas), 5, 'el equipo ve todas');
reset role;

/* ---------------------------------------------------------------- la calificación sale de las reseñas */
-- P: 5, 4 y 4 → promedio 4,3 con 3 reseñas; Q: 5 con 1 reseña; Renzo no está en la vista.
select is((select resenas_n from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 3, 'P tiene 3 reseñas');
select is((select calificacion from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 4.3, 'y su calificación es el promedio con una decimal (4,3)');
select is((select calificacion from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 5.0, 'Q tiene 5,0 con una reseña');
select is((select paseos_hechos from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 2, 'y 2 paseos terminados (p-4 y p-7)');
select is((select count(*)::int from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000003'), 0, 'un paseador sin aprobar sigue sin salir en la vista');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select calificacion from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 4.3, 'cualquier familia con sesión ve la calificación en la vista pública');
reset role;

/* ---------------------------------------------------------------- si una persona se va, se van sus reseñas */
delete from public.paseos where id = 'p-3';
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.borrar_mi_cuenta() ->> 'borrada', 'true', 'la familia A borra su cuenta (ya no tiene el paseo sin cerrar)');
reset role;
select is((select count(*)::int from public.resenas where familia_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'sus reseñas se fueron con ella');
select is((select resenas_n from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 1, 'P quedó con la de Camila');
select is((select calificacion from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 4.0, 'y su calificación se recalcula (4,0)');
select is((select paseos_hechos from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 3, 'los paseos que terminó se siguen contando (el registro queda sin el nombre de A)');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.borrar_mi_cuenta() ->> 'borrada', 'true', 'el paseador Q borra su cuenta (sus pagos ya están pagados)');
reset role;
select is((select count(*)::int from public.resenas where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 0, 'las reseñas que le hicieron se fueron con él');
select is((select count(*)::int from public.resenas), 2, 'quedan las de B sobre Renzo y la de Camila sobre P');

select * from finish();
rollback;
