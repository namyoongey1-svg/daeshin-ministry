-- 교육부서 명단 · 출석 · 생일.
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행
--
-- 여기 들어가는 것은 대부분 미성년자의 개인정보다. 이름·생일·보호자 연락처가
-- 한 줄에 모이면, 흩어져 있을 때보다 훨씬 민감한 자료가 된다. 그래서
--   1) 오직 등록한 본인만 읽고 쓴다 (RLS, 아래)
--   2) 보호자 연락처는 선택 항목으로 둔다 — 없어도 출석과 생일은 된다
--   3) 화면에 보관 책임과 동의 문제를 적어 둔다
-- 교역자가 바뀌면 명단도 함께 넘겨야 하므로 엑셀로 내려받을 수 있게 했다.

create table if not exists students (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users on delete cascade,

  name        text not null,
  -- 반·부서. "초등부 3학년", "유치부 사랑반" 처럼 자유롭게 적는다.
  class_name  text not null default '',
  -- 생일. 연도를 모르면 비워 둘 수 있게 월·일만 따로 둔다.
  birth_month integer check (birth_month between 1 and 12),
  birth_day   integer check (birth_day between 1 and 31),
  birth_year  integer check (birth_year between 1900 and 2200),

  guardian      text not null default '',
  guardian_phone text not null default '',
  note        text not null default '',
  -- 졸업하거나 옮겨 간 아이는 지우지 않고 내린다. 지난 출석 기록이 남아야 한다.
  active      boolean not null default true,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists students_owner on students (owner_id, class_name, name);
create index if not exists students_birthday on students (owner_id, birth_month, birth_day);

alter table students enable row level security;

drop policy if exists "내 명단" on students;
create policy "내 명단" on students
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop trigger if exists students_touch on students;
create trigger students_touch
  before update on students
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------------ 출석
-- 한 아이의 한 날짜에 한 줄. 안 온 날은 줄을 만들지 않는다 —
-- "결석"을 일일이 적어 두면 명단이 바뀔 때마다 빈 줄이 쌓인다.
create table if not exists attendance (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  on_date    date not null,
  created_at timestamptz not null default now(),

  unique (student_id, on_date)
);

create index if not exists attendance_owner_date on attendance (owner_id, on_date);

alter table attendance enable row level security;

drop policy if exists "내 출석" on attendance;
create policy "내 출석" on attendance
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
