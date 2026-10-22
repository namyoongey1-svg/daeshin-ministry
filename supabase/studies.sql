-- 원어 스터디
-- 적용: Supabase 대시보드 > SQL Editor 에서 실행 (recreation_quiz.sql 다음에)
--
-- 매주 원어로 읽는 본문 한 단락을 올려 둔다. 본문 자체는 사이트가 가진
-- 파싱 데이터에서 그때그때 그리므로 여기에는 "어디를 읽었나"와 인도자의
-- 메모만 둔다. 퀴즈는 기존 퀴즈 표(quizzes)에 만들고 코드만 적어 둔다.
--
-- 공개가 기본이다. 모임에 못 온 사람이 봐야 하고, 스레드에 링크로 보내려면
-- 로그인 없이 열려야 한다. 메모를 공개하고 싶지 않으면 published 를 끈다.

create table if not exists studies (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  /* 사람이 적은 그대로. "요 1:1-5" */
  passage     text not null,
  book        text not null,          -- OSIS 약어. "John"
  chapter     integer not null,
  verse_from  integer not null,
  verse_to    integer not null,
  notes       text not null default '',
  /* quizzes.code. 퀴즈를 못 만들었으면 null */
  quiz_code   text,
  published   boolean not null default true,
  created_by  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint verse_range check (verse_from >= 1 and verse_to >= verse_from)
);

alter table studies enable row level security;

create policy "공개 스터디 읽기" on studies
  for select using (published or created_by = auth.uid() or is_admin());
create policy "승인 회원이 스터디 쓰기" on studies
  for insert with check (created_by = auth.uid() and is_approved());
create policy "내 스터디 고치기" on studies
  for update using (created_by = auth.uid() or is_admin());
create policy "내 스터디 지우기" on studies
  for delete using (created_by = auth.uid() or is_admin());
