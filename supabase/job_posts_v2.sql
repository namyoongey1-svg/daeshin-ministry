-- 직접 올리는 청빙공고를 실제로 쓸 수 있게 손본다.
--
-- schema.sql 에 뼈대는 있었지만 폼을 붙인 적이 없어, 막상 쓰려니 빠진 것이
-- 셋이었다.
--
--   하나, 제목 칸이 없다. 목록은 제목으로 읽는다.
--   둘, 교단 칸이 없다. 교회는 같은 교단 사람만 뽑는 일이 많아 구직자에게
--       가장 먼저 필요한 조건인데, 수집한 공고에서는 44%만 알 수 있다.
--       직접 올리는 공고에서까지 모르면 만드는 뜻이 없다.
--   셋, 비회원이 보는 뷰에 교회 이름이 없다. 어느 교회인지 모르는 청빙공고는
--       읽을 이유가 없다. 연락처만 가리면 된다.

-- ---------------------------------------------------------------- 교회
-- presbytery 는 처음에 노회를 받을 생각으로 지은 이름이고 화면 라벨은 "교단"
-- 이다. profiles 와 같은 이름을 쓰던 것이라 그대로 두고, 고른 값만 제한한다.
alter table churches
  add column if not exists denomination text;

update churches set denomination = presbytery where denomination is null;

alter table churches
  alter column denomination set not null;

-- 자유 입력이면 "예장", "예장합동", "합동"이 다 따로 쌓여 거를 수가 없다.
alter table churches
  drop constraint if exists churches_denomination_check;
alter table churches
  add constraint churches_denomination_check check (denomination in (
    '예장 합동', '예장 통합', '예장 대신', '예장 백석', '예장 고신',
    '예장 합신', '예장 개혁', '기장',
    '기독교대한감리회', '기독교대한성결교회', '예수교대한성결교회',
    '기독교한국침례회', '기독교대한하나님의성회',
    '대한성공회', '구세군', '독립교단', '기타'
  ));

-- 같은 교회를 여러 번 등록하면 목록이 지저분해진다.
create unique index if not exists churches_name_region_idx on churches (name, region);

-- ------------------------------------------------------------ 청빙공고
alter table job_posts
  add column if not exists title text not null default '';

alter table job_posts
  add column if not exists department text;

-- 승인 회원만 글을 쓸 수 있으므로 검수를 한 번 더 두지 않는다. 작은 공동체에서
-- 두 번 승인은 공고가 묻히는 길이다. 마감 처리에는 status 를 그대로 쓴다.
alter table job_posts
  alter column status set default '게시';

-- ------------------------------------------- 비회원에게 보여줄 안전한 뷰
-- 연락처만 뺀다. 교회 이름과 교단은 공고의 핵심이라 빼면 볼 이유가 없어진다.
drop view if exists job_posts_public;

create view job_posts_public
with (security_invoker = off) as
  select
    p.id,
    p.title,
    p.position,
    p.employment,
    p.department,
    p.region,
    p.duties,
    p.pay_min, p.pay_max, p.pay_note, p.housing,
    p.deadline,
    p.created_at,
    c.name         as church_name,
    c.denomination as denomination,
    c.address      as church_address
  from job_posts p
  join churches c on c.id = p.church_id
  where p.status = '게시';

grant select on job_posts_public to anon, authenticated;

-- ---------------------------------------------------------------- 알림
-- 교단은 구직자가 가장 먼저 거르는 조건이라, 알림에도 걸 수 있어야 한다.
-- 비워 두면 "전체"를 뜻한다 — 지역·직분 칸과 같은 규칙이다.
alter table job_alerts
  add column if not exists denomination text;
