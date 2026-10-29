-- Pruebas de «quién ve qué» (pgTAP). Se corren con `supabase test db` cuando exista el proyecto local
-- (hace falta Docker y la herramienta de Supabase: hoy NO están instalados, así que NO se han corrido).
-- Cada prueba entra como una persona distinta y comprueba lo que ve o lo que no puede hacer.
begin;
select plan(37);

-- Personas de prueba (como postgres). El disparador les crea su perfil.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'familia.a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'familia.b@prueba.local', '{"rol":"familia","nombre_pila":"Rosa"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'paseador.q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"equipo","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');

-- Quien pide «equipo» al registrarse queda como familia. Solo se pone a mano:
select is((select rol::text from public.perfiles where id = 'cccccccc-0000-0000-0000-000000000001'), 'familia', 'pedir el rol «equipo» al registrarse no lo da');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';

-- Datos de partida (como postgres)
insert into public.casas (familia_id, calle, distrito, lat, lng, emergencia_nombre, emergencia_telefono)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Calle Los Cedros 245', 'San Isidro', -12.09993, -77.03739, 'Marta', '999111222');
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'activo', 'Mateo', 'Rojas');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values
  ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true),
  ('bbbbbbbb-0000-0000-0000-000000000002', true, true, true, true, true);
insert into public.datos_dni (paseador_id, dni) values ('bbbbbbbb-0000-0000-0000-000000000001', '12345678');
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'plin', '912345678', 'Mateo Rojas');
insert into public.perros (id, familia_id, nombre, tamano) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Max', 'large');

/* ---- sin sesión no se ve nada */
set local role anon;
select throws_ok($$select * from public.paseos$$, '42501', null, 'sin sesión: no hay permiso sobre los paseos');
select throws_ok($$select * from public.pagos$$, '42501', null, 'sin sesión: no hay permiso sobre los pagos');
select throws_ok($$select * from public.paseadores_publicos$$, '42501', null, 'sin sesión: tampoco la vista pública');
reset role;

/* ---- la familia A crea un paseo con la paseadora P (que está aprobada) */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min,
        pago_paseador, monto, comision, neto)
    values ('paseo-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
            'dddddddd-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 20, 25, 5, 20)$$,
  'la familia crea un paseo con un paseador aprobado');
select lives_ok($$insert into public.codigos_recojo (paseo_id, codigo) values ('paseo-1', '4827')$$, 'la familia guarda el código de recojo');
select is((select count(*)::int from public.pagos where paseo_id = 'paseo-1'), 1, 'al crear el paseo nace su pago (lo ve su familia)');
select is((select estado::text from public.pagos where paseo_id = 'paseo-1'), 'sin_pagar', 'y empieza «sin_pagar»');
select throws_ok(
  $$update public.pagos set estado = 'pagado_paseador' where paseo_id = 'paseo-1'$$, '42501', null, 'la familia no escribe en los pagos directo');

/* ---- la familia B no ve nada de la familia A */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.paseos), 0, 'familia B: no ve los paseos de la familia A');
select is((select count(*)::int from public.pagos), 0, 'familia B: no ve los pagos de la familia A');
select is((select count(*)::int from public.casas), 0, 'familia B: no ve la casa de la familia A');
select is((select count(*)::int from public.perros), 0, 'familia B: no ve los perros de la familia A');
select is((select count(*)::int from public.codigos_recojo), 0, 'familia B: no ve el código de recojo');

/* ---- la familia no ve el Yape ni el DNI; sí ve la vista pública con 3 dígitos */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.cobros_paseador), 0, 'familia: no ve el Yape ni el Plin del paseador');
select is((select count(*)::int from public.datos_dni), 0, 'familia: no ve el DNI completo');
select is((select dni_ultimos3 from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), '678', 'familia: en la vista pública solo los últimos 3 dígitos');
select is((select count(*)::int from public.postulaciones), 0, 'familia: no ve las postulaciones');
select is((select count(*)::int from public.datos_personales where id = 'bbbbbbbb-0000-0000-0000-000000000001'), 0, 'familia: no ve el celular del paseador');

/* ---- el paseador antes de aceptar: no ve la casa, el perro completo ni el código */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.paseos where id = 'paseo-1'), 1, 'paseador: ve su solicitud');
select is((select count(*)::int from public.casas), 0, 'paseador: antes de aceptar no ve la casa');
select is((select count(*)::int from public.perros), 0, 'paseador: antes de aceptar no ve la ficha completa del perro');
select is((select count(*)::int from public.codigos_recojo), 0, 'paseador: no lee el código de recojo');
select is((select count(*)::int from public.datos_dni), 0, 'paseador: no puede volver a leer el DNI');
select throws_ok($$select public.mover_pago('paseo-1', 'pagar_al_paseador')$$, '42501', null, 'paseador: no se paga a sí mismo');
select throws_ok($$select public.mover_pago('paseo-1', 'ver_pago')$$, '22023', null, 'paseador: antes de que termine el paseo no hay pago que ver');

/* ---- el paseador acepta: ahora sí ve la casa; el código se comprueba sin leerlo */
select lives_ok($$update public.paseos set estado = 'aceptado' where id = 'paseo-1'$$, 'paseador: acepta el paseo');
select is((select count(*)::int from public.casas), 1, 'paseador: después de aceptar ve la casa');
select is(public.verificar_codigo_recojo('paseo-1', '0000'), false, 'código equivocado: false');
select is(public.verificar_codigo_recojo('paseo-1', '4827'), true, 'código correcto: true');
select throws_ok($$update public.paseos set estado = 'cerrado' where id = 'paseo-1'$$, '22023', null, 'paseador: no salta estados que no existen');

/* ---- nadie se pone «equipo» solo */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$update public.perfiles set rol = 'equipo' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '42501', null, 'nadie se pone el rol «equipo» solo');

/* ---- el equipo ve todo, pero no cambia mensajes ajenos */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.mensajes (id, paseo_id, de, texto) values ('m1', 'paseo-1', 'owner', 'Hola')$$, 'familia: escribe en el chat de su paseo');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.paseos), 1, 'equipo: ve los paseos');
select is((select count(*)::int from public.datos_dni), 1, 'equipo: ve el DNI completo');
select is((select count(*)::int from public.mensajes), 1, 'equipo: lee los mensajes');
select throws_ok($$update public.mensajes set texto = 'cambiado' where id = 'm1'$$, '42501', null, 'equipo: no cambia mensajes ajenos');

reset role;
select * from finish();
rollback;
