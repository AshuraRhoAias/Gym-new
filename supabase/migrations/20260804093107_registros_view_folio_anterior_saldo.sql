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
  case
    when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then monto
    else null::numeric
  end as monto,
  case
    when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then autogenerado
    else null::numeric
  end as autogenerado,
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
  case
    when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then comision_tarjeta
    else null::numeric
  end as comision_tarjeta,
  folio_anterior,
  case
    when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then saldo_pendiente
    else null::numeric
  end as saldo_pendiente
from public.registros;

alter view public.registros_view set (security_invoker = true);
