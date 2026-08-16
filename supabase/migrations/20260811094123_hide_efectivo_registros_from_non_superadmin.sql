
-- La vista registros_view corre con los privilegios del owner (postgres),
-- que hace bypass de RLS por ser el dueño de la tabla (relforcerowsecurity=false).
-- Por eso el filtrado por rol debe ir explícito en el WHERE de la vista,
-- igual que ya se hace con el enmascarado de montos vía CASE WHEN.
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
  case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then beca_monto else null::numeric end as beca_monto
from registros
where current_user_role() = 'superadmin'::user_role or forma_pago <> 'efectivo'::payment_method;

-- Defensa en profundidad: también en la tabla base, para consultas directas
-- a `registros` (ej. páginas Faltan y ReporteDia que no pasan por la vista).
alter policy "registros: select autenticados" on public.registros
  using (current_user_role() = 'superadmin'::user_role or forma_pago <> 'efectivo'::payment_method);
