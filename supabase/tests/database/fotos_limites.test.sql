-- LÍMITES CONOCIDOS de las fotos (paso 8): lo que la base NO comprueba hoy y solo cuida la app (o nadie).
-- Cada prueba demuestra que algo PASA (la base lo deja hacer) para que nadie crea que está protegido. Son hechos, no
-- aprobaciones: si el equipo decide cerrar uno, se escribe una migración nueva y se cambia o se borra la prueba.
begin;
select plan(7);

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

-- 1. El tope de 12 fotos por paseo (`maxFotosPorPaseo`) lo cuida solo la app.
insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, bytes)
  select 'paseo', 'l-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/l-1/f' || n || '.jpg', 1000 from generate_series(1, 13) n;
select is((select count(*)::int from public.fotos where paseo_id = 'l-1'), 13, 'LÍMITE: la base no cuenta las fotos de un paseo: 13 entran aunque el tope de la app es 12');
-- 2. El peso (`bytes`) lo escribe quien sube: no se compara con el archivo. (Desde el 15 de octubre la base exige que no pase de 1 MB.)
select lives_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, bytes) values ('paseo', 'l-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/l-1/mentira.jpg', 5)$$,
  'LÍMITE: el peso anotado es lo que dice quien sube: la base no lo compara con el archivo (solo exige que no pase de 1 MB; el tope real lo pone el almacén)');
-- 3. La hora la pone el teléfono: se puede alterar (las fotos son señales).
select lives_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta) values ('paseo', 'l-1', 'bbbbbbbb-0000-0000-0000-000000000001', now() - interval '400 days', 'paseo/l-1/vieja.jpg')$$,
  'LÍMITE: la hora de la foto la pone el teléfono: una foto «de hace un año» entra igual (por eso son señales, no pruebas)');
-- 4. El lugar tampoco se comprueba (desde el 15 de octubre solo se exige que la coordenada sea posible).
select lives_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, lat, lng) values ('paseo', 'l-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/l-1/lejos.jpg', 40.0, 10.0)$$,
  'LÍMITE: el lugar lo pone el teléfono: unas coordenadas fuera de Lima entran igual (la app solo las muestra como «Fuera de la zona»)');
-- 5. El código de 2 dígitos no se revisa.
select lives_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta, codigo) values ('paseo', 'l-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/l-1/codigo.jpg', 'zz')$$,
  'LÍMITE: el código de la foto no se comprueba (la familia compara el número con el del paseo; la app avisa si no coincide)');
-- 6. Que la fila de datos tenga su imagen: nada obliga a que el archivo exista.
select lives_ok($$insert into public.fotos (tipo, paseo_id, paseador_id, en, ruta) values ('paseo', 'l-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), 'paseo/l-1/sin-archivo.jpg')$$,
  'LÍMITE: una fila de datos puede existir sin su imagen en el almacén (la app sube primero la imagen y después la fila, y dice «No se pudo cargar la foto» si falta)');

-- 7. Las imágenes del chat y la foto de perfil no tienen vencimiento: el script de borrado solo conoce la tabla `fotos`.
reset role;
select ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'mensajes' and column_name = 'vence_en'),
  'LÍMITE: las imágenes del chat no tienen fecha de vencimiento: el script de borrado a los 7 días no las conoce');

select * from finish();
rollback;
