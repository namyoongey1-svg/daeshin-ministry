-- 방문자가 어디서 왔는가
-- 적용: Supabase 대시보드 > SQL Editor 에서 실행 (site_visits.sql 다음에)
--
-- 스레드에 매일 글을 올리는데 그 글이 사람을 데려오는지는 모르고 있었다.
-- 날짜별로 "어디서 온 사람이 몇 명"만 센다. 종류는 열 가지 안팎으로 고정해
-- 두고(threads·facebook·google·naver…), 주소나 글 제목은 적지 않는다.
--
-- 하루에 한 사람을 한 번만 센다. 같은 사람이 스레드에서 세 번 들어와도
-- "threads 1"이다. 새 방문자일 때만 적기 때문이다.

create table if not exists site_referrers (
  day      date not null,
  kind     text not null,
  visitors integer not null default 0,
  primary key (day, kind)
);

alter table site_referrers enable row level security;

/*
  record_visit 의 두 인자 꼴. 한 인자짜리(site_visits.sql)는 그대로 두어
  옛 화면이 열려 있어도 깨지지 않는다.

  ref 는 화면이 보낸 출처 이름이다. 아무 말이나 들어오면 표가 지저분해지므로
  아는 이름만 받는다.
*/
create or replace function record_visit(new_visitor boolean, ref text)
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

  insert into site_referrers (day, kind, visitors)
  select (now() at time zone 'Asia/Seoul')::date, ref, 1
  where new_visitor
    and ref in ('threads', 'facebook', 'instagram', 'kakao', 'google', 'naver', 'daum', 'bing', 'direct', 'other')
  on conflict (day, kind) do update
     set visitors = site_referrers.visitors + 1;
$$;

/** 최근 n일 동안 출처별 방문자 수. 많은 순. */
create or replace function referrer_stats(days integer default 7)
returns table (kind text, visitors bigint)
language sql
security definer
stable
set search_path = public
as $$
  select kind, sum(visitors)
    from site_referrers
   where day > (now() at time zone 'Asia/Seoul')::date - days
   group by kind
   order by 2 desc;
$$;

grant execute on function record_visit(boolean, text) to anon, authenticated;
grant execute on function referrer_stats(integer) to anon, authenticated;
