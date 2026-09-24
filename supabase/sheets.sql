-- 악보 보관함.
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행
--
-- 파일 자체는 Storage 에 두고, 표에는 어떤 파일인지만 적는다.
-- 악보는 한 번 올려 두고 여러 콘티에서 다시 쓰는 물건이라 콘티와 따로 둔다.

-- ------------------------------------------------------------------ 표
create table if not exists sheets (
  id         uuid primary key default gen_random_uuid(),
  -- 콘티와 같은 이유로 profiles 가 아니라 auth.users 를 가리킨다.
  owner_id   uuid not null references auth.users on delete cascade,

  title      text not null,
  -- storage 의 객체 경로. 반드시 '<owner_id>/...' 로 시작한다 (아래 정책이 그 규칙에 기댄다).
  path       text not null unique,
  -- application/pdf 또는 image/png · image/jpeg
  mime       text not null,
  size_bytes integer not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists sheets_owner_recent
  on sheets (owner_id, created_at desc);

alter table sheets enable row level security;

drop policy if exists "내 악보" on sheets;
create policy "내 악보" on sheets
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- -------------------------------------------------------------- 저장소
-- 비공개 버킷. 파일은 로그인한 본인만 읽는다. 악보는 출판사 저작물인 경우가
-- 많아 공개 링크로 열어 두면 안 된다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sheets', 'sheets', false, 20971520,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 경로 첫 칸이 자기 uuid 인 파일만 다룰 수 있다.
-- storage.foldername(name) 이 경로를 칸별로 잘라 준다.
drop policy if exists "내 악보 파일 읽기" on storage.objects;
create policy "내 악보 파일 읽기" on storage.objects
  for select using (
    bucket_id = 'sheets' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "내 악보 파일 올리기" on storage.objects;
create policy "내 악보 파일 올리기" on storage.objects
  for insert with check (
    bucket_id = 'sheets' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "내 악보 파일 지우기" on storage.objects;
create policy "내 악보 파일 지우기" on storage.objects
  for delete using (
    bucket_id = 'sheets' and (storage.foldername(name))[1] = auth.uid()::text
  );
