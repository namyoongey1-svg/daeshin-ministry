-- 외부 청빙게시판 수집분 — JSON 파일에서 옮겨 올 때 쓴다.
-- 적용: Supabase 대시보드 > SQL Editor 에서 실행 (schema.sql 이후)

create table scraped_posts (
  source        text not null,          -- godpeople / baekseok / aats
  external_id   text not null,          -- 출처 안에서의 글번호
  url           text not null,          -- 원문 링크 (본문은 저장하지 않는다)
  title         text not null,
  church        text,
  region_raw    text,
  region        text,
  positions     text[] not null default '{}',
  departments   text[] not null default '{}',
  tags_raw      text[] not null default '{}',
  posted_at     date,
  deadline      date,
  deadline_text text,
  collected_at  timestamptz not null default now(),
  primary key (source, external_id)
);

create index scraped_posts_browse_idx
  on scraped_posts (posted_at desc, region, source);

-- 교회가 같은 공고를 여러 번 올리므로, 목록에서는 내용 기준으로 묶는다.
create index scraped_posts_repost_idx
  on scraped_posts (source, church, title);

create view scraped_posts_latest as
  select distinct on (source, church, title)
         source, external_id, url, title, church, region_raw, region,
         positions, departments, posted_at, deadline, deadline_text,
         count(*) over (partition by source, church, title) as repost_count
    from scraped_posts
   order by source, church, title, posted_at desc nulls last;

-- 수집 데이터는 이미 공개된 사실 정보라 로그인 없이도 읽게 둔다.
-- 쓰기는 서비스 롤(수집 스크립트)만 한다.
alter table scraped_posts enable row level security;

create policy "수집 공고는 누구나 조회" on scraped_posts
  for select using (true);

grant select on scraped_posts, scraped_posts_latest to anon, authenticated;
