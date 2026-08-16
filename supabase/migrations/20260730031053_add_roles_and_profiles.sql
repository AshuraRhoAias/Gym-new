
create type user_role as enum ('superadmin', 'admin', 'editor', 'viewer');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  role user_role not null default 'viewer',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- security definer para evitar recursión de RLS al leer el propio rol
create or replace function current_user_role() returns user_role
language sql security definer stable set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create policy "profiles: leer propio o superadmin lee todos" on profiles
  for select to authenticated
  using (id = auth.uid() or current_user_role() = 'superadmin');

create policy "profiles: superadmin actualiza roles" on profiles
  for update to authenticated
  using (current_user_role() = 'superadmin');

-- Sembrar al usuario bernal existente como superadministrador
insert into profiles (id, username, role)
select id, 'bernal', 'superadmin'
from auth.users
where email = 'bernal@gymtech.local'
on conflict (id) do update set role = 'superadmin';

-- RLS por rol en registros: todos autenticados leen; superadmin/admin/editor
-- insertan y actualizan; solo superadmin borra.
drop policy if exists "allow all authenticated registros" on registros;

create policy "registros: select autenticados" on registros
  for select to authenticated using (true);
create policy "registros: insert admin+" on registros
  for insert to authenticated with check (current_user_role() in ('superadmin','admin','editor'));
create policy "registros: update admin+" on registros
  for update to authenticated using (current_user_role() in ('superadmin','admin','editor'));
create policy "registros: delete solo superadmin" on registros
  for delete to authenticated using (current_user_role() = 'superadmin');

-- documentos_entregados sigue el mismo patrón
drop policy if exists "allow all authenticated documentos" on documentos_entregados;

create policy "documentos: select autenticados" on documentos_entregados
  for select to authenticated using (true);
create policy "documentos: insert admin+" on documentos_entregados
  for insert to authenticated with check (current_user_role() in ('superadmin','admin','editor'));
create policy "documentos: update admin+" on documentos_entregados
  for update to authenticated using (current_user_role() in ('superadmin','admin','editor'));
create policy "documentos: delete solo superadmin" on documentos_entregados
  for delete to authenticated using (current_user_role() = 'superadmin');

-- caja_movimientos: sección de dinero, invisible a editor/viewer a nivel de base de datos
drop policy if exists "allow all authenticated caja" on caja_movimientos;

create policy "caja: select superadmin/admin" on caja_movimientos
  for select to authenticated using (current_user_role() in ('superadmin','admin'));
create policy "caja: insert superadmin/admin" on caja_movimientos
  for insert to authenticated with check (current_user_role() in ('superadmin','admin'));
create policy "caja: update superadmin/admin" on caja_movimientos
  for update to authenticated using (current_user_role() in ('superadmin','admin'));
create policy "caja: delete solo superadmin" on caja_movimientos
  for delete to authenticated using (current_user_role() = 'superadmin');
