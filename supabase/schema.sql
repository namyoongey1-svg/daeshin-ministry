-- 대신 교역자 사역자톡방 — 1단계(청빙·구직) 스키마
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행

create type member_role   as enum ('사역자', '교회', '운영진');
create type member_status as enum ('대기', '승인', '거절');

-- ---------------------------------------------------------------- 회원
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null,
  phone       text,
  church_name text not null,
  presbytery  text not null,          -- 노회
  position    text not null,          -- 직분
  role        member_role   not null default '사역자',
  status      member_status not null default '대기',
  created_at  timestamptz not null default now()
);

-- 승인 여부를 정책에서 반복해 쓰므로 함수로 묶는다.
create or replace function is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and status = '승인'
  );
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = '운영진' and status = '승인'
  );
$$;

-- ---------------------------------------------------------------- 교회
create table churches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  presbytery  text not null,
  region      text not null,
  address     text,
  pastor      text,
  verified    boolean not null default false,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------ 청빙공고
create table job_posts (
  id          uuid primary key default gen_random_uuid(),
  church_id   uuid not null references churches(id) on delete cascade,
  position    text not null,          -- 부목사 / 전도사 / 교육전도사 ...
  employment  text not null,          -- 전임 / 파트 / 협동
  region      text not null,
  duties      text not null,
  -- 사례비는 범위로 공개하되, 비공개면 사유를 반드시 남긴다.
  pay_min     integer,
  pay_max     integer,
  pay_note    text not null default '',
  housing     boolean not null default false,
  deadline    date,
  -- 연락처는 승인 회원에게만 보인다 (아래 RLS + public 뷰 참고)
  contact_name  text not null,
  contact_phone text not null,
  status      text not null default '검수대기',  -- 검수대기 / 게시 / 마감
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now(),
  constraint pay_disclosure check (
    (pay_min is not null and pay_max is not null) or pay_note <> ''
  )
);

create index job_posts_browse_idx on job_posts (status, region, position, created_at desc);

create table applications (
  id           uuid primary key default gen_random_uuid(),
  job_post_id  uuid not null references job_posts(id) on delete cascade,
  applicant_id uuid not null references profiles(id) on delete cascade,
  memo         text,
  created_at   timestamptz not null default now(),
  unique (job_post_id, applicant_id)
);

create table bookmarks (
  profile_id  uuid not null references profiles(id) on delete cascade,
  job_post_id uuid not null references job_posts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (profile_id, job_post_id)
);

-- ---------------------------------------------------------------- RLS
alter table profiles     enable row level security;
alter table churches     enable row level security;
alter table job_posts    enable row level security;
alter table applications enable row level security;
alter table bookmarks    enable row level security;

create policy "본인 프로필 조회" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "본인 프로필 생성" on profiles
  for insert with check (id = auth.uid());
create policy "본인 프로필 수정" on profiles
  for update using (id = auth.uid() or is_admin());

create policy "교회 목록은 승인 회원" on churches
  for select using (is_approved());
create policy "교회 등록" on churches
  for insert with check (auth.uid() is not null);

-- 연락처가 들어 있는 원본 테이블은 승인 회원만 읽는다.
create policy "공고 조회는 승인 회원" on job_posts
  for select using (is_approved() and (status = '게시' or created_by = auth.uid() or is_admin()));
create policy "공고 등록" on job_posts
  for insert with check (created_by = auth.uid() and is_approved());
create policy "공고 수정" on job_posts
  for update using (created_by = auth.uid() or is_admin());

create policy "지원 내역은 본인과 공고 등록자" on applications
  for select using (
    applicant_id = auth.uid()
    or is_admin()
    or exists (select 1 from job_posts p where p.id = job_post_id and p.created_by = auth.uid())
  );
create policy "지원하기" on applications
  for insert with check (applicant_id = auth.uid() and is_approved());

create policy "내 스크랩" on bookmarks
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ------------------------------------------- 비회원에게 보여줄 안전한 뷰
-- 연락처 열을 아예 빼서, 랜딩·목록 미리보기에 쓴다.
create view job_posts_public
with (security_invoker = off) as
  select id, position, employment, region, duties,
         pay_min, pay_max, pay_note, housing, deadline, created_at
  from job_posts
  where status = '게시';

grant select on job_posts_public to anon, authenticated;
