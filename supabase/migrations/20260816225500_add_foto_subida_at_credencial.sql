alter table public.registros add column if not exists foto_subida_at timestamptz;

comment on column public.registros.foto_subida_at is
  'Fecha y hora en que se subió la credencial/foto del alumno (foto_path).';

create or replace view public.registros_view as
select
  id,
  member_id,
  kind,
  nombre,
  folio,
  mes,
  anio,
  forma_pago,
  case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then monto else null::numeric end as monto,
  case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then autogenerado else null::numeric end as autogenerado,
  estatus,
  horario,
  fecha_ingreso,
  telefono,
  bachillerato,
  atendido_por,
  comentarios,
  foto_url,
  foto_path,
  foto_iv,
  foto_salt,
  created_at,
  updated_at,
  case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then comision_tarjeta else null::numeric end as comision_tarjeta,
  folio_anterior,
  case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then saldo_pendiente else null::numeric end as saldo_pendiente,
  case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then pago1_forma_pago else null::payment_method end as pago1_forma_pago,
  case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then pago1_monto else null::numeric end as pago1_monto,
  case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then pago2_forma_pago else null::payment_method end as pago2_forma_pago,
  case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then pago2_monto else null::numeric end as pago2_monto,
  beca,
  case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then beca_autorizado_por else null::text end as beca_autorizado_por,
  case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then beca_monto else null::numeric end as beca_monto,
  foto_subida_at
from registros
where current_user_role() = 'superadmin'::user_role or forma_pago <> 'efectivo'::payment_method;

alter view public.registros_view set (security_invoker = true);

create or replace function public.scanner_get_registro(p_id uuid)
returns setof registros_view
language sql
security definer
set search_path = public
as $$
  select
    id, member_id, kind, nombre, folio, mes, anio, forma_pago,
    case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then monto else null::numeric end,
    case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then autogenerado else null::numeric end,
    estatus, horario, fecha_ingreso, telefono, bachillerato, atendido_por, comentarios,
    foto_url, foto_path, foto_iv, foto_salt, created_at, updated_at,
    case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then comision_tarjeta else null::numeric end,
    folio_anterior,
    case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then saldo_pendiente else null::numeric end,
    case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then pago1_forma_pago else null::payment_method end,
    case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then pago1_monto else null::numeric end,
    case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then pago2_forma_pago else null::payment_method end,
    case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then pago2_monto else null::numeric end,
    beca,
    case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then beca_autorizado_por else null::text end,
    case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then beca_monto else null::numeric end,
    foto_subida_at
  from registros
  where id = p_id;
$$;

grant select on public.registros_view to authenticated;
revoke all on function public.scanner_get_registro(uuid) from public;
grant execute on function public.scanner_get_registro(uuid) to authenticated;
