-- 찬양 콘티를 계정에 저장한다.
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행
--
-- 콘티는 조회하거나 집계하는 자료가 아니라 한 덩어리로 읽고 쓰는 문서다.
-- 곡 하나를 표의 한 줄로 쪼개 두면 저장할 때마다 지우고 다시 넣어야 하고,
-- 칸이 하나 늘 때마다 마이그레이션이 필요하다. 본문은 jsonb 한 칸에 담고,
-- 목록 화면에 필요한 것(이름·날짜·곡 수)만 밖으로 꺼내 둔다.

-- 주인은 profiles 가 아니라 auth.users 를 가리킨다.
-- 다른 표는 profiles(id) 를 가리키지만, 그러면 카카오로 막 들어와 소속을
-- 아직 적지 않은 사람은 콘티를 저장할 수 없다. 소속 확인은 교회 연락처를
-- 볼 때 필요한 것이지, 자기 콘티를 적는 데 받을 문턱이 아니다.
create table if not exists setlists (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users on delete cascade,

  -- 목록에 보여 줄 값. data 안에도 같은 값이 있지만, 목록을 그리자고
  -- 콘티 본문을 전부 읽어 올 이유는 없다.
  title        text not null,
  service_date date,
  song_count   integer not null default 0,

  data         jsonb not null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 내 콘티를 최근 것부터 본다.
create index if not exists setlists_owner_recent
  on setlists (owner_id, updated_at desc);

alter table setlists enable row level security;

-- 남의 콘티는 보이지도, 고쳐지지도 않는다. 공유 기능은 아직 없다.
drop policy if exists "내 콘티" on setlists;
create policy "내 콘티" on setlists
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 저장할 때마다 updated_at 을 손으로 넣지 않게 한다. 목록 정렬이 여기 달려 있어
-- 한 번 빠뜨리면 순서가 조용히 틀어진다.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists setlists_touch on setlists;
create trigger setlists_touch
  before update on setlists
  for each row execute function touch_updated_at();
