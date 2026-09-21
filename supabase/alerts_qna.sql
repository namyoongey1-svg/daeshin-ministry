-- 새 공고 알림과 익명 사역 Q&A
-- 적용: Supabase 대시보드 > SQL Editor 에서 실행 (schema.sql 이후)

-- ------------------------------------------------------- 새 공고 알림 구독
create table job_alerts (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  -- 비워 두면 "전체". 세 가지를 모두 비우면 모든 새 공고를 받는다.
  region       text,
  position     text,
  employment   text,
  active       boolean not null default true,
  -- 어디까지 알렸는지. 같은 공고를 두 번 보내지 않으려고 둔다.
  last_notified_at timestamptz,
  created_at   timestamptz not null default now()
);

create index job_alerts_active_idx on job_alerts (active, profile_id);

alter table job_alerts enable row level security;

create policy "내 알림만" on job_alerts
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ------------------------------------------------------------ 익명 사역 Q&A
create table questions (
  id         uuid primary key default gen_random_uuid(),
  -- 화면에는 드러내지 않는다. 아래 뷰에서 이 칸을 빼고 내보낸다.
  author_id  uuid not null references profiles(id) on delete cascade,
  topic      text not null default '기타',
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

create table answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index questions_recent_idx on questions (created_at desc, topic);
create index answers_by_question_idx on answers (question_id, created_at);

alter table questions enable row level security;
alter table answers   enable row level security;

-- 본체 테이블은 본인과 운영진만 직접 읽는다. 남의 글은 아래 뷰로만 본다.
-- (RLS는 행을 가릴 뿐 칸을 가리지 못하므로, 글쓴이 칸을 뺀 뷰를 따로 둔다.)
create policy "내 질문" on questions
  for select using (author_id = auth.uid() or is_admin());
create policy "질문 쓰기" on questions
  for insert with check (author_id = auth.uid() and is_approved());
create policy "내 질문 고치기" on questions
  for update using (author_id = auth.uid());
create policy "내 질문 지우기" on questions
  for delete using (author_id = auth.uid() or is_admin());

create policy "내 답변" on answers
  for select using (author_id = auth.uid() or is_admin());
create policy "답변 쓰기" on answers
  for insert with check (author_id = auth.uid() and is_approved());
create policy "내 답변 고치기" on answers
  for update using (author_id = auth.uid());
create policy "내 답변 지우기" on answers
  for delete using (author_id = auth.uid() or is_admin());

-- ------------------------------------------------- 글쓴이를 뺀 열람용 뷰
-- security_invoker = off 이므로 뷰는 주인 권한으로 돈다. 대신 본문에
-- is_approved() 를 걸어, 승인되지 않은 사람에게는 한 줄도 보이지 않게 한다.
create view questions_public
with (security_invoker = off) as
  select q.id,
         q.topic,
         q.title,
         q.body,
         q.created_at,
         (select count(*) from answers a where a.question_id = q.id) as answer_count,
         (q.author_id = auth.uid())                                  as mine
    from questions q
   where is_approved();

create view answers_public
with (security_invoker = off) as
  select a.id,
         a.question_id,
         a.body,
         a.created_at,
         (a.author_id = auth.uid()) as mine
    from answers a
   where is_approved();

grant select on questions_public, answers_public to authenticated;

-- 글쓴이는 운영진만 확인할 수 있다. 신고나 정리에 필요한 최소한이고,
-- 그 사실을 화면에도 적어 둔다. "익명"이 "아무도 모른다"로 읽히면 안 된다.
