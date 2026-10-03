-- 사이트 방문 수
-- 적용: Supabase 대시보드 > SQL Editor 에서 실행
--
-- 누가 왔는지는 남기지 않는다. 날짜별로 숫자 둘만 센다 — 그날 들어온 사람 수와
-- 그날 열어 본 화면 수. IP 도 계정도 적지 않는다. 숫자를 보여 주려고 사람을
-- 따라다닐 이유가 없다.
--
-- "오늘 몇 명 · 전체 몇 명"은 블로그 방문자 수와 같은 셈법이다. 전체는 날마다
-- 센 사람 수를 더한 것이라, 같은 사람이 사흘 오면 셋으로 센다.

create table if not exists site_visits (
  day      date primary key,
  views    integer not null default 0,
  visitors integer not null default 0
);

-- 테이블을 직접 열지 않는다. 아래 두 함수로만 읽고 쓴다.
alter table site_visits enable row level security;

/*
  한 번 들렀다고 적는다.

  누구나 부르므로 security definer 로 둔다. 하는 일은 오늘 칸의 숫자를
  올리는 것 하나뿐이다. 날짜는 한국 시각으로 자른다 — 그대로 두면 아침
  아홉 시에 "오늘"이 바뀐다.
*/
create or replace function record_visit(new_visitor boolean)
returns void
language sql
security definer
set search_path = public
as $$
  insert into site_visits (day, views, visitors)
  values ((now() at time zone 'Asia/Seoul')::date, 1, case when new_visitor then 1 else 0 end)
  on conflict (day) do update
     set views    = site_visits.views + 1,
         visitors = site_visits.visitors + case when new_visitor then 1 else 0 end;
$$;

create or replace function site_stats()
returns table (today_visitors integer, today_views integer, total_visitors bigint, total_views bigint)
language sql
security definer
stable
set search_path = public
as $$
  select
    coalesce((select visitors from site_visits where day = (now() at time zone 'Asia/Seoul')::date), 0),
    coalesce((select views    from site_visits where day = (now() at time zone 'Asia/Seoul')::date), 0),
    coalesce((select sum(visitors) from site_visits), 0),
    coalesce((select sum(views)    from site_visits), 0);
$$;

grant execute on function record_visit(boolean) to anon, authenticated;
grant execute on function site_stats() to anon, authenticated;
