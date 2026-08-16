alter table public.registros
  add column if not exists comision_tarjeta numeric;

comment on column public.registros.comision_tarjeta is
  'Comisión automática (4.06%) descontada cuando forma_pago = tarjeta; null para otros métodos.';
