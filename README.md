# 대신 교역자 사역자톡방

대신 교단 사역자를 위한 청빙·구직 및 설교 준비 플랫폼.

## 실행

```bash
npm install
npm run dev
```

원어 데이터(`src/data/`)는 저장소에 포함되어 있습니다. 다시 받으려면:

```bash
npm run import:bible          # 전체
npm run import:bible greek    # 헬라어만
```

## 지금 되는 것

| 경로 | 내용 |
|---|---|
| `/` | 랜딩 — 소개와 최근 공고 |
| `/jobs` | 청빙공고 목록 — 외부 게시판 수집분, 지역·직분·출처·부서 필터 |
| `/tools/original` | 원어 파싱 뷰어 — 구약 39권 + 신약 27권 전체 |
| `/tools/original/lemma` | 사전형 용례 검색 (성경 전체) |
| `/tools/sermon` | 설교 노트 — 원어 클리핑 + 개요 + 마크다운 내보내기 |

## 청빙공고 수집

세 곳의 공개 게시판에서 공고 정보를 모읍니다.

매일 07:00(KST)에 GitHub Actions가 자동으로 돌립니다
(`.github/workflows/scrape.yml`). 저장소 Actions 탭에서 수동 실행도 됩니다.
손으로 돌릴 때는:

```bash
npm run scrape                 # 새 글이 없으면 멈춤 (정기 수집용)
npm run scrape -- godpeople    # 한 곳만
npm run scrape -- --full --pages 25
npm run scrape -- --prune 12   # 12개월 지난 공고는 버림
npm run scrape -- --delay 2000 # 요청 간격 조절
```

| 출처 | 게시판 | 특징 |
|---|---|---|
| `godpeople` | [갓피플취업](https://recruit.godpeople.com/?GO=recruit_find) | 지역·직분·부서 꼬리표가 붙어 분류가 가장 정확 |
| `baekseok` | [백석대 신대원 정보나눔터](https://www.bu.ac.kr/graduateschool/3938/subview.do) | 제목이 `[지역] 교회명` 꼴 |
| `aats` | [총신대 신대원 총동창회](http://aats.kr/main/bbs/board.php?bo_table=b05) | 제목 문장에서 직분을 추출 |

### 수집하는 것과 하지 않는 것

모으는 항목은 **교회명·지역·직분·부서·게시일·마감일과 원문 링크**입니다.
**게시물 본문과 담당자 연락처는 가져오지 않습니다.** 본문은 작성자의 저작물이고
연락처는 개인정보라, 사용자가 원문 게시판으로 가서 보도록 링크만 겁니다.
요청은 1.2초 간격으로 보내고, 출처와 연락처를 밝힌 User-Agent를 씁니다.

### 같은 공고를 두 번 담지 않기

**갓피플의 `rc_idxx`는 고정 글번호가 아니라 요청마다 새로 발급되는 토큰입니다.**
같은 공고를 두 번 받으면 토큰이 서로 다릅니다. 이걸 식별자로 쓰면 수집할 때마다
424건이 통째로 새 글로 쌓입니다. 그래서 갓피플만은 `교회명 + 제목`을 해시한 값을
식별자로 씁니다(`stableId`). 먼저 받은 토큰으로도 원문은 계속 열리므로, 링크는
처음 본 값을 그대로 둡니다 — 매일 커밋하는데 링크가 날마다 바뀌면 바뀐 것이 없는
날에도 수백 건이 다시 쓰이기 때문입니다.

교회들은 목록 위로 올리려고 같은 공고를 여러 번 다시 올립니다(한 목록 안에서
17번까지 올라온 경우가 있습니다). 화면에서는 하나로 묶고 **재게시 횟수**를 함께
보여 줍니다 — 재게시가 잦다는 것은 아직 사람을 못 구했다는 신호이기 때문입니다.

### 마감 처리

갓피플 목록은 "현재 모집 중인 공고 전체"를 뜻하므로, 끝까지 훑은 뒤 목록에서
사라진 공고는 마감(`closedAt`)으로 표시하고 `/jobs`에서 감춥니다.
백석대·총신대는 지난 글도 계속 남아 있는 게시판이라 사라짐을 마감으로 보지
않습니다(`activeListing` 플래그로 구분).

수집 결과는 `src/data/scraped/posts.json`에 쌓입니다. Supabase로 옮길 때는
`supabase/scraped_posts.sql`을 실행하세요.

## 원어 기능

- **본문**: 신약 SBLGNT 137,554단어 / 구약 OSHB 305,000여 단어 — 66권 전체
- **형태소 분석**: 시제·태·법·격·성·수를 한글 문법 용어로 풀어 표시
- **설교 포인트**: 문법 자질이 강단에서 갖는 함의를 자질별로 제시
  (예: 완료형 → "과거에 완료된 행위가 지금도 효력을 갖는다")
- **사전**: Strong's 헬라어·히브리어. 출현 기준 99.4% 매칭
- **용례 검색**: 같은 사전형이 쓰인 모든 절을 찾아 해당 낱말을 «»로 표시

### 데이터 출처와 라이선스

| 자료 | 출처 | 라이선스 |
|---|---|---|
| 헬라어 본문·형태소 | [MorphGNT / SBLGNT](https://github.com/morphgnt/sblgnt) | CC BY-SA 4.0 |
| 히브리어 본문·형태소 | [OpenScriptures OSHB](https://github.com/openscriptures/morphhb) | CC BY 4.0 |
| Strong's 사전 | [OpenScriptures](https://github.com/openscriptures/strongs) | 1890년 원본, 퍼블릭 도메인 |

SBLGNT는 CC BY-SA이므로 **출처 표시가 필수**입니다(푸터에 기재됨).

> **한글 성경 본문은 넣지 않았습니다.** 개역개정·새번역 등은 대한성서공회가
> 저작권을 갖고 있어, 사이트에 본문을 싣거나 API로 제공하려면 별도 사용 허락이
> 필요합니다. 원어와 영어 사전만 두고, 한글 본문은 사용자가 각자 보던 성경을
> 쓰도록 하는 것이 현재 구조입니다.

## 다음 단계

1. Supabase 프로젝트를 만들고 `supabase/schema.sql`, `supabase/scraped_posts.sql` 실행
2. `.env.example`을 `.env.local`로 복사해 키 입력
3. 카카오 로그인 연동 + 가입 승인 플로우
4. GitHub에 저장소를 올려 자동 수집 워크플로를 켜기 (위 "청빙공고 수집" 참고)
5. 운영진 대시보드(회원 승인 · 공고 검수)

## 스택

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase
