-- PATITAS CONECTADAS · TODO EL SQL JUNTO, para pegar UNA vez en Supabase (SQL Editor) y tocar Run.
-- Es la suma, en orden, de migrations/*.sql (generado el 13 oct 2026; si cambian las migraciones, hay que volver a generarlo).
-- Probado en una base Postgres 16 temporal: se aplica sin errores y pasan las 37 pruebas de «quién ve qué».

-- ==================== migrations/20261014120000_tablas.sql ====================
-- Patitas Conectadas · tablas (paso 3 del plan del servidor, docs/PLAN-SERVIDOR.md).
-- NADA de esto está aplicado: todavía no hay proyecto. Los nombres y los estados son los del código
-- (lib/paseo.ts, lib/pagos.ts, lib/casos.ts, lib/verificacion.ts, lib/walkerStore.ts).
-- Las reglas de acceso («quién ve qué») están en el archivo siguiente. Aquí no se da permiso a nadie.

create schema if not exists privado;

/* ---------------------------------------------------------------- tipos */
create type public.rol_usuario as enum ('familia', 'paseador', 'equipo');
create type public.estado_paseo as enum ('solicitado', 'aceptado', 'rechazado', 'expirado', 'en_camino', 'en_paseo', 'entregado', 'cerrado', 'cancelado', 'en_disputa');
create type public.estado_pago as enum ('sin_pagar', 'visto', 'no_encontrado', 'pagado_paseador');
create type public.estado_postulacion as enum ('borrador', 'enviada', 'supervisado', 'activo', 'rechazada');
create type public.tipo_caso as enum ('disputa', 'entrega_sin_confirmar', 'pago');

/* ---------------------------------------------------------------- personas */
-- Una fila por cuenta (la crea un disparador al registrarse). El rol «equipo» solo se pone a mano, en el panel de SQL.
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol public.rol_usuario not null default 'familia',
  nombre_pila text not null default '',
  creado_en timestamptz not null default now()
);

-- Lo personal que NO se muestra a la otra parte: apellido, celular, nacimiento.
create table public.datos_personales (
  id uuid primary key references public.perfiles (id) on delete cascade,
  apellido text not null default '',
  celular text not null default '',
  nacimiento date,
  distrito text check (distrito in ('San Isidro', 'Jesús María')),
  terminos_version text,
  terminos_en timestamptz
);

-- La casa del dueño. Solo la ve él, el equipo y el paseador DESPUÉS de aceptar el paseo.
create table public.casas (
  familia_id uuid primary key references public.perfiles (id) on delete cascade,
  calle text not null default '',
  unidad text not null default '',
  distrito text check (distrito in ('San Isidro', 'Jesús María')),
  lat double precision,
  lng double precision,
  hay_portero boolean not null default false,
  nombre_portero text not null default '',
  emergencia_nombre text not null default '',
  emergencia_telefono text not null default ''
);

create table public.perros (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.perfiles (id) on delete cascade,
  nombre text not null,
  raza text not null default '',
  edad_anios int,
  sexo text check (sexo in ('M', 'F')),
  tamano text not null check (tamano in ('small', 'medium', 'large')),
  peso_kg numeric(5, 1),
  pelaje text check (pelaje in ('dorado', 'negro', 'blanco', 'cafe', 'gris')),
  forma text check (forma in ('floppy', 'bat')),
  temperamento text[] not null default '{}',
  sociable boolean not null default true,
  vacunado boolean not null default false,
  esterilizado boolean not null default false,
  rpp boolean not null default false,
  notas text not null default '',
  medico text not null default '',
  veterinario text not null default '',
  foto_ruta text
);
create index perros_familia_idx on public.perros (familia_id);

/* ---------------------------------------------------------------- paseadores */
-- La postulación de cada paseador (lib/walkerStore.ts `WalkerApplication`). La ve él y el equipo.
create table public.postulaciones (
  paseador_id uuid primary key references public.perfiles (id) on delete cascade,
  codigo text not null unique,
  estado public.estado_postulacion not null default 'borrador',
  nombre text not null default '',
  apellido text not null default '',
  nacimiento date,
  distrito text check (distrito in ('San Isidro', 'Jesús María')),
  universidad text not null default '',
  carrera text not null default '',
  ciclo text not null default '',
  consentimientos jsonb not null default '{}'::jsonb,
  consentimiento_en timestamptz,
  version_terminos text,
  -- bio, incluye, estilo, tamaños, días, horarios, parques, tarifa (rate) y experiencia
  perfil jsonb not null default '{}'::jsonb,
  curso jsonb,
  curso_intentos int not null default 0,
  examen jsonb,
  examen_intentos int not null default 0,
  consulta_autorizada boolean not null default false,
  referencias jsonb not null default '[]'::jsonb,
  cita_videollamada text not null default '',
  revision_notas text not null default '',
  paseos_acompanados int not null default 0,
  foto_ruta text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Las cinco casillas que marca el equipo (lib/verificacion.ts). La sexta («primerPaseo») se deduce de
-- `postulaciones.paseos_acompanados` en la app, como hoy. Solo el equipo escribe aquí.
create table public.comprobaciones (
  paseador_id uuid primary key references public.postulaciones (paseador_id) on delete cascade,
  dni boolean not null default false,
  distrito boolean not null default false,
  celular boolean not null default false,
  consultas boolean not null default false,
  examen boolean not null default false,
  marcado_por uuid references public.perfiles (id),
  actualizado_en timestamptz not null default now()
);

-- El DNI completo, APARTE: solo el equipo lo lee. En público solo los últimos 3 dígitos, por la vista.
create table public.datos_dni (
  paseador_id uuid primary key references public.postulaciones (paseador_id) on delete cascade,
  dni text not null check (dni ~ '^[0-9]{8}$')
);

-- Dónde cobra el paseador (Yape o Plin). Lo ve él y el equipo; nunca la familia.
create table public.cobros_paseador (
  paseador_id uuid primary key references public.perfiles (id) on delete cascade,
  metodo text not null check (metodo in ('yape', 'plin')),
  celular text not null,
  titular text not null
);

/* ---------------------------------------------------------------- paseos */
create table public.paseos (
  id text primary key default gen_random_uuid()::text,
  familia_id uuid not null references public.perfiles (id),
  paseador_id uuid not null references public.perfiles (id),
  perro_id uuid references public.perros (id) on delete set null,
  -- Resumen del perro que el paseador ve desde la solicitud (la ficha completa, después de aceptar).
  perro jsonb not null,
  dueno_nombre text not null,
  paseador_nombre text not null,
  horario text not null,
  duracion_min int not null check (duracion_min in (30, 60, 90)),
  estado public.estado_paseo not null default 'solicitado',
  entrega text not null default 'door' check (entrega in ('door', 'doorman')),
  perros_en_grupo int not null default 0,
  tamano_grupo text check (tamano_grupo in ('small', 'medium', 'large')),
  -- La foto de los montos de la reserva (lib/config.ts `desgloseDePago`).
  pago_paseador numeric(10, 2) not null,
  monto numeric(10, 2) not null,
  comision numeric(10, 2) not null,
  neto numeric(10, 2) not null,
  check (abs(monto - (comision + neto)) < 0.011),
  reserva jsonb,
  distrito text check (distrito in ('San Isidro', 'Jesús María')),
  reporte jsonb,
  vigilancia jsonb,
  ubicacion text,
  cerrado_paseador boolean not null default false,
  creado_en timestamptz not null default now(),
  aceptado_en timestamptz,
  actualizado_en timestamptz not null default now(),
  check (familia_id <> paseador_id)
);
create index paseos_familia_idx on public.paseos (familia_id);
create index paseos_paseador_idx on public.paseos (paseador_id);

-- El código de recojo (4 dígitos). Lo ve la familia; el paseador lo escribe y la base lo compara
-- (`verificar_codigo_recojo`): nunca lo lee.
create table public.codigos_recojo (
  paseo_id text primary key references public.paseos (id) on delete cascade,
  codigo text not null check (codigo ~ '^[0-9]{4}$'),
  intentos_fallidos int not null default 0
);

-- El registro de la máquina de estados (lib/paseo.ts `EventoPaseo`).
create table public.paseo_eventos (
  id bigint generated always as identity primary key,
  paseo_id text not null references public.paseos (id) on delete cascade,
  accion text not null,
  de public.estado_paseo,
  a public.estado_paseo not null,
  quien text not null check (quien in ('dueno', 'paseador', 'sistema')),
  en timestamptz not null default now(),
  nota text,
  demo boolean not null default false,
  aviso text check (aviso in ('borde', 'salida', 'regreso', 'salto', 'quieto', 'sin_ubicacion'))
);
create index paseo_eventos_paseo_idx on public.paseo_eventos (paseo_id);

-- La bitácora que ve la familia (lib/types.ts `EventKind`).
create table public.bitacora (
  id text primary key default gen_random_uuid()::text,
  paseo_id text not null references public.paseos (id) on delete cascade,
  tipo text not null check (tipo in ('start', 'route', 'cross', 'pee', 'water', 'photo', 'poop', 'return', 'arrived', 'sos')),
  texto text not null,
  en timestamptz not null default now()
);
create index bitacora_paseo_idx on public.bitacora (paseo_id);

-- El chat: `de` es 'owner' o 'walker', como en lib/bus.ts `ChatMsg`. No se edita ni se borra.
create table public.mensajes (
  id text primary key default gen_random_uuid()::text,
  paseo_id text not null references public.paseos (id) on delete cascade,
  de text not null check (de in ('owner', 'walker')),
  texto text,
  imagen_ruta text,
  en timestamptz not null default now(),
  check (texto is not null or imagen_ruta is not null)
);
create index mensajes_paseo_idx on public.mensajes (paseo_id);

-- Inicio y fin del paseo con su ubicación (lib/puntosControl.ts `TipoPuntoGuardado`); los puntos «foto» son las fotos.
create table public.puntos_control (
  id uuid primary key default gen_random_uuid(),
  paseo_id text not null references public.paseos (id) on delete cascade,
  tipo text not null check (tipo in ('inicio', 'fin')),
  en timestamptz not null,
  lat double precision,
  lng double precision,
  precision_m double precision,
  sin_ubicacion text check (sin_ubicacion in ('negada', 'omitida', 'no_disponible', 'sin_lectura'))
);
create index puntos_control_paseo_idx on public.puntos_control (paseo_id);

-- Los datos de cada foto (los bytes están en el almacén privado `fotos`). `hoy` = la foto de hoy del paseador.
create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('paseo', 'hoy')),
  paseo_id text references public.paseos (id) on delete cascade,
  paseador_id uuid not null references public.perfiles (id) on delete cascade,
  dia date,
  en timestamptz not null,
  codigo text not null default '',
  lat double precision,
  lng double precision,
  sin_ubicacion text check (sin_ubicacion in ('negada', 'omitida', 'no_disponible', 'sin_lectura')),
  bytes int,
  ruta text not null unique,
  -- A los 7 días se borran (salvo que el paseo tenga un caso abierto: ver `fotos_para_borrar`).
  vence_en timestamptz not null default (now() + interval '7 days'),
  check ((tipo = 'paseo' and paseo_id is not null) or (tipo = 'hoy' and paseo_id is null and dia is not null))
);
create unique index fotos_hoy_unica_idx on public.fotos (paseador_id, dia) where tipo = 'hoy';
create index fotos_paseo_idx on public.fotos (paseo_id);

/* ---------------------------------------------------------------- pagos y casos */
-- Solo el REGISTRO (la app no mueve dinero). Se crea sola con el paseo y solo cambia por `mover_pago`.
create table public.pagos (
  paseo_id text primary key references public.paseos (id) on delete cascade,
  familia_id uuid not null references public.perfiles (id),
  paseador_id uuid not null references public.perfiles (id),
  monto numeric(10, 2) not null,
  comision numeric(10, 2) not null,
  neto numeric(10, 2) not null,
  estado public.estado_pago not null default 'sin_pagar',
  paseo_estado public.estado_paseo not null default 'solicitado',
  hecho_en timestamptz,
  visto_en timestamptz,
  hora_pago text,
  no_encontrado_en timestamptz,
  pagado_paseador_en timestamptz,
  nota text,
  demo boolean not null default false,
  creado_en timestamptz not null default now()
);
create index pagos_paseador_idx on public.pagos (paseador_id);
create index pagos_familia_idx on public.pagos (familia_id);

-- Reportes y casos para el equipo (lib/casos.ts). `id` es «<tipo>-<paseo>», como en el código.
create table public.casos (
  id text primary key,
  paseo_id text not null references public.paseos (id) on delete cascade,
  tipo public.tipo_caso not null,
  reporte jsonb,
  perro text not null default '',
  paseador text not null default '',
  dueno text not null default '',
  estado_paseo public.estado_paseo,
  pago_estado text,
  monto numeric(10, 2),
  registro jsonb,
  abierto_en timestamptz not null default now(),
  resolucion jsonb,
  resuelto_en timestamptz
);
create index casos_paseo_idx on public.casos (paseo_id);

/* ---------------------------------------------------------------- tablas de reglas (datos fijos) */
-- Copia, en datos, de TRANSICIONES (lib/paseo.ts). Una prueba automática compara las dos.
create table public.transiciones_paseo (
  accion text not null,
  de public.estado_paseo not null,
  a public.estado_paseo not null,
  quien text[] not null,
  primary key (accion, de)
);

-- Copia, en datos, de TRANSICIONES_PAGO (lib/pagos.ts).
create table public.transiciones_pago (
  accion text primary key,
  de public.estado_pago[] not null,
  a public.estado_pago not null,
  quien text not null check (quien in ('paseador', 'equipo')),
  paseo public.estado_paseo[],
  pide_nota boolean not null default false
);

insert into public.transiciones_paseo (accion, de, a, quien) values
  ('aceptar', 'solicitado', 'aceptado', '{paseador}'),
  ('rechazar', 'solicitado', 'rechazado', '{paseador}'),
  ('expirar', 'solicitado', 'expirado', '{sistema}'),
  ('salir', 'aceptado', 'en_camino', '{paseador}'),
  ('recoger', 'en_camino', 'en_paseo', '{paseador}'),
  ('entregar', 'en_paseo', 'entregado', '{paseador}'),
  ('confirmar_entrega', 'entregado', 'entregado', '{dueno}'),
  ('recordar', 'entregado', 'entregado', '{sistema}'),
  ('cerrar', 'entregado', 'cerrado', '{sistema}'),
  ('cancelar', 'solicitado', 'cancelado', '{dueno}'),
  ('cancelar', 'aceptado', 'cancelado', '{dueno,paseador}'),
  ('cancelar', 'en_camino', 'cancelado', '{dueno,paseador}'),
  ('reportar', 'aceptado', 'en_disputa', '{dueno,paseador}'),
  ('reportar', 'en_camino', 'en_disputa', '{dueno,paseador}'),
  ('reportar', 'en_paseo', 'en_disputa', '{dueno,paseador}'),
  ('reportar', 'entregado', 'en_disputa', '{dueno,paseador}'),
  ('resolver', 'en_disputa', 'cerrado', '{sistema}'),
  ('anular', 'en_disputa', 'cancelado', '{sistema}'),
  ('avisar', 'en_paseo', 'en_paseo', '{sistema}');

insert into public.transiciones_pago (accion, de, a, quien, paseo, pide_nota) values
  ('ver_pago', '{sin_pagar,no_encontrado}', 'visto', 'paseador', '{entregado,cerrado}', false),
  ('no_encontrado', '{visto}', 'no_encontrado', 'equipo', null, true),
  ('pagar_al_paseador', '{visto,no_encontrado}', 'pagado_paseador', 'equipo', '{entregado,cerrado}', false);

-- ==================== migrations/20261014120100_reglas.sql ====================
-- Patitas Conectadas · reglas de acceso («quién ve qué»). Paso 3 del plan del servidor.
-- Principio: NADIE VE NADA POR DEFECTO. Todas las tablas tienen RLS y solo se da acceso con una regla explícita.
-- NADA de esto está aplicado: todavía no hay proyecto.

/* ---------------------------------------------------------------- permisos base */
-- Sin sesión («anon») no hay permiso sobre nada.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;

-- Con sesión («authenticated») se da el permiso y la regla de fila decide. Lo que no está en una regla, no se ve.
grant select, insert, update, delete on all tables in schema public to authenticated;
-- Los pagos solo cambian por `mover_pago`; las tablas de reglas no se tocan desde la app.
revoke insert, update, delete on public.pagos from authenticated;
revoke all on public.transiciones_paseo, public.transiciones_pago from authenticated;
-- Los mensajes y la bitácora no se editan ni se borran.
revoke update, delete on public.mensajes, public.bitacora from authenticated;

/* ---------------------------------------------------------------- ayudas (schema privado: no sale por la API) */
create function privado.es_equipo() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'equipo')
$$;

create function privado.es_paseador() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'paseador')
$$;

create function privado.es_familia() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'familia')
$$;

create function privado.participa(p_paseo text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.paseos s where s.id = p_paseo and auth.uid() in (s.familia_id, s.paseador_id))
$$;

create function privado.es_familia_de(p_paseo text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.paseos s where s.id = p_paseo and s.familia_id = auth.uid())
$$;

create function privado.es_paseador_de(p_paseo text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.paseos s where s.id = p_paseo and s.paseador_id = auth.uid())
$$;

-- ¿El paseador ya aceptó algún paseo de esta familia (y sigue en marcha)? Solo entonces ve la casa y la ficha.
create function privado.paseador_ve_familia(p_familia uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.paseos s
    where s.familia_id = p_familia and s.paseador_id = auth.uid()
      and s.estado in ('aceptado', 'en_camino', 'en_paseo', 'entregado', 'en_disputa')
  )
$$;

create function privado.paseador_ve_perro(p_perro uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.paseos s
    where s.perro_id = p_perro and s.paseador_id = auth.uid()
      and s.estado in ('aceptado', 'en_camino', 'en_paseo', 'entregado', 'en_disputa')
  )
$$;

-- ¿Esta familia tiene (o tuvo) un paseo ACEPTADO con este paseador? Entonces ve su foto de hoy.
create function privado.familia_ve_hoy(p_paseador uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.paseos s
    where s.paseador_id = p_paseador and s.familia_id = auth.uid()
      and s.estado in ('aceptado', 'en_camino', 'en_paseo', 'entregado', 'cerrado', 'en_disputa')
  )
$$;

grant usage on schema privado to authenticated;
grant execute on all functions in schema privado to authenticated;

/* ---------------------------------------------------------------- vista pública de paseadores */
-- Lo que ve cualquier persona con sesión de un paseador. Solo los APROBADOS: las cinco casillas marcadas por el equipo
-- (lib/walkerStore.ts `estadoVisible`) y con su Yape o Plin registrado. De su DNI, solo los últimos 3 dígitos.
-- Ninguna columna dice «verificado»: las comprobaciones son la lista de las casillas marcadas (lib/verificacion.ts).
-- Corre con los permisos del dueño de la vista (a propósito: es la única puerta pública a esas tablas).
create view public.paseadores_publicos as
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
  right(d.dni, 3) as dni_ultimos3
from public.postulaciones p
join public.comprobaciones c on c.paseador_id = p.paseador_id
left join public.datos_dni d on d.paseador_id = p.paseador_id
where p.estado in ('supervisado', 'activo')
  and c.dni and c.distrito and c.celular and c.consultas and c.examen
  and exists (select 1 from public.cobros_paseador cp where cp.paseador_id = p.paseador_id);

revoke all on public.paseadores_publicos from public, anon;
grant select on public.paseadores_publicos to authenticated;

/* ---------------------------------------------------------------- disparadores */
-- Al registrarse: nace su perfil. El rol sale de lo que pide la persona, pero SOLO «familia» o «paseador».
-- «equipo» no se puede pedir: lo pone una persona del equipo a mano, en el panel de SQL.
create function privado.al_crear_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, rol, nombre_pila)
  values (
    new.id,
    case new.raw_user_meta_data ->> 'rol' when 'paseador' then 'paseador'::public.rol_usuario else 'familia'::public.rol_usuario end,
    coalesce(new.raw_user_meta_data ->> 'nombre_pila', '')
  );
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users for each row execute function privado.al_crear_usuario();

-- Nadie cambia su rol ni el de otra persona desde la app (ni el equipo): solo el panel de SQL (sin sesión de app).
create function privado.bloquear_cambio_de_rol() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.rol is distinct from old.rol or new.id is distinct from old.id) and auth.uid() is not null then
    raise exception 'El rol no se puede cambiar desde la app.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger bloquear_cambio_de_rol before update on public.perfiles for each row execute function privado.bloquear_cambio_de_rol();

-- El paseador edita su postulación, pero no la aprueba ni toca lo que decide el equipo.
create function privado.limitar_postulacion() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  if auth.uid() is null or privado.es_equipo() then
    return new;
  end if;
  if new.estado is distinct from old.estado
     and not (old.estado in ('borrador', 'enviada') and new.estado in ('borrador', 'enviada')) then
    raise exception 'El estado de la postulación lo cambia el equipo.' using errcode = '42501';
  end if;
  if new.revision_notas is distinct from old.revision_notas
     or new.paseos_acompanados is distinct from old.paseos_acompanados
     or new.codigo is distinct from old.codigo
     or new.paseador_id is distinct from old.paseador_id then
    raise exception 'Eso lo decide el equipo.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger limitar_postulacion before update on public.postulaciones for each row execute function privado.limitar_postulacion();

-- Paseos: al crearse nacen su pago y su primer evento. Las filas las escribe la base, no la app.
create function privado.paseo_creado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.pagos (paseo_id, familia_id, paseador_id, monto, comision, neto, paseo_estado)
  values (new.id, new.familia_id, new.paseador_id, new.monto, new.comision, new.neto, new.estado);
  insert into public.paseo_eventos (paseo_id, accion, de, a, quien) values (new.id, 'solicitar', null, new.estado, 'dueno');
  return new;
end $$;
create trigger paseo_creado after insert on public.paseos for each row execute function privado.paseo_creado();

-- Paseos: solo cambios de estado que existen (copia de lib/paseo.ts) y que le tocan a esa persona.
create function privado.paseo_cambia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_quien text[];
  v_es_equipo boolean := auth.uid() is null or privado.es_equipo();
begin
  new.actualizado_en := now();
  if new.id is distinct from old.id
     or new.familia_id is distinct from old.familia_id
     or new.paseador_id is distinct from old.paseador_id
     or new.monto is distinct from old.monto
     or new.comision is distinct from old.comision
     or new.neto is distinct from old.neto
     or new.pago_paseador is distinct from old.pago_paseador then
    raise exception 'No se pueden cambiar la familia, el paseador ni los montos de un paseo.' using errcode = '42501';
  end if;
  if new.estado is distinct from old.estado then
    select t.quien into v_quien from public.transiciones_paseo t where t.de = old.estado and t.a = new.estado limit 1;
    if v_quien is null then
      raise exception 'Ese cambio de estado del paseo no existe (% → %).', old.estado, new.estado using errcode = '22023';
    end if;
    if not v_es_equipo then
      if not ((auth.uid() = old.familia_id and v_quien && array['dueno', 'sistema'])
           or (auth.uid() = old.paseador_id and v_quien && array['paseador', 'sistema'])) then
        raise exception 'A esta persona no le toca ese cambio de estado.' using errcode = '42501';
      end if;
      -- El paseo no se cierra solo: antes el dueño tiene que haber confirmado la entrega (lib/bus.ts `cerrarSiListo`).
      if old.estado = 'entregado' and new.estado = 'cerrado'
         and not exists (select 1 from public.paseo_eventos e where e.paseo_id = old.id and e.accion = 'confirmar_entrega') then
        raise exception 'Falta que el dueño confirme la entrega.' using errcode = '42501';
      end if;
    end if;
    if new.estado = 'aceptado' then
      new.aceptado_en := now();
    end if;
  end if;
  return new;
end $$;
create trigger paseo_cambia before update on public.paseos for each row execute function privado.paseo_cambia();

create function privado.paseo_cambio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_accion text;
  v_quien text[];
  v_actor text;
begin
  if new.estado is not distinct from old.estado then
    return new;
  end if;
  select t.accion, t.quien into v_accion, v_quien from public.transiciones_paseo t where t.de = old.estado and t.a = new.estado limit 1;
  v_actor := case
    when auth.uid() = old.familia_id and v_quien @> array['dueno'] then 'dueno'
    when auth.uid() = old.paseador_id and v_quien @> array['paseador'] then 'paseador'
    else 'sistema'
  end;
  insert into public.paseo_eventos (paseo_id, accion, de, a, quien) values (new.id, v_accion, old.estado, new.estado, v_actor);
  update public.pagos
     set paseo_estado = new.estado,
         hecho_en = coalesce(hecho_en, case when new.estado in ('entregado', 'cerrado') then now() end)
   where paseo_id = new.id;
  return new;
end $$;
create trigger paseo_cambio after update on public.paseos for each row execute function privado.paseo_cambio();

-- Casos: la familia o el paseador solo pueden sumar su reporte a un caso abierto; resolverlo es del equipo.
create function privado.limitar_caso() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or privado.es_equipo() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.paseo_id is distinct from old.paseo_id
     or new.tipo is distinct from old.tipo
     or new.resolucion is distinct from old.resolucion
     or new.resuelto_en is distinct from old.resuelto_en
     or new.abierto_en is distinct from old.abierto_en then
    raise exception 'Resolver un caso lo hace el equipo.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger limitar_caso before update on public.casos for each row execute function privado.limitar_caso();

/* ---------------------------------------------------------------- reglas de fila */
alter table public.perfiles enable row level security;
alter table public.datos_personales enable row level security;
alter table public.casas enable row level security;
alter table public.perros enable row level security;
alter table public.postulaciones enable row level security;
alter table public.comprobaciones enable row level security;
alter table public.datos_dni enable row level security;
alter table public.cobros_paseador enable row level security;
alter table public.paseos enable row level security;
alter table public.codigos_recojo enable row level security;
alter table public.paseo_eventos enable row level security;
alter table public.bitacora enable row level security;
alter table public.mensajes enable row level security;
alter table public.puntos_control enable row level security;
alter table public.fotos enable row level security;
alter table public.pagos enable row level security;
alter table public.casos enable row level security;
alter table public.transiciones_paseo enable row level security;
alter table public.transiciones_pago enable row level security;
-- (las dos últimas no tienen reglas: nadie las lee desde la app; las funciones de la base sí.)

-- perfiles: cada persona el suyo; el equipo todos. No hay regla de insert (lo hace el disparador) ni de delete.
create policy perfiles_ver on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or privado.es_equipo());
create policy perfiles_editar on public.perfiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- datos personales (apellido, celular, nacimiento): la persona y el equipo. Nunca la otra parte.
create policy datos_personales_ver on public.datos_personales for select to authenticated
  using (id = (select auth.uid()) or privado.es_equipo());
create policy datos_personales_crear on public.datos_personales for insert to authenticated
  with check (id = (select auth.uid()));
create policy datos_personales_editar on public.datos_personales for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- casa: el dueño, el equipo y el paseador SOLO después de aceptar.
create policy casas_ver on public.casas for select to authenticated
  using (familia_id = (select auth.uid()) or privado.es_equipo() or privado.paseador_ve_familia(familia_id));
create policy casas_crear on public.casas for insert to authenticated
  with check (familia_id = (select auth.uid()) and privado.es_familia());
create policy casas_editar on public.casas for update to authenticated
  using (familia_id = (select auth.uid())) with check (familia_id = (select auth.uid()));
create policy casas_borrar on public.casas for delete to authenticated
  using (familia_id = (select auth.uid()));

-- perros: el dueño, el equipo y el paseador de un paseo ya aceptado.
create policy perros_ver on public.perros for select to authenticated
  using (familia_id = (select auth.uid()) or privado.es_equipo() or privado.paseador_ve_perro(id));
create policy perros_crear on public.perros for insert to authenticated
  with check (familia_id = (select auth.uid()) and privado.es_familia());
create policy perros_editar on public.perros for update to authenticated
  using (familia_id = (select auth.uid())) with check (familia_id = (select auth.uid()));
create policy perros_borrar on public.perros for delete to authenticated
  using (familia_id = (select auth.uid()));

-- postulaciones: el paseador (la suya) y el equipo.
create policy postulaciones_ver on public.postulaciones for select to authenticated
  using (paseador_id = (select auth.uid()) or privado.es_equipo());
create policy postulaciones_crear on public.postulaciones for insert to authenticated
  with check (paseador_id = (select auth.uid()) and privado.es_paseador() and estado in ('borrador', 'enviada'));
create policy postulaciones_editar on public.postulaciones for update to authenticated
  using (paseador_id = (select auth.uid()) or privado.es_equipo())
  with check (paseador_id = (select auth.uid()) or privado.es_equipo());

-- comprobaciones: las ve el paseador y el equipo; SOLO el equipo las marca.
create policy comprobaciones_ver on public.comprobaciones for select to authenticated
  using (paseador_id = (select auth.uid()) or privado.es_equipo());
create policy comprobaciones_crear on public.comprobaciones for insert to authenticated
  with check (privado.es_equipo());
create policy comprobaciones_editar on public.comprobaciones for update to authenticated
  using (privado.es_equipo()) with check (privado.es_equipo());

-- DNI completo: SOLO el equipo lo lee. El paseador lo escribe (y ya no lo puede volver a leer).
create policy datos_dni_ver on public.datos_dni for select to authenticated
  using (privado.es_equipo());
create policy datos_dni_crear on public.datos_dni for insert to authenticated
  with check (paseador_id = (select auth.uid()) and privado.es_paseador());
create policy datos_dni_editar on public.datos_dni for update to authenticated
  using (paseador_id = (select auth.uid())) with check (paseador_id = (select auth.uid()));

-- Yape o Plin del paseador: él y el equipo. Nunca la familia.
create policy cobros_ver on public.cobros_paseador for select to authenticated
  using (paseador_id = (select auth.uid()) or privado.es_equipo());
create policy cobros_crear on public.cobros_paseador for insert to authenticated
  with check (paseador_id = (select auth.uid()) and privado.es_paseador());
create policy cobros_editar on public.cobros_paseador for update to authenticated
  using (paseador_id = (select auth.uid())) with check (paseador_id = (select auth.uid()));
create policy cobros_borrar on public.cobros_paseador for delete to authenticated
  using (paseador_id = (select auth.uid()));

-- paseos: su familia, su paseador y el equipo. Solo una familia crea un paseo (y con un paseador aprobado).
create policy paseos_ver on public.paseos for select to authenticated
  using (familia_id = (select auth.uid()) or paseador_id = (select auth.uid()) or privado.es_equipo());
create policy paseos_crear on public.paseos for insert to authenticated
  with check (
    familia_id = (select auth.uid())
    and privado.es_familia()
    and estado = 'solicitado'
    and exists (select 1 from public.paseadores_publicos v where v.paseador_id = paseos.paseador_id)
  );
create policy paseos_cambiar on public.paseos for update to authenticated
  using (familia_id = (select auth.uid()) or paseador_id = (select auth.uid()) or privado.es_equipo())
  with check (familia_id = (select auth.uid()) or paseador_id = (select auth.uid()) or privado.es_equipo());

-- código de recojo: lo ve la familia (y el equipo). El paseador no lo lee: lo escribe y `verificar_codigo_recojo` lo compara.
create policy codigos_ver on public.codigos_recojo for select to authenticated
  using (privado.es_familia_de(paseo_id) or privado.es_equipo());
create policy codigos_crear on public.codigos_recojo for insert to authenticated
  with check (privado.es_familia_de(paseo_id));

-- registro de la máquina de estados: lo ven los dos y el equipo; los cambios de estado los anota la base.
-- Aquí solo se anotan lo que no cambia el estado: «avisar», «recordar» y «confirmar_entrega».
create policy eventos_ver on public.paseo_eventos for select to authenticated
  using (privado.participa(paseo_id) or privado.es_equipo());
create policy eventos_crear on public.paseo_eventos for insert to authenticated
  with check (
    (accion = 'confirmar_entrega' and quien = 'dueno' and privado.es_familia_de(paseo_id))
    or (accion in ('avisar', 'recordar') and quien = 'sistema' and privado.participa(paseo_id))
  );

-- bitácora y chat: los dos del paseo (y el equipo solo lee). Sin editar ni borrar.
create policy bitacora_ver on public.bitacora for select to authenticated
  using (privado.participa(paseo_id) or privado.es_equipo());
create policy bitacora_crear on public.bitacora for insert to authenticated
  with check (privado.participa(paseo_id));

create policy mensajes_ver on public.mensajes for select to authenticated
  using (privado.participa(paseo_id) or privado.es_equipo());
create policy mensajes_crear on public.mensajes for insert to authenticated
  with check (
    (de = 'owner' and privado.es_familia_de(paseo_id))
    or (de = 'walker' and privado.es_paseador_de(paseo_id))
  );

-- puntos de control: los anota el paseador; los ven los dos y el equipo.
create policy puntos_ver on public.puntos_control for select to authenticated
  using (privado.participa(paseo_id) or privado.es_equipo());
create policy puntos_crear on public.puntos_control for insert to authenticated
  with check (privado.es_paseador_de(paseo_id));

-- fotos (datos): las del paseo, sus dos y el equipo; la foto de hoy, el paseador, el equipo y la familia con un paseo aceptado.
create policy fotos_ver on public.fotos for select to authenticated
  using (
    privado.es_equipo()
    or (tipo = 'paseo' and privado.participa(paseo_id))
    or (tipo = 'hoy' and (paseador_id = (select auth.uid()) or privado.familia_ve_hoy(paseador_id)))
  );
create policy fotos_crear on public.fotos for insert to authenticated
  with check (
    paseador_id = (select auth.uid())
    and privado.es_paseador()
    and ((tipo = 'paseo' and privado.es_paseador_de(paseo_id)) or tipo = 'hoy')
  );
create policy fotos_borrar_hoy on public.fotos for delete to authenticated
  using (tipo = 'hoy' and paseador_id = (select auth.uid()));

-- pagos: su familia, su paseador y el equipo. Nadie los escribe directo: solo `mover_pago`.
create policy pagos_ver on public.pagos for select to authenticated
  using (familia_id = (select auth.uid()) or paseador_id = (select auth.uid()) or privado.es_equipo());

-- casos: los ve y los abre cualquiera de los dos del paseo; el equipo los ve todos y los resuelve.
create policy casos_ver on public.casos for select to authenticated
  using (privado.participa(paseo_id) or privado.es_equipo());
create policy casos_crear on public.casos for insert to authenticated
  with check ((privado.participa(paseo_id) and resolucion is null and resuelto_en is null) or privado.es_equipo());
create policy casos_cambiar on public.casos for update to authenticated
  using ((privado.participa(paseo_id) and resuelto_en is null) or privado.es_equipo())
  with check (privado.participa(paseo_id) or privado.es_equipo());

/* ---------------------------------------------------------------- funciones que llama la app */
-- Mover un pago (copia de TRANSICIONES_PAGO en lib/pagos.ts). Nadie escribe `pagos` directo:
--   ver_pago           → el PASEADOR de ese paseo, con el paseo ya entregado o cerrado;
--   no_encontrado      → solo el EQUIPO, con nota;
--   pagar_al_paseador  → solo el EQUIPO (el paseador no se paga a sí mismo).
create function public.mover_pago(p_paseo text, p_accion text, p_nota text default null, p_hora text default null)
returns public.pagos
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_t public.transiciones_pago;
  v_pago public.pagos;
  v_nota text := btrim(coalesce(p_nota, ''));
begin
  if v_uid is null then
    raise exception 'Sin sesión.' using errcode = '42501';
  end if;
  select * into v_t from public.transiciones_pago where accion = p_accion;
  if not found then
    raise exception 'Acción desconocida: %.', p_accion using errcode = '22023';
  end if;
  select * into v_pago from public.pagos where paseo_id = p_paseo for update;
  if not found then
    raise exception 'No existe ese pago.' using errcode = 'P0002';
  end if;
  if v_t.quien = 'equipo' and not privado.es_equipo() then
    raise exception 'Solo el equipo puede hacer esto.' using errcode = '42501';
  end if;
  if v_t.quien = 'paseador' and v_uid <> v_pago.paseador_id then
    raise exception 'Solo el paseador de este paseo puede hacer esto.' using errcode = '42501';
  end if;
  if not (v_pago.estado = any (v_t.de)) then
    raise exception 'No se puede «%» con el pago «%».', p_accion, v_pago.estado using errcode = '22023';
  end if;
  if v_t.paseo is not null and not (v_pago.paseo_estado = any (v_t.paseo)) then
    raise exception 'No se puede «%» con el paseo «%».', p_accion, v_pago.paseo_estado using errcode = '22023';
  end if;
  if v_t.pide_nota and char_length(v_nota) < 3 then
    raise exception 'La nota es obligatoria.' using errcode = '22023';
  end if;
  update public.pagos
     set estado = v_t.a,
         visto_en = case when p_accion = 'ver_pago' then now() else visto_en end,
         hora_pago = case when p_accion = 'ver_pago' then nullif(left(btrim(coalesce(p_hora, '')), 20), '') else hora_pago end,
         nota = case when p_accion = 'ver_pago' then null when p_accion = 'no_encontrado' then v_nota else nota end,
         no_encontrado_en = case when p_accion = 'no_encontrado' then now() when p_accion = 'ver_pago' then null else no_encontrado_en end,
         pagado_paseador_en = case when p_accion = 'pagar_al_paseador' then now() else pagado_paseador_en end
   where paseo_id = p_paseo
   returning * into v_pago;
  return v_pago;
end $$;
revoke all on function public.mover_pago(text, text, text, text) from public, anon;
grant execute on function public.mover_pago(text, text, text, text) to authenticated;

-- El paseador escribe el código de recojo y la base lo compara (nunca lo lee). 5 fallos y se bloquea: lo reinicia el equipo.
create function public.verificar_codigo_recojo(p_paseo text, p_codigo text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v public.codigos_recojo;
begin
  if auth.uid() is null then
    return false;
  end if;
  if not exists (
    select 1 from public.paseos s
    where s.id = p_paseo and s.paseador_id = auth.uid() and s.estado in ('aceptado', 'en_camino', 'en_paseo', 'entregado')
  ) then
    return false;
  end if;
  select * into v from public.codigos_recojo where paseo_id = p_paseo for update;
  if not found or v.intentos_fallidos >= 5 then
    return false;
  end if;
  if v.codigo = p_codigo then
    update public.codigos_recojo set intentos_fallidos = 0 where paseo_id = p_paseo;
    return true;
  end if;
  update public.codigos_recojo set intentos_fallidos = intentos_fallidos + 1 where paseo_id = p_paseo;
  return false;
end $$;
revoke all on function public.verificar_codigo_recojo(text, text) from public, anon;
grant execute on function public.verificar_codigo_recojo(text, text) to authenticated;

-- ==================== migrations/20261014120200_fotos_almacen.sql ====================
-- Patitas Conectadas · almacén privado de fotos y su borrado a los 7 días. Paso 3 del plan del servidor.
-- NADA de esto está aplicado: todavía no hay proyecto.
--
-- Rutas dentro del almacén `fotos` (la app las arma así):
--   paseo/<paseo_id>/<foto_id>.jpg      foto de un paseo
--   hoy/<paseador_id>/<día>.jpg         foto de hoy del paseador
--   chat/<paseo_id>/<mensaje_id>.jpg    imagen del chat
-- El almacén es PRIVADO: nadie tiene una dirección pública; la app pide enlaces que vencen (por ejemplo, 1 hora).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Ver: el equipo, quien tiene una fila visible en `fotos` con esa ruta, y los dos del paseo en las imágenes del chat.
create policy fotos_almacen_ver on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos'
    and (
      privado.es_equipo()
      or exists (select 1 from public.fotos f where f.ruta = storage.objects.name)
      or ((storage.foldername(name))[1] = 'chat' and privado.participa((storage.foldername(name))[2]))
    )
  );

-- Subir: el paseador a su carpeta de paseo o de hoy; cualquiera de los dos del paseo, al chat.
create policy fotos_almacen_subir on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and (
      ((storage.foldername(name))[1] = 'paseo' and privado.es_paseador() and privado.es_paseador_de((storage.foldername(name))[2]))
      or ((storage.foldername(name))[1] = 'hoy' and privado.es_paseador() and (storage.foldername(name))[2] = (select auth.uid())::text)
      or ((storage.foldername(name))[1] = 'chat' and privado.participa((storage.foldername(name))[2]))
    )
  );

-- Borrar y reemplazar: nadie desde la app. El borrado a los 7 días lo hace la función de abajo + el script con la clave de servicio.

/* ---------------------------------------------------------------- borrado a los 7 días */
-- Las fotos vencidas, SALVO las de un paseo con un caso abierto o en disputa (se conservan hasta que se cierre el caso).
-- Supabase pide borrar los archivos por su API (no por SQL: quedarían huérfanos), así que el borrado automático NO es solo
-- SQL. Hace falta un script (supabase/scripts/borrar_fotos_vencidas.mjs) que corre con la clave de servicio, a mano
-- o desde un programador. Ver supabase/LEEME.md.
create function public.fotos_para_borrar()
returns table (id uuid, ruta text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.ruta
  from public.fotos f
  where f.vence_en < now()
    and not exists (select 1 from public.casos c where c.paseo_id = f.paseo_id and c.resuelto_en is null)
    and not exists (select 1 from public.paseos s where s.id = f.paseo_id and s.estado = 'en_disputa')
$$;
revoke all on function public.fotos_para_borrar() from public, anon, authenticated;
grant execute on function public.fotos_para_borrar() to service_role;

