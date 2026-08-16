
create table trabajadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  puesto text,
  activo boolean not null default true,
  created_by text,
  created_at timestamptz not null default now()
);

create table pagos_trabajadores (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  concepto text not null default 'Sueldo',
  monto numeric(10,2) not null,
  forma_pago payment_method not null default 'efectivo',
  mes text not null,
  anio int not null,
  fecha_pago date not null default current_date,
  registrado_por text,
  created_at timestamptz not null default now()
);

alter table trabajadores enable row level security;
alter table pagos_trabajadores enable row level security;

-- Área de pago a trabajadores: exclusiva de superadmin y admin, bloqueada a
-- nivel de base de datos para editor/viewer (no solo oculta en el menú).
create policy "trabajadores: select superadmin/admin" on trabajadores
  for select to authenticated using (current_user_role() in ('superadmin','admin'));
create policy "trabajadores: insert superadmin/admin" on trabajadores
  for insert to authenticated with check (current_user_role() in ('superadmin','admin'));
create policy "trabajadores: update superadmin/admin" on trabajadores
  for update to authenticated using (current_user_role() in ('superadmin','admin'));
create policy "trabajadores: delete solo superadmin" on trabajadores
  for delete to authenticated using (current_user_role() = 'superadmin');

create policy "pagos_trabajadores: select superadmin/admin" on pagos_trabajadores
  for select to authenticated using (current_user_role() in ('superadmin','admin'));
create policy "pagos_trabajadores: insert superadmin/admin" on pagos_trabajadores
  for insert to authenticated with check (current_user_role() in ('superadmin','admin'));
create policy "pagos_trabajadores: update superadmin/admin" on pagos_trabajadores
  for update to authenticated using (current_user_role() in ('superadmin','admin'));
create policy "pagos_trabajadores: delete solo superadmin" on pagos_trabajadores
  for delete to authenticated using (current_user_role() = 'superadmin');

create index idx_pagos_trabajadores_periodo on pagos_trabajadores (anio, mes);
