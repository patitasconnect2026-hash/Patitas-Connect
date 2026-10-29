-- Pruebas de las fotos en el servidor (paso 8 del plan): quién sube, quién ve y quién borra, tanto los DATOS (tabla `fotos`)
-- como las IMÁGENES (almacén privado `storage.objects`). Se corren con `node supabase/tests/probar_en_pglite.cjs fotos`
-- (sin Docker, sin red) o con `supabase test db`. Cada bloque entra como una persona distinta, igual que la app.
-- El tamaño (1 MB) y el tipo de archivo los exige la API de Storage, no una regla de fila: se prueban en
-- lib/servidor/fotos.escenarios.test.ts (aquí solo se comprueba que el bucket los declara).
begin;
select plan(69);

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
  ('aaaaaaaa-0000-0000-0000-000000000002', 'familia.b@prueba.local', '{"rol":"familia","nombre_pila":"Rosa"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'paseador.q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, perfil) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe', '{"rate": 22}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'activo', 'Mateo', 'Rojas', '{"rate": 25}');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen) values
  ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true),
  ('bbbbbbbb-0000-0000-0000-000000000002', true, true, true, true, true);
insert into public.cobros_paseador (paseador_id, metodo, celular, titular) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'yape', '987654321', 'Lucía Quispe'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'plin', '912345678', 'Mateo Rojas');

-- El bucket declara el tope de 1 MB y solo imágenes (lo hace cumplir la API de Storage).
select is((select file_size_limit from storage.buckets where id = 'fotos'), 1048576::bigint, 'el almacén de fotos recibe archivos de hasta 1 MB');
select is((select public from storage.buckets where id = 'fotos'), false, 'el almacén de fotos es PRIVADO (nada tiene dirección pública)');
select is((select allowed_mime_types from storage.buckets where id = 'fotos'), array['image/jpeg', 'image/png', 'image/webp'], 'y solo acepta imágenes');

/* ---- dos paseos: A con P y B con Q ---- */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto) values
  ('p-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6);
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto) values
  ('p-2', 'aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '{"name":"Luna"}', 'Rosa', 'Mateo', 'Hoy · 11:00 am', 60, 20, 25, 5, 20);

/* ---- quién sube la IMAGEN (reglas de storage.objects) ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'paseo/p-1/a.jpg', 'bbbbbbbb-0000-0000-0000-000000000001')$$, 'paseadora P: sube una imagen a la carpeta de SU paseo');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'paseo/p-2/a.jpg', 'bbbbbbbb-0000-0000-0000-000000000001')$$, '42501', null, 'paseadora P: no sube a la carpeta del paseo de otro paseador');
select lives_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'hoy/bbbbbbbb-0000-0000-0000-000000000001/a.jpg', 'bbbbbbbb-0000-0000-0000-000000000001')$$, 'paseadora P: sube su foto de hoy a SU carpeta');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'hoy/bbbbbbbb-0000-0000-0000-000000000002/a.jpg', 'bbbbbbbb-0000-0000-0000-000000000001')$$, '42501', null, 'paseadora P: no sube a la carpeta de foto de hoy de otro paseador');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'otra/cosa.jpg', 'bbbbbbbb-0000-0000-0000-000000000001')$$, '42501', null, 'paseadora P: no sube a una carpeta que no existe en las reglas');
select lives_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'chat/p-1/m1.jpg', 'bbbbbbbb-0000-0000-0000-000000000001')$$, 'paseadora P: sube una imagen del chat de SU paseo (la regla del chat)');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('otro', 'paseo/p-1/z.jpg', 'bbbbbbbb-0000-0000-0000-000000000001')$$, '42501', null, 'paseadora P: no sube a otro almacén');

reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'paseo/p-1/q.jpg', 'bbbbbbbb-0000-0000-0000-000000000002')$$, '42501', null, 'paseador Q: no sube imágenes al paseo de P');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'chat/p-1/q.jpg', 'bbbbbbbb-0000-0000-0000-000000000002')$$, '42501', null, 'paseador Q: tampoco al chat del paseo de P');

reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'paseo/p-1/familia.jpg', 'aaaaaaaa-0000-0000-0000-000000000001')$$, '42501', null, 'familia A: no sube fotos del paseo (las toma el paseador con la cámara de la app)');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'hoy/aaaaaaaa-0000-0000-0000-000000000001/f.jpg', 'aaaaaaaa-0000-0000-0000-000000000001')$$, '42501', null, 'familia A: no tiene foto de hoy');
select lives_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'chat/p-1/m2.jpg', 'aaaaaaaa-0000-0000-0000-000000000001')$$, 'familia A: sí sube una imagen al chat de SU paseo');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'chat/p-1/b.jpg', 'aaaaaaaa-0000-0000-0000-000000000002')$$, '42501', null, 'familia B: no sube al chat del paseo de A');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'paseo/p-2/b.jpg', 'aaaaaaaa-0000-0000-0000-000000000002')$$, '42501', null, 'familia B: no sube fotos de su propio paseo');
reset role;
select set_config('request.jwt.claims', 'null', true);
set local role anon;
select throws_ok($$insert into storage.objects (bucket_id, name) values ('fotos', 'paseo/p-1/anon.jpg')$$, '42501', null, 'sin sesión: no se sube nada');
select throws_ok($$select count(*) from storage.objects$$, '42501', null, 'sin sesión: ni se puede consultar el almacén');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'paseo/p-1/equipo.jpg', 'cccccccc-0000-0000-0000-000000000001')$$, '42501', null, 'equipo: tampoco sube imágenes (solo las ve)');

/* ---- quién ve la IMAGEN: solo con una fila de `fotos` que la persona pueda ver (o el chat de su paseo) ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from storage.objects where name = 'paseo/p-1/a.jpg'), 0, 'una imagen sin su fila de datos no la ve la familia (todavía)');
select is((select count(*)::int from storage.objects where name in ('chat/p-1/m1.jpg', 'chat/p-1/m2.jpg')), 2, 'pero las imágenes del chat de su paseo sí (los dos del paseo)');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from storage.objects), 4, 'equipo: ve todas las imágenes');

/* ---- quién guarda los DATOS de la foto (tabla fotos) ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.fotos (id, tipo, paseo_id, paseador_id, en, codigo, lat, lng, bytes, ruta)
  values ('dddddddd-0000-0000-0000-000000000001', 'paseo', 'p-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), '47', -12.1, -77.03, 2048, 'paseo/p-1/a.jpg')$$, 'paseadora P: guarda los datos de su foto (hora, lugar y código)');
select is((select vence_en > now() + interval '6 days 23 hours' and vence_en < now() + interval '7 days 1 hour' from public.fotos where id = 'dddddddd-0000-0000-0000-000000000001'), true, 'la foto vence a los 7 días (lo pone la base)');
select throws_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, codigo, ruta) values ('paseo', 'p-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), '47', 'paseo/p-1/a.jpg')$$, '23505', null, 'la misma ruta no se guarda dos veces');
select throws_ok($$insert into public.fotos (id, tipo, paseo_id, paseador_id, en, codigo, ruta) values ('dddddddd-0000-0000-0000-000000000001', 'paseo', 'p-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), '47', 'paseo/p-1/otra.jpg')$$, '23505', null, 'el mismo id no se guarda dos veces: un reintento no duplica la foto');
select throws_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, codigo, ruta) values ('paseo', 'p-2', 'bbbbbbbb-0000-0000-0000-000000000001', now(), '47', 'paseo/p-2/x.jpg')$$, '42501', null, 'paseadora P: no guarda datos de fotos del paseo de otro paseador');
select throws_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, codigo, ruta) values ('paseo', 'p-1', 'bbbbbbbb-0000-0000-0000-000000000002', now(), '47', 'paseo/p-1/suplanta.jpg')$$, '42501', null, 'paseadora P: no guarda una foto a nombre de otro paseador');
select throws_ok($$insert into public.fotos (tipo, paseador_id, en, ruta) values ('paseo', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/sin-paseo.jpg')$$, '42501', null, 'una foto del paseo sin paseo se rechaza');
select throws_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, dia, en, ruta) values ('hoy', 'p-1', 'bbbbbbbb-0000-0000-0000-000000000001', current_date, now(), 'hoy/x/con-paseo.jpg')$$, '23514', null, 'una foto de hoy con paseo se rechaza (no es de ningún paseo)');
select throws_ok($$insert into public.fotos (tipo, paseador_id, en, ruta) values ('hoy', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'hoy/x/sin-dia.jpg')$$, '23514', null, 'una foto de hoy sin día se rechaza');
select lives_ok($$insert into public.fotos (id, tipo, paseador_id, dia, en, bytes, ruta)
  values ('dddddddd-0000-0000-0000-000000000002', 'hoy', 'bbbbbbbb-0000-0000-0000-000000000001', current_date, now(), 500, 'hoy/bbbbbbbb-0000-0000-0000-000000000001/a.jpg')$$, 'paseadora P: guarda los datos de su foto de hoy');
select throws_ok($$insert into public.fotos (tipo, paseador_id, dia, en, ruta) values ('hoy', 'bbbbbbbb-0000-0000-0000-000000000001', current_date, now(), 'hoy/bbbbbbbb-0000-0000-0000-000000000001/b.jpg')$$, '23505', null, 'una sola foto de hoy por día (para cambiarla hay que borrar la anterior)');
select throws_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, sin_ubicacion) values ('paseo', 'p-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/p-1/m.jpg', 'inventada')$$, '23514', null, 'el motivo de «sin ubicación» tiene que ser uno de los conocidos');
select throws_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta) values ('paseo', 'p-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/p-2/de-otro.jpg')$$, '23514', null, 'la ruta de una foto de un paseo tiene que ser de ESE paseo (no se puede apuntar a la imagen de otro y así verla)');
select throws_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta) values ('paseo', 'p-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'chat/p-1/m1.jpg')$$, '23514', null, 'ni a una carpeta que no es la de las fotos del paseo');
select throws_ok($$insert into public.fotos (tipo, paseador_id, dia, en, ruta) values ('hoy', 'bbbbbbbb-0000-0000-0000-000000000001', current_date - 1, now(), 'hoy/bbbbbbbb-0000-0000-0000-000000000002/de-otro.jpg')$$, '23514', null, 'la ruta de una foto de hoy tiene que estar en la carpeta de ESE paseador');

reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta) values ('paseo', 'p-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/p-1/de-familia.jpg')$$, '42501', null, 'familia A: no guarda datos de fotos (ni de su propio paseo)');

/* ---- quién ve los DATOS ---- */
select is((select count(*)::int from public.fotos where tipo = 'paseo'), 1, 'familia A: ve la foto de SU paseo');
select is((select codigo from public.fotos where tipo = 'paseo'), '47', 'y con su código');
select is((select count(*)::int from public.fotos where tipo = 'hoy'), 0, 'familia A: todavía no ve la foto de hoy de P (el paseo sigue «solicitado»)');
select is((select count(*)::int from storage.objects where name = 'paseo/p-1/a.jpg'), 1, 'ahora que tiene su fila de datos, la familia A ve la imagen en el almacén');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.fotos), 0, 'familia B: no ve ninguna foto de A');
select is((select count(*)::int from storage.objects where name in ('paseo/p-1/a.jpg', 'hoy/bbbbbbbb-0000-0000-0000-000000000001/a.jpg')), 0, 'familia B: tampoco las imágenes de A ni la foto de hoy de P');
select is((select count(*)::int from storage.objects), 0, 'familia B: el almacén le aparece vacío');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.fotos), 0, 'paseador Q: no ve las fotos de P (ni la de hoy)');
select is((select count(*)::int from storage.objects), 0, 'paseador Q: tampoco las imágenes');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.fotos), 2, 'paseadora P: ve las dos que guardó (la del paseo y la de hoy)');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.fotos), 2, 'equipo: ve todas las fotos');
reset role;
select set_config('request.jwt.claims', 'null', true);
set local role anon;
select throws_ok($$select count(*) from public.fotos$$, '42501', null, 'sin sesión: la tabla de fotos no se puede ni consultar');

/* ---- la foto de hoy: la ve la familia con un paseo aceptado ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$update public.paseos set estado = 'aceptado' where id = 'p-1' and estado = 'solicitado'$$, 'P acepta el paseo de A');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.fotos where tipo = 'hoy'), 1, 'familia A: con el paseo aceptado, ve la foto de hoy de P');
select is((select count(*)::int from storage.objects where name = 'hoy/bbbbbbbb-0000-0000-0000-000000000001/a.jpg'), 1, 'y su imagen');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.fotos where tipo = 'hoy'), 0, 'familia B: sigue sin ver la foto de hoy de P (no tiene un paseo con ella)');

/* ---- quién borra ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_filas($$delete from public.fotos where id = 'dddddddd-0000-0000-0000-000000000002'$$), 0, 'paseador Q: no borra la foto de hoy de P (0 filas)');
select is(public.test_filas($$delete from storage.objects where name = 'hoy/bbbbbbbb-0000-0000-0000-000000000001/a.jpg'$$), 0, 'paseador Q: no borra su imagen (0 filas)');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_filas($$delete from public.fotos where tipo = 'paseo'$$), 0, 'familia A: no borra fotos');
select is(public.test_filas($$delete from storage.objects where name in ('paseo/p-1/a.jpg', 'hoy/bbbbbbbb-0000-0000-0000-000000000001/a.jpg')$$), 0, 'familia A: ni imágenes');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_filas($$delete from public.fotos$$), 0, 'equipo: no borra fotos desde la app (las borra el script a los 7 días)');
select is(public.test_filas($$delete from storage.objects$$), 0, 'equipo: ni imágenes desde la app');
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_filas($$delete from public.fotos where id = 'dddddddd-0000-0000-0000-000000000001'$$), 0, 'paseadora P: no borra las fotos de un paseo (solo cambia su foto de hoy)');
select is(public.test_filas($$delete from storage.objects where name = 'paseo/p-1/a.jpg'$$), 0, 'paseadora P: ni sus imágenes de un paseo');
-- Cambiar la foto de hoy: primero la imagen vieja (mientras su fila todavía la hace visible) y después la fila.
select is(public.test_filas($$delete from storage.objects where name = 'hoy/bbbbbbbb-0000-0000-0000-000000000001/a.jpg'$$), 1, 'paseadora P: borra su imagen de la foto de hoy para cambiarla');
select is(public.test_filas($$delete from public.fotos where id = 'dddddddd-0000-0000-0000-000000000002'$$), 1, 'y la fila de su foto de hoy');
select lives_ok($$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'hoy/bbbbbbbb-0000-0000-0000-000000000001/b.jpg', 'bbbbbbbb-0000-0000-0000-000000000001')$$, 'y sube la nueva');
select lives_ok($$insert into public.fotos (id, tipo, paseador_id, dia, en, bytes, ruta) values ('dddddddd-0000-0000-0000-000000000003', 'hoy', 'bbbbbbbb-0000-0000-0000-000000000001', current_date, now(), 600, 'hoy/bbbbbbbb-0000-0000-0000-000000000001/b.jpg')$$, 'con su fila nueva (ahora sí cabe: ya no hay otra de hoy)');
-- Si se borra la FILA primero, la imagen queda donde la app ya no puede borrarla (nadie la ve sin su fila): por eso el orden.
select is(public.test_filas($$delete from public.fotos where id = 'dddddddd-0000-0000-0000-000000000003'$$), 1, 'si se borra la fila antes que la imagen…');
select is(public.test_filas($$delete from storage.objects where name = 'hoy/bbbbbbbb-0000-0000-0000-000000000001/b.jpg'$$), 0, '…la imagen ya no se puede borrar desde la app (queda huérfana): la app siempre borra primero la imagen');

select * from finish();
rollback;
