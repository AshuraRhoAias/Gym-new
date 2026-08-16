
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tabla text not null,
  registro_id uuid not null,
  accion text not null check (accion in ('update', 'delete')),
  campo text,
  valor_anterior text,
  valor_nuevo text,
  usuario_id uuid references auth.users(id),
  usuario text,
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;

create policy "audit_log: solo superadmin lee" on audit_log
  for select to authenticated using (current_user_role() = 'superadmin');
-- Sin política de insert/update/delete para 'authenticated': solo el
-- trigger (security definer) escribe aquí.

create or replace function log_registro_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  actor_role user_role;
  actor_name text;
  cols text[] := array['nombre','folio','mes','anio','forma_pago','monto','autogenerado',
                        'estatus','horario','fecha_ingreso','telefono','bachillerato',
                        'comentarios','foto_path'];
  col text;
  old_val text;
  new_val text;
begin
  select role, username into actor_role, actor_name from profiles where id = auth.uid();

  -- Las acciones del superadministrador no dejan rastro, por diseño.
  if actor_role = 'superadmin' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'DELETE' then
    insert into audit_log (tabla, registro_id, accion, usuario_id, usuario)
    values ('registros', old.id, 'delete', auth.uid(), coalesce(actor_name, 'desconocido'));
    return old;
  end if;

  foreach col in array cols loop
    execute format('select ($1).%I::text, ($2).%I::text', col, col)
      into old_val, new_val
      using old, new;
    if old_val is distinct from new_val then
      insert into audit_log (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario)
      values ('registros', new.id, 'update', col, old_val, new_val, auth.uid(), coalesce(actor_name, 'desconocido'));
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_log_registro_changes on registros;
create trigger trg_log_registro_changes
  after update or delete on registros
  for each row execute function log_registro_changes();
