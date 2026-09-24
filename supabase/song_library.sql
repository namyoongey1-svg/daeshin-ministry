-- 곡 라이브러리.
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행
-- 먼저 sheets.sql 을 실행해 두어야 합니다 (이 파일이 sheets 표를 고칩니다).
--
-- 악보를 콘티에 붙여 두면 같은 곡을 다음 달에 또 부를 때 다시 올려야 한다.
-- 악보는 콘티가 아니라 곡에 붙는 물건이다. 곡을 한 번 등록해 두면 키·박자·
-- 송폼·악보가 함께 따라온다.

create table if not exists library_songs (
  id           uuid primary key default gen_random_uuid(),
  -- 콘티·악보와 같은 이유로 auth.users 를 가리킨다. 소속을 적지 않은 사람도 쓴다.
  owner_id     uuid not null references auth.users on delete cascade,

  title        text not null,
  -- 악보에 적힌 조. 예배마다 바꿔 부르는 조는 콘티 쪽에 남는다.
  original_key text not null default '',
  bpm          text not null default '',
  meter        text not null default '4/4',
  -- 이 곡을 보통 어떤 순서로 부르는지. 콘티에서 고치면 그 콘티에만 남는다.
  form         text not null default '',
  note         text not null default '',
  -- 참고 영상(유튜브 등). 링크만 두고 재생은 하지 않는다.
  link         text not null default '',

  favorite     boolean not null default false,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 같은 곡을 두 번 등록하지 않게 한다. 제목이 같으면 같은 곡으로 본다.
create unique index if not exists library_songs_owner_title
  on library_songs (owner_id, title);

create index if not exists library_songs_owner_recent
  on library_songs (owner_id, updated_at desc);

alter table library_songs enable row level security;

drop policy if exists "내 곡" on library_songs;
create policy "내 곡" on library_songs
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop trigger if exists library_songs_touch on library_songs;
create trigger library_songs_touch
  before update on library_songs
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------ 악보 ↔ 곡
-- 악보는 곡에 붙는다. 한 곡에 여러 장(코드보·악보·가사)이 붙을 수 있다.
-- 곡 없이 올려 둔 악보도 그대로 두므로 비워 둘 수 있게 한다.
alter table sheets
  add column if not exists song_id uuid references library_songs(id) on delete set null;

create index if not exists sheets_song on sheets (song_id);
