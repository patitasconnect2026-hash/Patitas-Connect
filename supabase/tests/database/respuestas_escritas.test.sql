-- Las respuestas ESCRITAS del examen (migración 20261016200000_respuestas_escritas.sql): solo el equipo las lee, el paseador las
-- guarda por una sola puerta con largo mínimo y máximo, y se borran con la cuenta.
begin;
select plan(17);

create function public.test_json(q text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  execute q into r;
  return r;
end $$;
grant execute on function public.test_json(text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@prueba.local', '{"rol":"familia","nombre_pila":"Valeria"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';

/* ---- el paseador guarda ---- */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.guardar_respuestas_examen(jsonb_build_object('correa', repeat('a', 45), 'o2', repeat('b', 100)))$$), '{"n": 2, "guardado": true}'::jsonb, '1. el paseador guarda sus respuestas');
select is(public.test_json($$select public.guardar_respuestas_examen(jsonb_build_object('correa', repeat('a', 39)))$$) ->> 'motivo', 'corta', '2. con menos de 40 letras dice «corta»');
select is(public.test_json($$select public.guardar_respuestas_examen(jsonb_build_object('correa', repeat('a', 601)))$$) ->> 'motivo', 'larga', '3. con más de 600 dice «larga»');
select is(public.test_json($$select public.guardar_respuestas_examen(jsonb_build_object('correa', repeat(' ', 80)))$$) ->> 'motivo', 'corta', '4. solo espacios cuenta como vacío');
select is(public.test_json($$select public.guardar_respuestas_examen(jsonb_build_object('Mala Clave', repeat('a', 50)))$$) ->> 'motivo', 'formato', '5. un nombre de pregunta raro no pasa');
select is(public.test_json($$select public.guardar_respuestas_examen('["x"]'::jsonb)$$) ->> 'motivo', 'formato', '6. algo que no es un objeto no pasa');
select is(public.test_json($$select public.guardar_respuestas_examen(jsonb_build_object('correa', repeat('c', 60), 'o3', 'corta'))$$) ->> 'motivo', 'corta', '7. si una falla, no se guarda ninguna');
select is(public.test_json($$select public.guardar_respuestas_examen(jsonb_build_object('correa', repeat('d', 70)))$$) ->> 'guardado', 'true', '8. volver a guardar reemplaza esa respuesta');
select is((select count(*)::int from public.respuestas_escritas), 0, '9. el paseador NO puede leer sus respuestas de vuelta (solo el equipo)');
select throws_ok($$insert into public.respuestas_escritas (paseador_id, pregunta_id, texto) values ('bbbbbbbb-0000-0000-0000-000000000001', 'x', repeat('z', 50))$$, '42501', null, '10. y tampoco escribe directo en la tabla');

/* ---- otras personas ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.guardar_respuestas_examen(jsonb_build_object('correa', repeat('a', 50)))$$) ->> 'motivo', 'rol', '11. una familia no guarda respuestas de examen');
select is((select count(*)::int from public.respuestas_escritas), 0, '12. una familia no lee ninguna');
reset role;
set local role anon;
select throws_ok($$select public.guardar_respuestas_examen('{}'::jsonb)$$, '42501', null, '13. sin cuenta no se puede ni llamar');
reset role;

/* ---- el equipo lee ---- */
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.respuestas_escritas), 2, '14. el equipo lee las respuestas de Lucía');
select is((select texto from public.respuestas_escritas where pregunta_id = 'correa'), repeat('d', 70), '15. y ve la última versión');
reset role;

/* ---- al borrar la cuenta ---- */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.test_json($$select public.borrar_mi_cuenta()$$) ->> 'borrada', 'true', '16. el paseador borra su cuenta');
reset role;
select is((select count(*)::int from public.respuestas_escritas), 0, '17. y sus respuestas escritas se borran con ella');

select * from finish();
rollback;
