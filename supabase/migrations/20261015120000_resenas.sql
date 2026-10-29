-- Patitas Conectadas · reseñas y calificación después del paseo (15 de octubre de 2026).
-- NADA de esto está aplicado: las migraciones las aplica la usuaria a mano, en orden (ver supabase/LEEME.md).
--
-- Una familia puede dejar UNA reseña por paseo, solo cuando el paseo ya se cerró y solo de SU paseo y de SU paseador
-- (estrellas del 1 al 5, un comentario corto y etiquetas rápidas). No se edita ni se borra: se va si la persona que la
-- escribió o el paseador borran su cuenta (cascada). La ve su autora, el paseador reseñado, el equipo y cualquier persona
-- con sesión mientras el paseador esté aprobado (es la que aparece en su tarjeta).
-- El nombre que se muestra («Valeria R.») y el distrito los pone la base, no la app: nadie puede reseñar con el nombre de otra persona.
-- La vista pública de paseadores suma la calificación (promedio), cuántas reseñas tiene y cuántos paseos terminó.

create table public.resenas (
  paseo_id text primary key references public.paseos (id) on delete cascade,
  familia_id uuid not null references public.perfiles (id) on delete cascade,
  paseador_id uuid not null references public.perfiles (id) on delete cascade,
  estrellas int not null check (estrellas between 1 and 5),
  texto text not null default '' check (char_length(texto) <= 280),
  etiquetas text[] not null default '{}' check (cardinality(etiquetas) <= 8),
  -- Los pone la base al crearla (ver `privado.resena_nueva`).
  autor text not null default '',
  distrito text check (distrito in ('San Isidro', 'Jesús María')),
  creado_en timestamptz not null default now()
);
create index resenas_paseador_idx on public.resenas (paseador_id, creado_en desc);
create index resenas_familia_idx on public.resenas (familia_id);

alter table public.resenas enable row level security;
-- Solo se lee y se crea: nadie edita ni borra una reseña (se va con la cuenta).
revoke all on public.resenas from anon;
grant select, insert on public.resenas to authenticated;

/* ---------------------------------------------------------------- lo que pone la base al crearla */
create function privado.resena_nueva() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_nombre text;
  v_apellido text;
  v_distrito text;
begin
  select p.nombre_pila into v_nombre from public.perfiles p where p.id = new.familia_id;
  select d.apellido, d.distrito into v_apellido, v_distrito from public.datos_personales d where d.id = new.familia_id;
  if v_distrito is null then
    select c.distrito into v_distrito from public.casas c where c.familia_id = new.familia_id;
  end if;
  new.autor := btrim(coalesce(v_nombre, '') || case when btrim(coalesce(v_apellido, '')) <> '' then ' ' || upper(left(btrim(v_apellido), 1)) || '.' else '' end);
  new.distrito := v_distrito;
  new.texto := btrim(new.texto);
  new.creado_en := now();
  return new;
end $$;
create trigger resena_nueva before insert on public.resenas for each row execute function privado.resena_nueva();

/* ---------------------------------------------------------------- quién la ve y quién la crea */
-- Ver: su autora, el paseador reseñado, el equipo y cualquier persona con sesión si el paseador está aprobado (vista pública).
create policy resenas_ver on public.resenas for select to authenticated
  using (
    familia_id = (select auth.uid())
    or paseador_id = (select auth.uid())
    or privado.es_equipo()
    or exists (select 1 from public.paseadores_publicos v where v.paseador_id = resenas.paseador_id)
  );
-- Crear: la familia de ese paseo, de su paseador, con el paseo ya cerrado. Una por paseo (es la llave).
create policy resenas_crear on public.resenas for insert to authenticated
  with check (
    familia_id = (select auth.uid())
    and privado.es_familia()
    and exists (
      select 1 from public.paseos s
      where s.id = resenas.paseo_id and s.familia_id = (select auth.uid()) and s.paseador_id = resenas.paseador_id and s.estado = 'cerrado'
    )
  );

/* ---------------------------------------------------------------- la vista pública suma calificación y paseos */
-- Igual que antes, con tres columnas al final: cuántas reseñas tiene, su promedio (una decimal, null si no tiene) y cuántos
-- paseos terminó. Sigue mostrando solo a los aprobados (las cinco casillas y el cobro registrado).
create or replace view public.paseadores_publicos as
select
  p.paseador_id,
  p.codigo,
  split_part(btrim(p.nombre), ' ', 1) as nombre_pila,
  left(btrim(p.apellido), 1) as apellido_inicial,
  p.universidad,
  p.carrera,
  p.ciclo,
  p.distrito,
  p.perfil,
  p.foto_ruta,
  p.paseos_acompanados,
  array_remove(array[
    case when c.dni then 'dni' end,
    case when c.distrito then 'distrito' end,
    case when c.celular then 'celular' end,
    case when c.consultas then 'consultas' end,
    case when c.examen then 'examen' end
  ], null) as comprobaciones,
  right(d.dni, 3) as dni_ultimos3,
  (select count(*)::int from public.resenas r where r.paseador_id = p.paseador_id) as resenas_n,
  (select round(avg(r.estrellas)::numeric, 1) from public.resenas r where r.paseador_id = p.paseador_id) as calificacion,
  (select count(*)::int from public.paseos s where s.paseador_id = p.paseador_id and s.estado = 'cerrado') as paseos_hechos
from public.postulaciones p
join public.comprobaciones c on c.paseador_id = p.paseador_id
left join public.datos_dni d on d.paseador_id = p.paseador_id
where p.estado in ('supervisado', 'activo')
  and c.dni and c.distrito and c.celular and c.consultas and c.examen
  and exists (select 1 from public.cobros_paseador cp where cp.paseador_id = p.paseador_id);
