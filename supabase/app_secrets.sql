-- 자동으로 도는 일이 쓰는 열쇠와 기록
-- 적용: Supabase 대시보드 > SQL Editor 에서 실행
--
-- 스레드 토큰은 60일짜리라, 매일 도는 일이 일주일마다 연장해서 여기 적어 둔다.
-- 그러면 사람이 두 달마다 토큰을 갈아 끼우지 않아도 된다.
--
-- 아무에게도 열지 않는다. RLS 를 켜고 정책을 하나도 두지 않으면 anon 도
-- 로그인한 사람도 못 읽는다. 서비스 롤 열쇠를 가진 GitHub Actions 만 읽고 쓴다.

create table if not exists app_secrets (
  name       text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table app_secrets enable row level security;
