-- Road to Legend 클라우드 저장 (v44): Supabase 대시보드 → SQL Editor에 붙여 넣고 Run
-- 1) 비공개 버킷 'saves' (파일 하나 최대 50MB)
insert into storage.buckets (id, name, public, file_size_limit)
values ('saves', 'saves', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- 2) 로그인한 사용자는 자기 폴더(saves/<자기 id>/...)만 읽고·쓰고·지울 수 있다
drop policy if exists "rtl saves select own" on storage.objects;
drop policy if exists "rtl saves insert own" on storage.objects;
drop policy if exists "rtl saves update own" on storage.objects;
drop policy if exists "rtl saves delete own" on storage.objects;
create policy "rtl saves select own" on storage.objects for select to authenticated
  using (bucket_id = 'saves' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "rtl saves insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'saves' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "rtl saves update own" on storage.objects for update to authenticated
  using (bucket_id = 'saves' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'saves' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "rtl saves delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'saves' and (storage.foldername(name))[1] = auth.uid()::text);
