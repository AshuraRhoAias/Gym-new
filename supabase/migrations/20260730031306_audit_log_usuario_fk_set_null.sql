
alter table audit_log drop constraint audit_log_usuario_id_fkey;
alter table audit_log add constraint audit_log_usuario_id_fkey
  foreign key (usuario_id) references auth.users(id) on delete set null;
