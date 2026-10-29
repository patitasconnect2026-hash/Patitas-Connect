-- Pruebas de los paseos en el servidor (paso 6a del plan): lo que la app hace con la sesión de cada persona.
-- Se corren con `node supabase/tests/probar_en_pglite.cjs paseos` (sin Docker, sin red) o con `supabase test db`.
-- Cada bloque entra como una persona distinta, igual que lo hará la app (nunca con la clave de servicio).
begin;
select plan(87);

-- Una ayuda solo para estas pruebas: cuántas filas tocó una instrucción (con las reglas de quien la corre).
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

insert into public.casas (familia_id, calle, unidad, distrito, lat, lng, hay_portero, nombre_portero, emergencia_nombre, emergencia_telefono) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Calle Los Cedros 245', 'Dpto 301', 'San Isidro', -12.09993, -77.03739, true, 'Don Julio', 'Marta', '999111222'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Av. Brasil 1500', '', 'Jesús María', -12.0700, -77.0500, false, '', '', '');
insert into public.perros (id, familia_id, nombre, tamano, notas, medico, veterinario) values
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Max', 'large', 'Le asusta el ruido', 'Alergia al pollo', 'Vet Los Pinos'),
  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Luna', 'small', '', '', '');

insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, perfil) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe', '{"rate": 22}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'supervisado', 'Mateo', 'Rojas', '{"rate": 25}'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'PAT-R', 'enviada', 'Renzo', 'Vega', '{"rate": 20}');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values
  ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true),
  ('bbbbbbbb-0000-0000-0000-000000000002', true, true, true, true, true),
  ('bbbbbbbb-0000-0000-0000-000000000003', true, false, false, false, false);
insert into public.datos_dni (paseador_id, dni) values ('bbbbbbbb-0000-0000-0000-000000000001', '12345678');
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'plin', '912345678', 'Mateo Rojas');

/* ---- la lista de paseadores que ve una familia: solo los aprobados, con los últimos 3 dígitos y sin «verificado» */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.paseadores_publicos), 2, 'la familia ve solo los 2 paseadores aprobados');
select is((select count(*)::int from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000003'), 0, 'el paseador sin aprobar no sale en la lista');
select is((select dni_ultimos3 from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), '678', 'la familia ve solo los últimos 3 dígitos del DNI');
select is((select array_length(comprobaciones, 1) from public.paseadores_publicos where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'), 5, 'la lista trae las 5 casillas del equipo (la sexta se deduce de los paseos acompañados)');

/* ---- la familia A pide un paseo a la paseadora P */
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min,
        entrega, perros_en_grupo, tamano_grupo, pago_paseador, monto, comision, neto, reserva, distrito)
    values ('p-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
            'dddddddd-0000-0000-0000-000000000001', '{"name":"Max","breed":"Labrador","size":"large"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60,
            'doorman', 0, 'large', 17.6, 22, 4.4, 17.6, '{"walkPrice":22,"total":22}', 'San Isidro')$$,
  'la familia pide un paseo a una paseadora aprobada');
select lives_ok($$insert into public.codigos_recojo (paseo_id, codigo) values ('p-1', '4827')$$, 'la familia guarda el código de recojo de ese paseo');
select throws_ok($$insert into public.codigos_recojo (paseo_id, codigo) values ('p-1', '1111')$$, '23505', null, 'el código de un paseo no se repite (un segundo intento no lo cambia)');
select is((select count(*)::int from public.pagos where paseo_id = 'p-1'), 1, 'al crear el paseo nace su pago, sin que la app lo escriba');
select is((select quien from public.paseo_eventos where paseo_id = 'p-1' and accion = 'solicitar'), 'dueno', 'y su primer evento «solicitar» queda a nombre del dueño');
select throws_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('p-x1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', '{"name":"Max"}', 'Valeria', 'Renzo', 'Hoy', 60, 16, 20, 4, 16)$$,
  '42501', null, 'no se puede pedir un paseo a un paseador que el equipo no aprobó');
select throws_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('p-x2', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Luna"}', 'Rosa', 'Lucía', 'Hoy', 60, 16, 20, 4, 16)$$,
  '42501', null, 'una familia no pide paseos a nombre de otra');
select throws_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, estado, pago_paseador, monto, comision, neto)
    values ('p-x3', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy', 60, 'aceptado', 16, 20, 4, 16)$$,
  '42501', null, 'un paseo nuevo nace «solicitado»: no se puede crear ya aceptado');
select throws_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('p-x4', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy', 60, 16, 20, 9, 16)$$,
  '23514', null, 'los montos tienen que sumar: monto = comisión + lo que recibe el paseador');

/* ---- quién ve el paseo antes de que nadie haga nada */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.paseos), 0, 'familia B: no ve los paseos de la familia A');
select is((select count(*)::int from public.paseo_eventos), 0, 'familia B: no ve el registro del paseo de A');
select is((select count(*)::int from public.codigos_recojo), 0, 'familia B: no ve el código de recojo de A');
select is(public.test_filas($$update public.paseos set estado = 'cancelado' where id = 'p-1'$$), 0, 'familia B: no puede cambiar el paseo de A (0 filas)');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.paseos), 0, 'paseador Q: no ve los paseos de la paseadora P');
select is(public.test_filas($$update public.paseos set estado = 'aceptado' where id = 'p-1'$$), 0, 'paseador Q: no puede aceptar el paseo de P (0 filas)');
select is(public.verificar_codigo_recojo('p-1', '4827'), false, 'paseador Q: el código no le sirve en un paseo que no es suyo');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.paseos where id = 'p-1'), 1, 'paseadora P: ve su solicitud');
select is((select count(*)::int from public.paseo_eventos where paseo_id = 'p-1'), 1, 'paseadora P: ve el registro de su solicitud');
select is((select pago_paseador::numeric from public.paseos where id = 'p-1'), 17.6::numeric, 'paseadora P: ve cuánto recibe');
select is((select count(*)::int from public.codigos_recojo), 0, 'paseadora P: no lee el código de recojo (nunca)');
select is((select count(*)::int from public.casas), 0, 'paseadora P: antes de aceptar no ve la dirección');
select is((select count(*)::int from public.perros), 0, 'paseadora P: antes de aceptar no ve la ficha del perro');
select is(public.verificar_codigo_recojo('p-1', '4827'), false, 'paseadora P: antes de aceptar el código no se puede comprobar');

/* ---- estados que no existen o que no le tocan a esa persona */
select throws_ok($$update public.paseos set estado = 'cerrado' where id = 'p-1'$$, '22023', null, 'una transición que no existe se rechaza (solicitado → cerrado)');
select throws_ok($$update public.paseos set estado = 'en_camino' where id = 'p-1'$$, '22023', null, 'no se puede salir sin aceptar (solicitado → en camino)');
select throws_ok($$update public.paseos set estado = 'en_paseo' where id = 'p-1'$$, '22023', null, 'no se puede recoger sin aceptar ni salir');
select throws_ok($$update public.paseos set monto = 99 where id = 'p-1'$$, '42501', null, 'el paseador no cambia los montos del paseo');
select throws_ok($$update public.paseos set paseador_id = 'bbbbbbbb-0000-0000-0000-000000000002' where id = 'p-1'$$, '42501', null, 'el paseo no se reasigna a otro paseador por la base');
select is(public.test_filas($$update public.paseos set estado = 'aceptado' where id = 'p-1' and estado = 'rechazado'$$), 0, 'si el estado ya no es el que se esperaba, no cambia nada (0 filas)');

/* ---- la familia no puede aceptar por la paseadora; la paseadora acepta */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$update public.paseos set estado = 'aceptado' where id = 'p-1'$$, '42501', null, 'la familia no acepta por el paseador');
select is((select codigo from public.codigos_recojo where paseo_id = 'p-1'), '4827', 'la familia sí lee su código de recojo');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_filas($$update public.paseos set estado = 'aceptado' where id = 'p-1' and estado = 'solicitado'$$), 1, 'la paseadora acepta la solicitud (1 fila)');
select is((select estado::text from public.paseos where id = 'p-1'), 'aceptado', 'el paseo queda «aceptado»');
select ok((select aceptado_en from public.paseos where id = 'p-1') is not null, 'queda la hora en que se aceptó');
select is((select quien from public.paseo_eventos where paseo_id = 'p-1' and accion = 'aceptar'), 'paseador', 'el registro dice que aceptó el paseador');
select is((select paseo_estado::text from public.pagos where paseo_id = 'p-1'), 'aceptado', 'el pago anota cómo va el paseo');
select is((select calle from public.casas), 'Calle Los Cedros 245', 'ahora la paseadora sí ve la dirección de esa familia');
select is((select count(*)::int from public.casas), 1, 'y solo la de esa familia');
select is((select notas from public.perros), 'Le asusta el ruido', 'ahora sí ve la ficha del perro de ese paseo');
select is((select count(*)::int from public.perros), 1, 'y solo el perro de ese paseo');
select is((select count(*)::int from public.codigos_recojo), 0, 'aun aceptado, no lee el código de recojo');

/* ---- el código de recojo: la base lo compara, el paseador nunca lo lee */
select is(public.verificar_codigo_recojo('p-1', '0000'), false, 'código equivocado: false');
select is(public.verificar_codigo_recojo('p-1', '4827'), true, 'código correcto: true');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.casas), 0, 'paseador Q: tampoco ve la dirección cuando otra paseadora aceptó');

/* ---- el recorrido hasta cerrar, con los actores que anota la base */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.paseos set estado = 'en_camino' where id = 'p-1' and estado = 'aceptado'$$, 'sale a recoger al perro');
select lives_ok($$update public.paseos set estado = 'en_paseo' where id = 'p-1' and estado = 'en_camino'$$, 'recoge al perro');
select lives_ok($$insert into public.paseo_eventos (paseo_id, accion, de, a, quien, aviso, nota) values ('p-1', 'avisar', 'en_paseo', 'en_paseo', 'sistema', 'salida', 'Salió de la zona')$$, 'la app deja un aviso de ubicación en el registro');
select throws_ok($$insert into public.paseo_eventos (paseo_id, accion, de, a, quien) values ('p-1', 'avisar', 'en_paseo', 'en_paseo', 'paseador')$$, '42501', null, 'un aviso solo lo deja «el sistema», no una persona a su nombre');
select throws_ok($$insert into public.paseo_eventos (paseo_id, accion, de, a, quien) values ('p-1', 'confirmar_entrega', 'entregado', 'entregado', 'dueno')$$, '42501', null, 'el paseador no confirma la entrega por el dueño');
select lives_ok($$insert into public.bitacora (id, paseo_id, tipo, texto) values ('b-1', 'p-1', 'pee', 'Max hizo pipí')$$, 'el paseador anota en la bitácora de su paseo');
select throws_ok($$update public.bitacora set texto = 'otro' where id = 'b-1'$$, '42501', null, 'la bitácora no se edita');
select lives_ok($$update public.paseos set estado = 'entregado' where id = 'p-1' and estado = 'en_paseo'$$, 'entrega al perro');
select throws_ok($$update public.paseos set estado = 'cerrado' where id = 'p-1' and estado = 'entregado'$$, '42501', null, 'el paseo no se cierra mientras el dueño no confirme la entrega');

reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.bitacora where paseo_id = 'p-1'), 1, 'la familia ve la bitácora que anotó la paseadora');
select lives_ok($$insert into public.paseo_eventos (paseo_id, accion, de, a, quien) values ('p-1', 'confirmar_entrega', 'entregado', 'entregado', 'dueno')$$, 'el dueño confirma que recibió a su perro');
select lives_ok($$update public.paseos set estado = 'cerrado' where id = 'p-1' and estado = 'entregado'$$, 'y entonces el paseo se cierra');
select throws_ok($$update public.paseos set estado = 'aceptado' where id = 'p-1'$$, '22023', null, 'un paseo cerrado no vuelve a moverse');
select is((select string_agg(accion || ':' || quien, ' > ' order by id) from public.paseo_eventos where paseo_id = 'p-1'),
          'solicitar:dueno > aceptar:paseador > salir:paseador > recoger:paseador > avisar:sistema > entregar:paseador > confirmar_entrega:dueno > cerrar:sistema',
          'el registro quedó en orden y con el autor de cada paso');
select ok((select hecho_en from public.pagos where paseo_id = 'p-1') is not null, 'el pago anotó cuándo se hizo el paseo');
select throws_ok($$update public.pagos set estado = 'pagado_paseador' where paseo_id = 'p-1'$$, '42501', null, 'la familia no escribe en los pagos');

-- Con un pago pendiente la base no deja pedir otro paseo (se prueba en integridad.test.sql). Aquí el pago de p-1 se salda aparte,
-- como lo haría el equipo, para seguir con los demás casos.
reset role;
update public.pagos set estado = 'pagado_paseador' where paseo_id = 'p-1';
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;

/* ---- una paseadora rechaza: el paseo queda «rechazado» y de ahí no sale */
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('p-2', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Mañana · 9:00 am', 60, 17.6, 22, 4.4, 17.6)$$,
  'la familia pide otro paseo (después del primero)');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.paseos set estado = 'rechazado' where id = 'p-2' and estado = 'solicitado'$$, 'la paseadora rechaza la solicitud');
select is((select quien from public.paseo_eventos where paseo_id = 'p-2' and accion = 'rechazar'), 'paseador', 'el registro dice que rechazó la paseadora');
select throws_ok($$update public.paseos set estado = 'aceptado' where id = 'p-2'$$, '22023', null, 'una solicitud rechazada no se puede aceptar después');
select is((select count(*)::int from public.casas), 0, 'rechazado: la paseadora ya no ve la dirección');

reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select estado::text from public.paseos where id = 'p-2'), 'rechazado', 'la familia ve que la rechazaron (y de ahí pide a otra persona)');
select throws_ok($$update public.paseos set estado = 'cancelado' where id = 'p-2'$$, '22023', null, 'tampoco se cancela lo que ya no existe');

/* ---- vence el plazo, la familia cancela, la paseadora cancela */
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto) values
      ('p-3', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Max"}', 'Valeria', 'Mateo', 'Hoy', 60, 20, 25, 5, 20),
      ('p-4', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Max"}', 'Valeria', 'Mateo', 'Hoy', 60, 20, 25, 5, 20),
      ('p-5', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Max"}', 'Valeria', 'Mateo', 'Hoy', 60, 20, 25, 5, 20)$$,
  'la familia pide tres solicitudes más a Mateo');
select lives_ok($$update public.paseos set estado = 'expirado' where id = 'p-3' and estado = 'solicitado'$$, 'vence el plazo (lo hace «el sistema», también desde la app de la familia)');
select is((select quien from public.paseo_eventos where paseo_id = 'p-3' and accion = 'expirar'), 'sistema', 'el vencimiento queda a nombre del sistema');
select lives_ok($$update public.paseos set estado = 'cancelado' where id = 'p-4' and estado = 'solicitado'$$, 'la familia cancela la solicitud');
select is((select quien from public.paseo_eventos where paseo_id = 'p-4' and accion = 'cancelar'), 'dueno', 'la cancelación queda a nombre del dueño');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.paseos set estado = 'aceptado' where id = 'p-5' and estado = 'solicitado'$$, 'Mateo acepta p-5');
select lives_ok($$update public.paseos set estado = 'cancelado' where id = 'p-5' and estado = 'aceptado'$$, 'y después cancela él');
select is((select quien from public.paseo_eventos where paseo_id = 'p-5' and accion = 'cancelar'), 'paseador', 'esa cancelación queda a nombre del paseador (así la familia ve la reasignación)');
select lives_ok($$update public.paseos set cerrado_paseador = true where id = 'p-5'$$, 'el paseador cierra el paseo en su pantalla (el paseo sigue para la familia)');

/* ---- reporte: pasa a «en disputa», el equipo ve todo y lo resuelve */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
    values ('p-6', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy', 60, 17.6, 22, 4.4, 17.6)$$,
  'la familia pide un paseo más (p-6)');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.paseos set estado = 'aceptado' where id = 'p-6' and estado = 'solicitado'$$, 'Lucía acepta p-6');
select lives_ok(
  $$update public.paseos set estado = 'en_disputa', reporte = '{"quien":"paseador","motivo":"trato","texto":"Hubo un problema"}'::jsonb where id = 'p-6' and estado = 'aceptado'$$,
  'la paseadora reporta un problema: el paseo pasa a «en disputa» con su reporte');
select is((select reporte ->> 'motivo' from public.paseos where id = 'p-6'), 'trato', 'el reporte queda guardado en el paseo');

reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.paseos), 6, 'el equipo ve los 6 paseos de todos');
select lives_ok($$update public.paseos set estado = 'cerrado' where id = 'p-6' and estado = 'en_disputa'$$, 'el equipo resuelve el reporte');
select is((select quien from public.paseo_eventos where paseo_id = 'p-6' and accion = 'resolver'), 'sistema', 'y queda a nombre del sistema');

reset role;
select * from finish();
rollback;
