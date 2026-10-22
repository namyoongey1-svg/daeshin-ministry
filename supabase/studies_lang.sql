-- 원어 스터디 언어
-- 적용: Supabase 대시보드 > SQL Editor 에서 실행 (studies.sql 다음에)
--
-- 헬라어·히브리어는 본문이 정하지만, 라틴어(불가타)는 어느 책이든 고를 수
-- 있어 따로 적어 둔다. 예전 글은 본문으로 언어를 정한다.

alter table studies add column if not exists lang text not null default 'grc';
alter table studies drop constraint if exists studies_lang_check;
alter table studies add constraint studies_lang_check check (lang in ('grc', 'hbo', 'lat'));

-- 이미 올린 구약 스터디는 히브리어로 맞춘다.
update studies set lang = 'hbo'
 where lang = 'grc'
   and book in ('Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr',
                'Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel',
                'Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal');
