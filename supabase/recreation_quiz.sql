-- 교회 레크리에이션 나눔과 설교 퀴즈
-- 적용: Supabase 대시보드 > SQL Editor 에서 실행 (schema.sql, alerts_qna.sql 이후)

-- ------------------------------------------------------- 레크리에이션 나눔
--
-- 수련회나 공동체 모임을 준비할 때마다 같은 것을 처음부터 다시 짠다. 해 본
-- 사람이 적어 두면 다음 사람이 그대로 쓸 수 있다.
--
-- 인원·장소·시간·준비물을 따로 받는다. 본문에 섞어 적으면 "우리 교회에서
-- 할 수 있나"를 판단하려고 글을 끝까지 읽어야 한다. 중고등부 30명 실내
-- 20분짜리를 찾는 사람이 한눈에 거를 수 있어야 한다.
create table recreations (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references profiles(id) on delete cascade,
  title       text not null,
  -- 아이스브레이킹 / 팀대항 / 성경퀴즈 / 야외 / 실내 …
  category    text not null default '기타',
  /* 최소·최대 인원. 비우면 "상관없음" */
  min_people  integer,
  max_people  integer,
  /* 실내 / 야외 / 상관없음 */
  place       text not null default '상관없음',
  /* 진행에 걸리는 시간(분) */
  minutes     integer,
  /* 어느 또래를 데리고 하는 놀이인가 — 유초등부, 중고등부, 청년부, 장년부, 전체 */
  age_group   text not null default '전체',
  supplies    text not null default '',
  body        text not null,
  created_at  timestamptz not null default now()
);

create index recreations_browse_idx on recreations (created_at desc);

-- 해 보고 좋았다는 표시. 댓글보다 가볍고, 다음 사람이 고르는 데 도움이 된다.
create table recreation_likes (
  recreation_id uuid not null references recreations(id) on delete cascade,
  profile_id    uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (recreation_id, profile_id)
);

-- ---------------------------------------------------------------- 설교 퀴즈
--
-- 설교를 마치고 바로 푸는 퀴즈. 들은 것을 한 번 더 붙잡게 하는 것이 목적이지
-- 등수를 매기는 것이 목적이 아니다.
--
-- 참여자에게 로그인을 요구하지 않는다. 주일 예배가 끝나고 2분 안에 시작해야
-- 하는데 가입부터 시키면 아무도 안 한다. 이름만 적고 들어온다.
create table quizzes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  title       text not null,
  /* 설교 본문이나 제목. 비워도 된다. */
  sermon      text not null default '',
  /* 참여자가 입력하는 여섯 자리 코드. 화면에 크게 띄운다. */
  code        text not null unique,
  /* 닫으면 더 이상 답을 받지 않는다. */
  open        boolean not null default true,
  created_at  timestamptz not null default now()
);

create table quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references quizzes(id) on delete cascade,
  /* 1부터. 보여 주는 차례다. */
  position    integer not null,
  prompt      text not null,
  /* 보기 2~5개 */
  choices     text[] not null,
  /* 정답이 choices 의 몇 번째인가. 0부터 센다. */
  answer      integer not null,
  /* 왜 그것이 답인지. 채점 뒤에 보여 준다 — 틀린 사람에게 이게 제일 중요하다. */
  note        text not null default '',
  constraint choices_enough check (array_length(choices, 1) between 2 and 5),
  constraint answer_in_range check (answer >= 0 and answer < array_length(choices, 1)),
  unique (quiz_id, position)
);

-- 한 사람의 한 번 풀이. 로그인하지 않으므로 이름만 받는다.
create table quiz_plays (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references quizzes(id) on delete cascade,
  player      text not null,
  /* 고른 답들. 문제 차례대로 넣는다. */
  answers     integer[] not null default '{}',
  score       integer not null default 0,
  finished_at timestamptz,
  created_at  timestamptz not null default now()
);

create index quiz_plays_board_idx on quiz_plays (quiz_id, score desc, finished_at);

-- ---------------------------------------------------------------- RLS
alter table recreations      enable row level security;
alter table recreation_likes enable row level security;
alter table quizzes          enable row level security;
alter table quiz_questions   enable row level security;
alter table quiz_plays       enable row level security;

-- 레크리에이션은 승인 회원이 모두 읽는다. 고치고 지우는 것은 쓴 사람만.
create policy "레크 읽기" on recreations
  for select using (is_approved());
create policy "레크 쓰기" on recreations
  for insert with check (author_id = auth.uid() and is_approved());
create policy "내 레크 고치기" on recreations
  for update using (author_id = auth.uid() or is_admin());
create policy "내 레크 지우기" on recreations
  for delete using (author_id = auth.uid() or is_admin());

create policy "좋아요 읽기" on recreation_likes
  for select using (is_approved());
create policy "내 좋아요" on recreation_likes
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- 퀴즈를 만들고 고치는 것은 승인 회원. 푸는 것은 누구나 — 아래 뷰와 함수로 연다.
create policy "내 퀴즈 보기" on quizzes
  for select using (owner_id = auth.uid() or is_admin());
create policy "퀴즈 만들기" on quizzes
  for insert with check (owner_id = auth.uid() and is_approved());
create policy "내 퀴즈 고치기" on quizzes
  for update using (owner_id = auth.uid() or is_admin());
create policy "내 퀴즈 지우기" on quizzes
  for delete using (owner_id = auth.uid() or is_admin());

create policy "내 퀴즈 문제" on quiz_questions
  for all using (
    exists (select 1 from quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  ) with check (
    exists (select 1 from quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  );

-- 푼 기록은 퀴즈 주인만 원본을 본다. 참여자에게는 아래 순위 뷰만 내준다.
create policy "내 퀴즈의 풀이" on quiz_plays
  for select using (
    exists (select 1 from quizzes q where q.id = quiz_id and q.owner_id = auth.uid())
  );

-- --------------------------------------------- 참여자에게 열어 주는 뷰와 함수
--
-- 참여자는 로그인하지 않으므로 anon 으로 들어온다. 테이블을 통째로 열면
-- 정답까지 읽히니, 정답을 뺀 뷰만 내준다.

create view quiz_open
with (security_invoker = off) as
  select q.id, q.title, q.sermon, q.code, q.open,
         (select count(*) from quiz_questions qq where qq.quiz_id = q.id) as question_count
    from quizzes q
   where q.open;

-- 정답(answer)과 풀이(note)를 뺀다. 채점은 서버에서 한다.
create view quiz_open_questions
with (security_invoker = off) as
  select qq.id, qq.quiz_id, qq.position, qq.prompt, qq.choices
    from quiz_questions qq
    join quizzes q on q.id = qq.quiz_id
   where q.open;

-- 순위표. 이름과 점수만 나간다.
create view quiz_board
with (security_invoker = off) as
  select p.quiz_id, p.player, p.score, p.finished_at
    from quiz_plays p
   where p.finished_at is not null;

grant select on quiz_open, quiz_open_questions, quiz_board to anon, authenticated;

/*
  채점.

  정답을 클라이언트로 내보내지 않으려면 서버에서 매겨야 한다. security definer
  로 두어 anon 도 부를 수 있게 하되, 하는 일은 딱 하나다 — 답을 받아 점수를
  돌려주고 기록을 남긴다.

  같은 사람이 여러 번 풀 수 있게 둔다. 설교를 다시 듣고 또 푸는 것을 막을
  이유가 없다. 순위표에는 가장 높은 점수만 보이게 화면에서 추린다.
*/
create or replace function grade_quiz(quiz_code text, player_name text, picked integer[])
returns table (score integer, total integer, correct integer[], notes text[])
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  answers   integer[];
  notes_arr text[];
  got       integer := 0;
  i         integer;
begin
  select id into target_id from quizzes where code = quiz_code and open;
  if target_id is null then
    raise exception '열려 있는 퀴즈가 아닙니다.';
  end if;

  select array_agg(qq.answer order by qq.position), array_agg(qq.note order by qq.position)
    into answers, notes_arr
    from quiz_questions qq
   where qq.quiz_id = target_id;

  for i in 1 .. coalesce(array_length(answers, 1), 0) loop
    if picked[i] is not null and picked[i] = answers[i] then
      got := got + 1;
    end if;
  end loop;

  insert into quiz_plays (quiz_id, player, answers, score, finished_at)
  values (target_id, left(trim(player_name), 20), picked, got, now());

  return query select got, coalesce(array_length(answers, 1), 0), answers, notes_arr;
end;
$$;

grant execute on function grade_quiz(text, text, integer[]) to anon, authenticated;

-- ----------------------------------------- 레크리에이션 열람용 뷰
-- 글쓴이 id 를 빼고, 좋아요 수와 내가 눌렀는지를 붙여 내보낸다.
create view recreations_public
with (security_invoker = off) as
  select r.id, r.title, r.category,
         r.min_people, r.max_people, r.place, r.minutes, r.age_group,
         r.supplies, r.body, r.created_at,
         (select count(*) from recreation_likes l where l.recreation_id = r.id) as like_count,
         exists (
           select 1 from recreation_likes l
            where l.recreation_id = r.id and l.profile_id = auth.uid()
         ) as liked,
         (r.author_id = auth.uid()) as mine
    from recreations r
   where is_approved();

grant select on recreations_public to authenticated;
