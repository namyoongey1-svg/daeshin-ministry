# 대신 교역자 사역자톡방

대신 교단 사역자를 위한 청빙·구직 및 설교 준비 플랫폼.

**배포 주소: https://daeshin-ministry.vercel.app**

소스는 공개되어 있습니다. 교단과 상관없이 가져다 쓰셔도 되고,
고칠 곳이 보이면 알려 주시거나 직접 고쳐 보내 주셔도 됩니다.

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
| `/tools/bulletin` | 주보·순서지 — 예배별 기본 순서, 광고·일정, A4 인쇄 |
| `/tools/video` | 스케치 영상 기획 — 행사별 촬영 샷 리스트, 편집 구성 |

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

## 주보 · 순서지

`/tools/bulletin`. 예배 종류를 고르면 기본 순서가 채워지고, 오른쪽 미리보기가
그대로 인쇄됩니다(A4, 여백 14mm). 브라우저의 "PDF로 저장"을 쓰면 파일로 남습니다.

- 기본 순서: 주일 오전·오후, 수요기도회, 새벽기도회, 금요기도회, 성찬예배
- 비고 칸에 `요3:16`처럼 적고 칸을 벗어나면 `요한복음 3:16`으로 펴집니다
- 편집 화면은 `.no-print`, 지면은 `.print-sheet` 로 나뉘어 인쇄에서 걸러집니다

## 스케치 영상 기획

`/tools/video`. 촬영 전에 무엇을 찍을지 정하고, 편집 구성을 짜서 마크다운으로
내보냅니다. 편집 자체는 하지 않습니다.

- **샷 리스트**: 행사 유형(수련회·세례식·임직식·야외예배·성탄/부활·단기선교)별로
  놓치기 쉬운 장면을 미리 담아 둡니다. 현장에서 체크하며 쓰라고 체크박스를 뒀고,
  필수 항목이 몇 개 남았는지 세어 줍니다.
- **편집 구성**: 구간별 길이를 더해 목표 길이와 견줍니다. 초과하면 빨갛게 표시됩니다.
- **촬영 원칙**: 초상권(미성년자 보호자 동의, 기도·우는 모습)과 음악 저작권을
  함께 적어 뒀습니다. 교회 영상이 유튜브에서 가장 많이 걸리는 부분이라
  CCLI 등록이 온라인 공개까지 덮어 주지 않는다는 점을 명시했습니다.

## 새 공고 알림

`/alerts`. 지역·직분·근무 형태를 정해 두면 맞는 공고가 올라올 때 메일로 알립니다.
비워 둔 칸은 "전체"를 뜻합니다.

수집이 끝난 뒤 GitHub Actions가 이어서 `npm run notify` 를 돌립니다.
구독 정보를 모두 읽어야 해서 **서비스 롤 열쇠**가 필요하고, 메일 발송에는
**Resend 열쇠**가 필요합니다. 둘 다 GitHub 저장소 Secrets 에 넣습니다.

| Secret | 어디서 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Settings > API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | 같은 곳의 secret key. **공개 저장소이므로 코드에 적지 마세요** |
| `RESEND_API_KEY` | [resend.com](https://resend.com) 무료 가입 |

열쇠가 없으면 알림 단계는 아무것도 하지 않고 넘어갑니다. 수집은 그대로 돕니다.
보낼 대상만 확인하려면 `npm run notify -- --dry` 를 쓰세요.

## 사역 Q&A

`/qna`. 사례비, 청빙, 당회와의 갈등처럼 실명으로는 꺼내기 어려운 이야기를
**승인 회원끼리 익명으로** 나눕니다.

익명은 뷰로 보장합니다. `questions` · `answers` 테이블에는 글쓴이가 남지만,
화면이 읽는 `questions_public` · `answers_public` 뷰에는 그 칸이 아예 없습니다.
RLS는 행을 가릴 뿐 칸을 가리지 못하므로 뷰를 따로 뒀습니다.

> 완전한 익명은 아닙니다. 신고나 정리를 위해 운영진은 글쓴이를 확인할 수
> 있고, 그 사실을 화면에도 적어 두었습니다.

## 로그인과 회원 승인

비밀번호 없이 메일로 받은 링크로 들어옵니다(매직링크). 저장할 비밀번호가 없습니다.

1. `/login` — 메일 주소 입력 → 링크 발송
2. `/account` — 소속 교회·노회·직분 입력 → `대기` 상태로 저장
3. 운영진이 승인하면 청빙공고의 교회 연락처를 볼 수 있습니다 (RLS로 DB에서 강제)

맨 처음에는 승인해 줄 운영진이 없으므로, 첫 사람만
`supabase/bootstrap_admin.sql`을 한 번 실행해 직접 운영진으로 올립니다.

### 개발 중에는 메일을 이 컴퓨터에서 열어야 합니다

`localhost`로 개발할 때 메일 링크는 `http://localhost:3000/auth/callback` 으로
돌아옵니다. 휴대폰이나 카카오톡·메일 앱에서 누르면 **그 기기의 localhost**를
찾으러 가서 실패합니다("접근할 수 없습니다"). 링크는 사이트를 띄운 컴퓨터의
브라우저에서 열어야 합니다. 배포하면 실제 도메인이 되므로 사라지는 문제입니다.

### 6자리 코드 로그인 (SMTP 붙인 뒤)

휴대폰으로 메일을 보는 사람이 많아 코드 입력 화면도 만들어 뒀지만, 기본으로는
꺼져 있습니다. Supabase 기본 메일은 링크만 보내고, 코드를 넣으려면 메일
템플릿에 `{{ .Token }}` 을 넣어야 하는데 **템플릿 편집은 custom SMTP를 붙여야
열립니다**. 순서는 이렇습니다.

1. Authentication > Emails > SMTP Settings 에서 SMTP 연결 (Resend 등)
2. Confirm sign up / Magic link or OTP 템플릿에 `{{ .Token }}` 추가
3. `.env.local` 에 `NEXT_PUBLIC_EMAIL_OTP=1`

SMTP를 붙이면 무료 기본 메일의 **시간당 2통** 제한도 같이 풀립니다.

Supabase 설정에서 챙겨야 할 것:

- **Authentication > URL Configuration > Redirect URLs** 에 접속 주소를 넣어야
  메일 링크가 사이트로 돌아옵니다. 개발용 `http://localhost:3000/**` 는 등록해
  두었고, 배포하면 그 주소도 같은 형식(`https://도메인/**`)으로 추가하세요.

## 배포

Vercel CLI로 올립니다. `vercel link` 가 만든 `.vercel/` 과 키가 든 `.env.local`
은 `.gitignore` 에 들어 있습니다.

```bash
npx vercel --prod
```

Supabase 쪽에 배포 주소가 등록되어 있어야 로그인이 됩니다. 둘 다 넣어 뒀습니다.

- Site URL: `https://daeshin-ministry.vercel.app`
- Redirect URLs: `https://daeshin-ministry.vercel.app/**`, `http://localhost:3000/**`

저장소는 [namyoongey1-svg/daeshin-ministry](https://github.com/namyoongey1-svg/daeshin-ministry)
(Private)이고 Vercel과 연결되어 있습니다. **main 에 커밋이 올라가면 곧 배포됩니다.**
GitHub Actions가 매일 아침 공고를 모아 커밋하므로, 새 공고는 손대지 않아도
사이트에 반영됩니다.

## 검색 노출

`robots.txt`, `sitemap.xml`, 구조화 데이터(JSON-LD)가 붙어 있습니다.
로그인 관련 화면(`/account`, `/login`, `/auth/`)은 색인에서 뺐습니다.

### 구글 — 등록 완료

Search Console 속성(`https://daeshin-ministry.vercel.app/`)을 등록하고 소유권을
확인했습니다. 계정은 daero.kids@gmail.com 입니다.

소유권 확인은 **HTML 파일 방식**을 씁니다. `public/google691ab6c6e8fabc6c.html`
을 지우면 확인이 풀리므로 그대로 두세요.

사이트맵도 제출했고 상태는 `성공`, 페이지 6개를 읽어 갔습니다.

### 네이버 — 아직

사역자들은 네이버를 더 많이 쓰므로 같이 등록하는 편이 좋습니다.
[서치어드바이저](https://searchadvisor.naver.com) 에서 사이트를 등록하고,
소유확인 방법으로 **HTML 파일**을 고르면 `naver...html` 파일명을 알려 줍니다.
그 파일을 `public/` 에 같은 이름으로 두고 배포하면 됩니다.

메타태그 방식을 쓰려면 `NEXT_PUBLIC_NAVER_VERIFICATION` 에 확인 문자열을 넣습니다.

```bash
npx vercel env add NEXT_PUBLIC_NAVER_VERIFICATION production
```

## 다음 단계

1. 저장소를 GitHub에 올리고 Vercel과 연결 — 수집 결과가 자동으로 배포됨
2. 운영진 대시보드 — 가입 승인과 공고 검수를 화면에서 처리
3. 카카오 로그인 연동 (카카오 개발자 앱 등록 필요)
4. 직접 등록 청빙공고 — 교회가 올리고 운영진이 검수
5. 수집 공고를 `scraped_posts` 테이블로 옮기기 (지금은 JSON 파일에서 읽음)

## 스택

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase
