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
