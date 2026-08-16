
create view registros_view
with (security_invoker = true) as
select
  id,
  member_id,
  kind,
  nombre,
  folio,
  mes,
  anio,
  forma_pago,
  case when current_user_role() in ('superadmin','admin') then monto else null end as monto,
  case when current_user_role() in ('superadmin','admin') then autogenerado else null end as autogenerado,
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
  updated_at
from registros;

grant select on registros_view to authenticated;
