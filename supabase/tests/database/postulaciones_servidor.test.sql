-- Pruebas de las postulaciones en el servidor (paso 7b del plan): quién escribe, quién ve y quién decide.
-- Se corren con `node supabase/tests/probar_en_pglite.cjs postulaciones` (sin Docker, sin red) o con `supabase test db`.
-- Cada bloque entra como una persona distinta, igual que la app.
begin;
select plan(28);

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
  ('bbbbbbbb-0000-0000-0000-000000000001', 'paseador.p@prueba.local', '{"rol":"paseador","nombre_pila":"Lucía"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'paseador.q@prueba.local', '{"rol":"paseador","nombre_pila":"Mateo"}', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'equipo.e@prueba.local', '{"rol":"familia","nombre_pila":"Equipo"}', 'authenticated', 'authenticated');
update public.perfiles set rol = 'equipo' where id = 'cccccccc-0000-0000-0000-000000000001';

/* ---- el paseador escribe lo suyo ---- */
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.postulaciones (paseador_id, codigo, estado, nombre, apellido) values ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-P', 'enviada', 'Lucía', 'Quispe')$$, 'paseador P: envía su postulación');
select lives_ok($$insert into public.datos_dni (paseador_id, dni) values ('bbbbbbbb-0000-0000-0000-000000000001', '12345678')$$, 'paseador P: guarda su DNI');
select throws_ok($$insert into public.postulaciones (paseador_id, codigo, estado, nombre) values ('bbbbbbbb-0000-0000-0000-000000000002', 'PAT-X', 'enviada', 'Mateo')$$, '42501', null, 'paseador P: no crea la postulación de otro');
select throws_ok($$insert into public.postulaciones (paseador_id, codigo, estado, nombre) values ('bbbbbbbb-0000-0000-0000-000000000001', 'PAT-Z', 'enviada', 'Lucía')$$, '23505', null, 'ya tiene una (una sola por paseador)');
select lives_ok($$update public.postulaciones set perfil = '{"rate": 25}', nombre = 'Lucía M.' where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$, 'paseador P: edita su perfil y sus datos');
select lives_ok($$update public.postulaciones set estado = 'borrador' where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$, 'paseador P: puede volver su postulación a borrador (aún no la decide el equipo)');
select lives_ok($$update public.postulaciones set estado = 'enviada' where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$, 'paseador P: y volver a enviarla');
select throws_ok($$update public.postulaciones set estado = 'activo' where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$, '42501', null, 'paseador P: NO se aprueba solo');
select throws_ok($$update public.postulaciones set estado = 'rechazada' where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$, '42501', null, 'paseador P: tampoco se rechaza solo');
select throws_ok($$update public.postulaciones set paseos_acompanados = 10 where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$, '42501', null, 'paseador P: no se anota paseos acompañados');
select throws_ok($$update public.postulaciones set codigo = 'PAT-OTRO' where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$, '42501', null, 'paseador P: no cambia su código');
select throws_ok($$insert into public.comprobaciones (paseador_id, dni) values ('bbbbbbbb-0000-0000-0000-000000000001', true)$$, '42501', null, 'paseador P: no marca sus casillas');
select is(public.test_filas($$update public.comprobaciones set dni = true where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$), 0, 'paseador P: tampoco las edita (0 filas)');
select throws_ok($$insert into public.notas_revision (paseador_id, nota) values ('bbbbbbbb-0000-0000-0000-000000000001', 'me apruebo')$$, '42501', null, 'paseador P: no escribe notas del equipo');
select is((select count(*)::int from public.datos_dni), 0, 'paseador P: no puede volver a leer su DNI');

/* ---- otro paseador y la familia no ven nada ajeno ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.postulaciones), 0, 'paseador Q: no ve la postulación de P');
select is((select count(*)::int from public.comprobaciones), 0, 'paseador Q: no ve las casillas de P');
reset role;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.postulaciones), 0, 'familia A: no ve ninguna postulación');
select is((select count(*)::int from public.datos_dni), 0, 'familia A: no ve ningún DNI');
select throws_ok($$insert into public.postulaciones (paseador_id, codigo, estado, nombre) values ('aaaaaaaa-0000-0000-0000-000000000001', 'PAT-F', 'enviada', 'Valeria')$$, '42501', null, 'familia A: no se postula (solo un paseador)');

/* ---- el equipo decide ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.postulaciones), 1, 'equipo: ve las postulaciones');
select is((select dni from public.datos_dni), '12345678', 'equipo: lee el DNI completo');
select lives_ok($$insert into public.comprobaciones (paseador_id, dni, distrito, celular, consultas, examen, marcado_por) values ('bbbbbbbb-0000-0000-0000-000000000001', true, true, true, true, true, 'cccccccc-0000-0000-0000-000000000001')$$, 'equipo: marca las casillas');
select lives_ok($$update public.postulaciones set estado = 'supervisado', paseos_acompanados = 1 where paseador_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$, 'equipo: aprueba');
select lives_ok($$insert into public.notas_revision (paseador_id, nota, marcado_por) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Videollamada hecha', 'cccccccc-0000-0000-0000-000000000001')$$, 'equipo: deja una nota interna');
select throws_ok($$insert into public.notas_revision (paseador_id, nota) values ('bbbbbbbb-0000-0000-0000-000000000001', repeat('x', 2001))$$, '23514', null, 'las notas tienen un tope (2.000 letras)');

/* ---- las notas internas NO las ve el postulante ---- */
reset role;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.notas_revision), 0, 'paseador P: NO ve las notas internas del equipo');
select is((select estado::text from public.postulaciones), 'supervisado', 'paseador P: ve su estado real (aprobada)');
reset role;

select * from finish();
rollback;
