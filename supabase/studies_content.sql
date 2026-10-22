-- 원어 스터디 문서 내용
-- 적용: Supabase 대시보드 > SQL Editor 에서 실행 (studies_lang.sql 다음에)
--
-- 인도자가 매주 쓰는 워드 문서(한 절을 세 언어로, 낱말마다 뜻과 연상 팁)를
-- 그대로 올린다. 구조로 읽어 content 에 둔다. 문서로 올린 글은 책·장·절을
-- 못 읽을 수도 있어 그 칸들을 비워 둘 수 있게 한다.

alter table studies add column if not exists content jsonb;
alter table studies alter column book drop not null;
alter table studies alter column chapter drop not null;
alter table studies alter column verse_from drop not null;
alter table studies alter column verse_to drop not null;
