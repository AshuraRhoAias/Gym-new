alter type public.payment_method add value if not exists 'dos_pagos';

alter table public.registros
  add column if not exists folio_anterior text,
  add column if not exists saldo_pendiente numeric;

comment on column public.registros.folio_anterior is
  'Folio que tenía el socio antes de esta renovación (referencia histórica).';
comment on column public.registros.saldo_pendiente is
  'Monto que aún debe el socio (ej. cuando forma_pago = dos_pagos).';
