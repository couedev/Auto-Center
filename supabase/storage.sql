-- Execute no SQL Editor depois do schema.sql (ou do MVP equivalente).
-- Cria armazenamento público de imagens para o catálogo.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('produtos', 'produtos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('servicos', 'servicos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists auto_ct_catalog_images_admin_select on storage.objects;
drop policy if exists auto_ct_catalog_images_admin_insert on storage.objects;
drop policy if exists auto_ct_catalog_images_admin_update on storage.objects;
drop policy if exists auto_ct_catalog_images_admin_delete on storage.objects;

create policy auto_ct_catalog_images_admin_select
on storage.objects for select to authenticated
using (
  bucket_id in ('produtos', 'servicos')
  and (select private.eh_admin())
);

create policy auto_ct_catalog_images_admin_insert
on storage.objects for insert to authenticated
with check (
  bucket_id in ('produtos', 'servicos')
  and (select private.eh_admin())
);

create policy auto_ct_catalog_images_admin_update
on storage.objects for update to authenticated
using (
  bucket_id in ('produtos', 'servicos')
  and (select private.eh_admin())
)
with check (
  bucket_id in ('produtos', 'servicos')
  and (select private.eh_admin())
);

create policy auto_ct_catalog_images_admin_delete
on storage.objects for delete to authenticated
using (
  bucket_id in ('produtos', 'servicos')
  and (select private.eh_admin())
);

commit;
