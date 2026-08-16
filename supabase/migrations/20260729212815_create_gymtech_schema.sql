
create extension if not exists pgcrypto;

create type record_kind as enum ('inscripcion', 'renovacion', 'inscripcion_bacho', 'renovacion_bacho');
create type record_status as enum ('pendiente', 'faltan_doc', 'tramitar_hoja', 'completo', 'entregado');
create type payment_method as enum ('efectivo', 'tarjeta', 'transferencia', 'otro', 'sin_metodo');
create type movement_kind as enum ('visita', 'gasto', 'tomado_caja');

create table members (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  created_at timestamptz not null default now()
);

create table registros (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  kind record_kind not null default 'inscripcion',
  nombre text not null,
  folio text,
  mes text not null,
  anio int not null,
  forma_pago payment_method not null default 'efectivo',
  monto numeric(10,2) not null default 0,
  autogenerado numeric(10,2) not null default 0,
  estatus record_status not null default 'pendiente',
  horario text,
  fecha_ingreso timestamptz,
  telefono text,
  bachillerato boolean not null default false,
  atendido_por text,
  comentarios text,
  foto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documentos_entregados (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid not null references registros(id) on delete cascade,
  documento text not null,
  entregado boolean not null default false,
  unique (registro_id, documento)
);

create table caja_movimientos (
  id uuid primary key default gen_random_uuid(),
  kind movement_kind not null default 'visita',
  usuario text not null,
  monto numeric(10,2) not null default 0,
  metodo_pago payment_method not null default 'efectivo',
  concepto text,
  registro_id uuid references registros(id) on delete set null,
  fecha timestamptz not null default now()
);

create index idx_registros_mes_anio on registros (anio, mes);
create index idx_registros_kind on registros (kind);
create index idx_caja_fecha on caja_movimientos (fecha);

alter table members enable row level security;
alter table registros enable row level security;
alter table documentos_entregados enable row level security;
alter table caja_movimientos enable row level security;

create policy "allow all authenticated members" on members for all to authenticated using (true) with check (true);
create policy "allow all authenticated registros" on registros for all to authenticated using (true) with check (true);
create policy "allow all authenticated documentos" on documentos_entregados for all to authenticated using (true) with check (true);
create policy "allow all authenticated caja" on caja_movimientos for all to authenticated using (true) with check (true);
