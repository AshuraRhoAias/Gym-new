
-- Extiende trabajadores con datos de nómina fija mensual
alter table public.trabajadores
  add column if not exists turno text check (turno in ('manana','tarde','fin_semana')),
  add column if not exists sueldo_mensual numeric,
  add column if not exists horario text;

-- Nómina mensual: una fila por trabajador activo y periodo, generada desde sueldo_mensual
create table if not exists public.nomina_mensual (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references public.trabajadores(id) on delete cascade,
  mes text not null,
  anio integer not null,
  monto numeric not null default 0,
  timbrado boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  unique (trabajador_id, mes, anio)
);

-- Pago a alcaldía: convenio + renta de espacio, por periodo
create table if not exists public.pagos_alcaldia (
  id uuid primary key default gen_random_uuid(),
  mes text not null,
  anio integer not null,
  monto_convenio numeric not null default 0,
  monto_renta numeric not null default 10000,
  cfdi_recibido boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  unique (mes, anio)
);

-- Tickets de pago para cuando no hay CFDI del pago a alcaldía
create table if not exists public.alcaldia_tickets (
  id uuid primary key default gen_random_uuid(),
  pago_alcaldia_id uuid not null references public.pagos_alcaldia(id) on delete cascade,
  folio text,
  monto numeric not null,
  created_at timestamptz not null default now()
);

-- Gastos operativos por categoría
create table if not exists public.gastos_operativos (
  id uuid primary key default gen_random_uuid(),
  mes text not null,
  anio integer not null,
  categoria text not null check (categoria in ('papeleria','limpieza','internet','mantenimiento','otros')),
  descripcion text,
  monto numeric not null,
  tiene_cfdi boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);

-- Cobros con Mercado Pago (Point) y su comisión
create table if not exists public.mercadopago_cobros (
  id uuid primary key default gen_random_uuid(),
  mes text not null,
  anio integer not null,
  fecha date not null default current_date,
  concepto text,
  monto_bruto numeric not null,
  comision_pct numeric not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.nomina_mensual enable row level security;
alter table public.pagos_alcaldia enable row level security;
alter table public.alcaldia_tickets enable row level security;
alter table public.gastos_operativos enable row level security;
alter table public.mercadopago_cobros enable row level security;

-- nomina_mensual
create policy "nomina_mensual: select superadmin/admin" on public.nomina_mensual for select
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "nomina_mensual: insert superadmin/admin" on public.nomina_mensual for insert
  with check (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "nomina_mensual: update superadmin/admin" on public.nomina_mensual for update
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "nomina_mensual: delete solo superadmin" on public.nomina_mensual for delete
  using (current_user_role() = 'superadmin'::user_role);

-- pagos_alcaldia
create policy "pagos_alcaldia: select superadmin/admin" on public.pagos_alcaldia for select
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "pagos_alcaldia: insert superadmin/admin" on public.pagos_alcaldia for insert
  with check (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "pagos_alcaldia: update superadmin/admin" on public.pagos_alcaldia for update
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "pagos_alcaldia: delete solo superadmin" on public.pagos_alcaldia for delete
  using (current_user_role() = 'superadmin'::user_role);

-- alcaldia_tickets
create policy "alcaldia_tickets: select superadmin/admin" on public.alcaldia_tickets for select
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "alcaldia_tickets: insert superadmin/admin" on public.alcaldia_tickets for insert
  with check (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "alcaldia_tickets: update superadmin/admin" on public.alcaldia_tickets for update
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "alcaldia_tickets: delete solo superadmin" on public.alcaldia_tickets for delete
  using (current_user_role() = 'superadmin'::user_role);

-- gastos_operativos
create policy "gastos_operativos: select superadmin/admin" on public.gastos_operativos for select
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "gastos_operativos: insert superadmin/admin" on public.gastos_operativos for insert
  with check (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "gastos_operativos: update superadmin/admin" on public.gastos_operativos for update
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "gastos_operativos: delete solo superadmin" on public.gastos_operativos for delete
  using (current_user_role() = 'superadmin'::user_role);

-- mercadopago_cobros
create policy "mercadopago_cobros: select superadmin/admin" on public.mercadopago_cobros for select
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "mercadopago_cobros: insert superadmin/admin" on public.mercadopago_cobros for insert
  with check (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "mercadopago_cobros: update superadmin/admin" on public.mercadopago_cobros for update
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "mercadopago_cobros: delete solo superadmin" on public.mercadopago_cobros for delete
  using (current_user_role() = 'superadmin'::user_role);
