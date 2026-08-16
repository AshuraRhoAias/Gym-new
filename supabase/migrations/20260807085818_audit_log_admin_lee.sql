drop policy if exists "audit_log: solo superadmin lee" on audit_log;
create policy "audit_log: admin+ lee" on audit_log
  for select
  using (current_user_role() = any (array['superadmin'::user_role, 'admin'::user_role]));
