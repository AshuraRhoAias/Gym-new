-- Calculadora de convenio: mensualidades x $129 + inscripciones x $299
alter table public.pagos_alcaldia
  add column if not exists mensualidades_usuarios integer not null default 0,
  add column if not exists inscripciones_usuarios integer not null default 0,
  add column if not exists folio_calculo_convenio text,
  add column if not exists convenio_comprobante_path text,
  add column if not exists convenio_comprobante_iv text,
  add column if not exists convenio_comprobante_salt text,
  add column if not exists convenio_comprobante_mime text;

comment on column public.pagos_alcaldia.monto_convenio is
  'Calculado: mensualidades_usuarios*129 + inscripciones_usuarios*299.';
comment on column public.pagos_alcaldia.folio_comprobante is
  'Folio/CFDI del comprobante de RENTA (uso de espacio), no del convenio.';

-- Ledger de pagos de convenio realmente efectuados (puede haber varios por periodo)
create table if not exists public.convenio_pagos (
  id uuid primary key default gen_random_uuid(),
  mes text not null,
  anio integer not null,
  monto numeric not null,
  folio_comprobante text,
  comprobante_path text,
  comprobante_iv text,
  comprobante_salt text,
  comprobante_mime text,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.convenio_pagos enable row level security;

create policy "convenio_pagos: select superadmin/admin" on public.convenio_pagos for select
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "convenio_pagos: insert superadmin/admin" on public.convenio_pagos for insert
  with check (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "convenio_pagos: update superadmin/admin" on public.convenio_pagos for update
  using (current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "convenio_pagos: delete solo superadmin" on public.convenio_pagos for delete
  using (current_user_role() = 'superadmin'::user_role);
