# 마나 게임 홍보글 — 설정

로블록스 게임 "마나 수집 시뮬레이터" 홍보 글을 스레드에 올립니다.
묶음이 둘이고, 올라가는 계정도 둘입니다.

| 묶음 | 계정 | 보는 사람 | 태그 | 글 수 |
|---|---|---|---|---|
| `ko` | **기존 전도사 계정** (청빙공고와 같은 계정) | 주일학교 교사·부교역자·학부모 | `#주일학교` | 24편 |
| `en` | 게임용 새 계정 (아직 없음) | 해외 로블록스 유저 | `#Roblox` | 28편 |

---

## 한국어(ko) — 지금 바로 됩니다

**추가로 넣을 비밀값이 없습니다.** 청빙공고와 같은 계정이라
`THREADS_ACCESS_TOKEN` 과 `SUPABASE_SERVICE_ROLE_KEY` 가 이미 들어 있습니다.

### 한 번 확인해 보기

https://github.com/namyoongey1-svg/daeshin-ministry/actions/workflows/manna-threads.yml

**Run workflow** → `올릴 묶음: ko` / `올리지 않고 글만 확인: ✅` → 실행.

로그에 오늘 올라갈 글이 그대로 찍힙니다. 마음에 들면 체크를 풀고 다시 실행하면
실제로 올라갑니다.

### 언제 올라가는가

**월·수·금 저녁 8시(한국 시각)** 입니다.

매일이 아닌 이유는, 같은 계정에서 청빙 글이 매일 아침 올라가기 때문입니다.
거기에 홍보까지 매일 얹으면 계정 절반이 광고가 됩니다. 주 3회면 청빙 글을
밀어내지 않습니다.

### 토큰은 건드리지 않습니다

`ko` 묶음은 토큰을 **읽기만** 합니다. 연장은 청빙 쪽 `scripts/threads.ts` 가
이미 날마다 하고 있어서, 양쪽에서 연장하면 서로 엇갈립니다.

---

## 영어(en) — 계정이 생기면

새 스레드 계정을 만드신 뒤 아래 두 가지만 하면 됩니다.

### 1. 토큰 발급

https://developers.facebook.com/apps 에서 **청빙공고 때 만든 앱을 그대로** 쓰시면
됩니다. 앱 하나에 계정 여러 개를 붙일 수 있습니다.

1. 해당 앱 → **Threads API** → 사용자 토큰 생성
2. 새로 만든 **게임용 계정**으로 로그인
3. 권한 두 개 — `threads_basic`, `threads_content_publish`
4. 나온 **장기 토큰(long-lived, 60일)** 복사

> 단기 토큰을 복사하면 하루 만에 끊깁니다. 60일짜리인지 확인하세요.

### 2. GitHub Secret 에 넣기

https://github.com/namyoongey1-svg/daeshin-ministry/settings/secrets/actions

| 이름 | 값 |
|---|---|
| `MANNA_THREADS_ACCESS_TOKEN` | 위에서 복사한 토큰 |

넣고 나서 워크플로를 `올릴 묶음: both` 로 돌리면 두 계정에 각각 올라갑니다.
예약 실행을 both 로 바꾸려면 `.github/workflows/manna-threads.yml` 의
`PACK: ${{ inputs.pack || 'ko' }}` 에서 `'ko'` 를 `'both'` 로 고치면 됩니다.

**토큰이 없는 동안에는 그 단계가 조용히 건너뜁니다.** 빨갛게 실패하지 않습니다.

---

## 알아두실 것

**하루에 한 편만 올라갑니다.** 워크플로를 두 번 돌려도 같은 날 두 번 올라가지
않습니다. 일부러 다시 올리려면 `--force` 가 필요합니다.

**방문 수가 100, 250, 500, 1000… 을 넘긴 날**에는 그날 차례의 글 대신 기념 글이
올라갑니다. 숫자는 로블록스 공개 API 에서 그때그때 읽습니다.

**글이 500자를 넘으면 올리지 않습니다.** 올리기 전에 두 묶음을 전부 검사하는
단계가 있어서, 한 편이라도 넘으면 그날 작업이 거기서 멈춥니다.

**겪지 않은 일은 쓰지 않았습니다.** 아직 아이들 반응을 받아 본 적이 없으므로
"아이들이 좋아했다" 같은 문장은 한 편도 넣지 않았습니다. 테스트를 해 보신 뒤
실제 반응이 생기면 그때 글을 더하는 게 맞습니다.

---

## 손으로 돌려 보기

```bash
npm run manna-threads -- --all              # 두 묶음 글자 수 전부 검사
npm run manna-threads -- --dry              # 한국어 오늘 글 보기
npm run manna-threads -- --pack en --dry    # 영어 오늘 글 보기
```

## 글 고치기

`scripts/manna-posts.ts` 의 `POSTS_KO` / `POSTS_EN` 배열만 고치면 됩니다.
고친 뒤 `npm run manna-threads -- --all` 로 길이를 확인하세요.

## 멈추기

GitHub Actions 페이지에서 이 워크플로를 **Disable** 하거나,
`.github/workflows/manna-threads.yml` 의 `schedule` 블록을 지우면 됩니다.
