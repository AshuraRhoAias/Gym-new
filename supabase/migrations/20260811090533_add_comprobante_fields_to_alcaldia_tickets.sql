
alter table public.alcaldia_tickets
  add column comprobante_path text null,
  add column comprobante_iv text null,
  add column comprobante_salt text null,
  add column comprobante_mime text null;
