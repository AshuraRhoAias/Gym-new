
create table documentos_archivos (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid not null references registros(id) on delete cascade,
  documento text not null,
  file_path text not null,
  file_iv text not null,
  file_salt text not null,
  mime_type text not null,
  uploaded_by text,
  created_at timestamptz not null default now(),
  unique (registro_id, documento)
);

alter table documentos_archivos enable row level security;

create policy "documentos_archivos: select autenticados" on documentos_archivos
  for select to authenticated using (true);
create policy "documentos_archivos: insert admin+" on documentos_archivos
  for insert to authenticated with check (current_user_role() in ('superadmin','admin','editor'));
create policy "documentos_archivos: update admin+" on documentos_archivos
  for update to authenticated using (current_user_role() in ('superadmin','admin','editor'));
create policy "documentos_archivos: delete solo superadmin" on documentos_archivos
  for delete to authenticated using (current_user_role() = 'superadmin');

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy "authenticated read documentos" on storage.objects
  for select to authenticated using (bucket_id = 'documentos');
create policy "authenticated write documentos" on storage.objects
  for insert to authenticated with check (bucket_id = 'documentos');
create policy "authenticated update documentos" on storage.objects
  for update to authenticated using (bucket_id = 'documentos');
create policy "authenticated delete documentos" on storage.objects
  for delete to authenticated using (bucket_id = 'documentos');

create type documento_firmable as enum ('cedula_inscripcion', 'carta_responsiva', 'reglamento');

create table firmas (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid not null references registros(id) on delete cascade,
  tipo documento_firmable not null,
  nombre_firmante text not null,
  firma_path text not null,
  firma_iv text not null,
  firma_salt text not null,
  firmado_por text,
  created_at timestamptz not null default now(),
  unique (registro_id, tipo)
);

alter table firmas enable row level security;

create policy "firmas: select autenticados" on firmas
  for select to authenticated using (true);
create policy "firmas: insert admin+" on firmas
  for insert to authenticated with check (current_user_role() in ('superadmin','admin','editor'));
create policy "firmas: update admin+" on firmas
  for update to authenticated using (current_user_role() in ('superadmin','admin','editor'));
create policy "firmas: delete solo superadmin" on firmas
  for delete to authenticated using (current_user_role() = 'superadmin');
