
alter table registros
  add column foto_path text,
  add column foto_iv text,
  add column foto_salt text;

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "authenticated read fotos" on storage.objects;
drop policy if exists "authenticated write fotos" on storage.objects;
drop policy if exists "authenticated update fotos" on storage.objects;
drop policy if exists "authenticated delete fotos" on storage.objects;

create policy "authenticated read fotos" on storage.objects
  for select to authenticated using (bucket_id = 'fotos');
create policy "authenticated write fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');
create policy "authenticated update fotos" on storage.objects
  for update to authenticated using (bucket_id = 'fotos');
create policy "authenticated delete fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');
