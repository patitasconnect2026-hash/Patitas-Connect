-- Bloque 6 (migración 20261016300000_ubicacion_y_sospechas.sql): la hora oficial la pone el servidor, las fotos «sospechosas»
-- solo las ve el equipo y la ubicación en vivo solo existe mientras el paseo está «en_paseo».
begin;
select plan(30);

create function public.test_json(q text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  execute q into r;
  return r;
end $$;
grant execute on function public.test_json(text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'b@prueba.local', '{"rol":"familia","nombre_pila":"Rosa"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';
insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido, perfil) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'activo', 'Lucía', 'Quispe', '{"rate": 22}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-Q', 'activo', 'Mateo', 'Rojas', '{"rate": 25}');
insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen)
  select paseador_id, true, true, true, true, true from public.postulaciones;
insert into public.cobros_paseador (paseador_id, metodo, celular, titular)
  select paseador_id, 'yape', '987654321', 'Titular' from public.postulaciones;
-- La casa de Valeria (el punto del paseo).
insert into public.casas (familia_id, calle, distrito, lat, lng) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Calle Los Cedros 245', 'San Isidro', -12.0999, -77.0374);

/* ---- el paseo v-1: Valeria lo pide y Lucía lo lleva hasta «en_paseo» ---- */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.paseos (id, familia_id, paseador_id, perro, dueno_nombre, paseador_nombre, horario, duracion_min, pago_paseador, monto, comision, neto)
  values ('v-1', 'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '{"name":"Max"}', 'Valeria', 'Lucía', 'Hoy · 10:00 am', 60, 17.6, 22, 4.4, 17.6);
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.publicar_ubicacion('v-1', -12.0999, -77.0374, 10)$$) ->> 'motivo', 'no_en_paseo', '1. antes de salir a pasear no se publica ubicación');
update public.paseos set estado = 'aceptado' where id = 'v-1';
update public.paseos set estado = 'en_camino' where id = 'v-1';
update public.paseos set estado = 'en_paseo' where id = 'v-1';

/* ================================================================ ubicación en vivo */
select is(public.test_json($$select public.publicar_ubicacion('v-1', -12.0999, -77.0374, 12)$$) ->> 'publicado', 'true', '2. el paseador publica su ubicación mientras pasea');
select is(public.test_json($$select public.publicar_ubicacion('v-1', -12.0995, -77.0370, 12)$$) ->> 'motivo', 'muy_seguido', '3. no más de una lectura cada 2 segundos');
select is(public.test_json($$select public.publicar_ubicacion('v-1', 95, -77.0374, 12)$$) ->> 'motivo', 'lugar', '4. unas coordenadas imposibles no pasan');
select throws_ok($$insert into public.ubicacion_en_vivo (paseo_id, lat, lng) values ('v-1', 1, 1)$$, '42501', null, '5. nadie escribe directo en la tabla');
select is((select count(*)::int from public.ubicacion_en_vivo), 1, '6. el paseador ve la suya');
reset role;
-- el reloj de la prueba no avanza dentro de una transacción: se corre la última hora para probar el reemplazo
update public.ubicacion_en_vivo set en = now() - interval '10 seconds';
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.publicar_ubicacion('v-1', -12.0990, -77.0360, 8)$$) ->> 'publicado', 'true', '7. pasados unos segundos, publica de nuevo y reemplaza la anterior');
select is((select count(*)::int from public.ubicacion_en_vivo), 1, '8. sigue habiendo una sola fila por paseo');
reset role;

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.publicar_ubicacion('v-1', -12.0990, -77.0360, 8)$$) ->> 'motivo', 'no_es_tuyo', '9. otro paseador no publica en un paseo ajeno');
select is((select count(*)::int from public.ubicacion_en_vivo), 0, '10. ni la ve');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.ubicacion_en_vivo), 1, '11. la familia del paseo la ve');
select is(public.test_json($$select public.publicar_ubicacion('v-1', -12.0990, -77.0360, 8)$$) ->> 'motivo', 'no_es_tuyo', '12. pero no puede publicar a nombre del paseador');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.ubicacion_en_vivo), 0, '13. otra familia no la ve');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.ubicacion_en_vivo), 1, '14. el equipo la ve');
reset role;

/* ================================================================ la hora oficial y las fotos sospechosas */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
-- foto buena: a 50 m de la casa, error de 20 m. El teléfono dice que es del año 2000 y manda su propia «hora_servidor».
insert into public.fotos (id, tipo, paseo_id, paseador_id, en, hora_servidor, codigo, lat, lng, precision_m, ruta)
  values ('f0000000-0000-0000-0000-000000000001', 'paseo', 'v-1', 'bbbbbbbb-0000-0000-0000-000000000001', '2000-01-01T10:00:00Z', '2000-01-01T10:00:00Z', '47', -12.09990, -77.03700, 20, 'paseo/v-1/f1.jpg');
select ok((select hora_servidor from public.fotos where id = 'f0000000-0000-0000-0000-000000000001') > now() - interval '1 minute', '15. la hora oficial la pone el servidor (lo que mande el teléfono se ignora)');
select is((select en from public.fotos where id = 'f0000000-0000-0000-0000-000000000001'), '2000-01-01T10:00:00Z'::timestamptz, '16. la hora que dice el teléfono se guarda aparte');
select is((select precision_m from public.fotos where id = 'f0000000-0000-0000-0000-000000000001'), 20::double precision, '17. se guarda la precisión de la lectura (en metros)');
select is((select count(*)::int from public.fotos_sospechas), 0, '18. el paseador no lee las marcas de «sospechosa» (solo el equipo)');
reset role;
select is((select count(*)::int from public.fotos_sospechas), 0, '19. una foto buena no queda marcada');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
-- precisión mala (80 m), cerca de la casa y a 0 s de la anterior pero a < 100 m: no cuenta como salto
insert into public.fotos (id, tipo, paseo_id, paseador_id, en, codigo, lat, lng, precision_m, ruta)
  values ('f0000000-0000-0000-0000-000000000002', 'paseo', 'v-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), '47', -12.09995, -77.03710, 80, 'paseo/v-1/f2.jpg');
-- lejos de la casa (≈ 2,3 km) con buena precisión
insert into public.fotos (id, tipo, paseo_id, paseador_id, en, codigo, lat, lng, precision_m, ruta)
  values ('f0000000-0000-0000-0000-000000000003', 'paseo', 'v-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), '47', -12.1200, -77.0374, 10, 'paseo/v-1/f3.jpg');
-- sin lugar: no se revisa
insert into public.fotos (id, tipo, paseo_id, paseador_id, en, codigo, sin_ubicacion, ruta)
  values ('f0000000-0000-0000-0000-000000000004', 'paseo', 'v-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), '47', 'negada', 'paseo/v-1/f4.jpg');
reset role;
select is((select motivos::text from public.fotos_sospechas where foto_id = 'f0000000-0000-0000-0000-000000000002'), '{precision}', '20. precisión peor que el umbral → «precision» (y 30 m de diferencia en el mismo segundo NO es salto)');
select is((select motivos::text from public.fotos_sospechas where foto_id = 'f0000000-0000-0000-0000-000000000003'), '{lejos,salto}', '21. lejos de la casa del paseo → «lejos»; y 2 km en el mismo instante → «salto»');
select is((select count(*)::int from public.fotos_sospechas where foto_id = 'f0000000-0000-0000-0000-000000000004'), 0, '22. una foto sin ubicación no se marca');

-- salto imposible entre fotos: la última con lugar se corre 10 minutos atrás y la nueva queda 600 m más allá (3,6 km/h: normal) o 3 km (18 km/h: normal)
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
reset role;
update public.fotos set hora_servidor = now() - interval '30 minutes';
update public.fotos set hora_servidor = now() - interval '10 minutes' where id = 'f0000000-0000-0000-0000-000000000003';
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
-- a 3 km de la anterior en 10 minutos son 18 km/h: por debajo de 25 km/h, no es salto
insert into public.fotos (id, tipo, paseo_id, paseador_id, en, codigo, lat, lng, precision_m, ruta)
  values ('f0000000-0000-0000-0000-000000000005', 'paseo', 'v-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), '47', -12.0930, -77.0374, 10, 'paseo/v-1/f5.jpg');
reset role;
select is((select motivos::text from public.fotos_sospechas where foto_id = 'f0000000-0000-0000-0000-000000000005'), '{lejos}', '23. a 18 km/h no es un salto imposible (solo «lejos» de la casa)');
update public.fotos set hora_servidor = now() - interval '2 minutes' where id = 'f0000000-0000-0000-0000-000000000005';
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
-- 3 km en 2 minutos son 90 km/h: salto imposible
insert into public.fotos (id, tipo, paseo_id, paseador_id, en, codigo, lat, lng, precision_m, ruta)
  values ('f0000000-0000-0000-0000-000000000006', 'paseo', 'v-1', 'bbbbbbbb-0000-0000-0000-000000000001', now(), '47', -12.1200, -77.0374, 10, 'paseo/v-1/f6.jpg');
reset role;
select ok((select motivos from public.fotos_sospechas where foto_id = 'f0000000-0000-0000-0000-000000000006') @> array['salto'], '24. 3 km en 2 minutos (90 km/h) → «salto»');

/* ---- quién lee las marcas ---- */
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.fotos_sospechas), 0, '25. la familia no ve ninguna marca (solo el equipo)');
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select ok((select count(*)::int from public.fotos_sospechas) >= 4, '26. el equipo ve todas las marcas');
reset role;

/* ---- los puntos de control también llevan la hora del servidor ---- */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
insert into public.puntos_control (paseo_id, tipo, en, hora_servidor, lat, lng, precision_m) values ('v-1', 'inicio', '2000-01-01T10:00:00Z', '2000-01-01T10:00:00Z', -12.0999, -77.0374, 15);
select ok((select hora_servidor from public.puntos_control where paseo_id = 'v-1') > now() - interval '1 minute', '27. el inicio del paseo también lleva la hora del servidor');

/* ---- al terminar de pasear, la ubicación en vivo se borra ---- */
select is((select count(*)::int from public.ubicacion_en_vivo), 1, '28. mientras pasea, la ubicación está');
update public.paseos set estado = 'entregado' where id = 'v-1';
select is((select count(*)::int from public.ubicacion_en_vivo), 0, '29. al entregar al perro, la ubicación en vivo se borra');
reset role;
select is(round(privado.distancia_m(-12.0, -77.0, -12.001, -77.0))::int, 111, '30. la distancia entre dos puntos: 0,001° de latitud son 111 m');

select * from finish();
rollback;
