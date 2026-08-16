
-- El check-in por QR (Scanner) debe funcionar para cualquier rol sin
-- importar la forma de pago del socio; el ocultamiento de "efectivo" es
-- solo para listados/reportes financieros, no para dar acceso en la puerta.
-- Los montos se siguen enmascarando igual que en registros_view.
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
    case when current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]) then beca_monto else null::numeric end
  from registros
  where id = p_id;
$$;

create or replace function public.scanner_pago_mes_actual(p_nombre text, p_mes text, p_anio int)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from registros
    where nombre ilike p_nombre and mes = p_mes and anio = p_anio and monto > 0
  );
$$;

revoke all on function public.scanner_get_registro(uuid) from public;
grant execute on function public.scanner_get_registro(uuid) to authenticated;
revoke all on function public.scanner_pago_mes_actual(text, text, int) from public;
grant execute on function public.scanner_pago_mes_actual(text, text, int) to authenticated;
