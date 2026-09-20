-- 첫 운영진 지정 (딱 한 번만 실행)
--
-- 가입 신청은 운영진이 승인하는데, 맨 처음에는 승인해 줄 운영진이 없다.
-- 그래서 첫 사람은 직접 올려 준다.
--
-- 순서:
--   1. 사이트 /login 에서 본인 메일로 로그인
--   2. /account 에서 소속 교회·노회·직분을 적어 가입 신청 (상태: 대기)
--   3. 아래 메일 주소를 본인 것으로 바꾸고 Supabase SQL Editor 에서 실행
--   4. /account 를 새로고침하면 상태가 '승인', 역할이 '운영진'으로 바뀐다

update profiles
   set role = '운영진',
       status = '승인'
 where id = (select id from auth.users where email = '여기에@메일주소.com');

-- 잘 됐는지 확인
select p.name, p.church_name, p.presbytery, p.role, p.status, u.email
  from profiles p
  join auth.users u on u.id = p.id
 order by p.created_at;
