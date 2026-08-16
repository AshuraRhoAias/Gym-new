-- Datos del pago dividido en 2 (forma de pago y monto de cada uno)
alter table public.registros
  add column if not exists pago1_forma_pago payment_method,
  add column if not exists pago1_monto numeric,
  add column if not exists pago2_forma_pago payment_method,
  add column if not exists pago2_monto numeric;

-- Comprobante fiscal (folio de ticket/CFDI + archivo cifrado) para validar ante el SAT
alter table public.gastos_operativos
  add column if not exists folio_comprobante text,
  add column if not exists comprobante_path text,
  add column if not exists comprobante_iv text,
  add column if not exists comprobante_salt text,
  add column if not exists comprobante_mime text;

alter table public.nomina_mensual
  add column if not exists folio_comprobante text,
  add column if not exists comprobante_path text,
  add column if not exists comprobante_iv text,
  add column if not exists comprobante_salt text,
  add column if not exists comprobante_mime text;

alter table public.pagos_alcaldia
  add column if not exists folio_comprobante text,
  add column if not exists comprobante_path text,
  add column if not exists comprobante_iv text,
  add column if not exists comprobante_salt text,
  add column if not exists comprobante_mime text;

insert into storage.buckets (id, name, public)
values ('comprobantes-financieros', 'comprobantes-financieros', false)
on conflict (id) do nothing;

create policy "comprobantes: select superadmin/admin" on storage.objects for select
  using (bucket_id = 'comprobantes-financieros' and current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "comprobantes: insert superadmin/admin" on storage.objects for insert
  with check (bucket_id = 'comprobantes-financieros' and current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "comprobantes: update superadmin/admin" on storage.objects for update
  using (bucket_id = 'comprobantes-financieros' and current_user_role() = any (array['superadmin','admin']::user_role[]));
create policy "comprobantes: delete superadmin/admin" on storage.objects for delete
  using (bucket_id = 'comprobantes-financieros' and current_user_role() = any (array['superadmin','admin']::user_role[]));
