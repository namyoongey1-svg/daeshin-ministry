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
| `/jobs` | 청빙공고 목록 (지역·직분·형태 필터). **표본 데이터** |
| `/tools/original` | 원어 파싱 뷰어 — 구약 39권 + 신약 27권 전체 |
| `/tools/original/lemma` | 사전형 용례 검색 (성경 전체) |
| `/tools/sermon` | 설교 노트 — 원어 클리핑 + 개요 + 마크다운 내보내기 |

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

1. Supabase 프로젝트를 만들고 `supabase/schema.sql` 실행
2. `.env.example`을 `.env.local`로 복사해 키 입력
3. 카카오 로그인 연동 + 가입 승인 플로우
4. `/jobs`의 표본 데이터를 실제 조회로 교체
5. 운영진 대시보드(회원 승인 · 공고 검수)

## 스택

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase
