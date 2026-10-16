-- 로그인 없이 접수하는 청빙공고
-- 적용: Supabase 대시보드 > SQL Editor 에서 실행
--
-- 교회가 직접 올리려면 로그인·가입·승인 세 관문을 지나야 했다. 담임목사님이나
-- 행정 담당자가 그 길을 다 가지는 않는다. 그래서 양식 하나로 접수만 받고,
-- 운영진이 확인한 뒤 게시한다. 접수된 글은 아무에게도 보이지 않는다 —
-- 운영진이 "게시"를 눌러 job_posts 로 옮길 때 비로소 목록에 오른다.
--
-- 칸은 job_posts 와 같다. 게시할 때 그대로 옮기기 위해서다.

create table if not exists job_submissions (
  id            uuid primary key default gen_random_uuid(),
  church_name   text not null,
  denomination  text not null,
  region        text not null,
  address       text,
  pastor        text,
  title         text not null,
  position      text not null,
  employment    text not null,
  department    text,
  duties        text not null,
  pay_min       integer,
  pay_max       integer,
  pay_note      text not null default '',
  housing       boolean not null default false,
  deadline      date,
  contact_name  text not null,
  contact_phone text not null,
  status        text not null default '대기',   -- 대기 / 게시 / 거절
  -- 게시했으면 어느 공고가 되었는지
  job_post_id   uuid references job_posts(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint submission_pay_disclosure check (
    (pay_min is not null and pay_max is not null) or pay_note <> ''
  )
);

alter table job_submissions enable row level security;

-- 누구나 넣을 수 있고, 운영진만 읽고 처리한다. 넣은 사람도 다시 읽을 수 없다 —
-- 연락처가 들어 있어 익명으로 열어 두면 안 된다.
create policy "누구나 접수" on job_submissions
  for insert with check (true);
create policy "운영진만 조회" on job_submissions
  for select using (is_admin());
create policy "운영진만 처리" on job_submissions
  for update using (is_admin());
