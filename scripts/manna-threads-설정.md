# 마나 게임 홍보글 — 처음 한 번 설정

새 스레드 계정을 만드신 뒤 아래 네 단계만 하면 끝입니다. 그 뒤로는 손댈 일이 없습니다.

청빙공고용 토큰과 **다른 값**입니다. 계정이 다르면 토큰도 다릅니다.

---

## 1. Meta 앱에 새 계정 연결

https://developers.facebook.com/apps 에서 **청빙공고 때 만든 앱을 그대로** 쓰시면 됩니다.
앱은 여러 계정을 담을 수 있습니다.

1. 해당 앱 > **Threads API** > 사용자 토큰 생성
2. 새로 만든 **게임용 스레드 계정**으로 로그인
3. 권한 두 개를 켭니다 — `threads_basic`, `threads_content_publish`
4. 나온 **장기 토큰(long-lived, 60일)** 을 복사

> 단기 토큰을 복사하면 하루 만에 끊깁니다. 반드시 60일짜리인지 확인하세요.

## 2. GitHub Secret 에 넣기

https://github.com/namyoongey1-svg/daeshin-ministry/settings/secrets/actions

**New repository secret** 을 누르고:

| 이름 | 값 |
|---|---|
| `MANNA_THREADS_ACCESS_TOKEN` | 1단계에서 복사한 토큰 |

`SUPABASE_SERVICE_ROLE_KEY` 는 이미 들어 있으니 그대로 두시면 됩니다.

## 3. 손으로 한 번 돌려보기

https://github.com/namyoongey1-svg/daeshin-ministry/actions/workflows/manna-threads.yml

**Run workflow** > `올리지 않고 글만 확인` 을 **체크** > 실행.

로그에 오늘 올라갈 글이 그대로 찍힙니다. 글이 마음에 들면 체크를 풀고 다시 실행하면
실제로 올라갑니다.

## 4. 끝

이후 **매일 한국 시각 저녁 8시**(미국 동부 아침 6~7시)에 저절로 한 편씩 올라갑니다.
28편을 한 바퀴 돌면 처음으로 돌아옵니다.

---

## 알아두실 것

**토큰은 알아서 연장됩니다.** 일주일마다 60일씩 밀어 두므로 두 달마다 갈아 끼울
필요가 없습니다. 연장 기록은 Supabase `app_secrets` 표의 `manna_threads_token`
줄에 남습니다.

**하루에 한 편만 올라갑니다.** 워크플로를 두 번 돌려도 같은 날 두 번 올라가지
않습니다. 일부러 다시 올리려면 `--force` 를 붙여야 합니다.

**방문 수가 100, 250, 500, 1000… 을 넘긴 날**에는 그날 차례의 글 대신 기념 글이
올라갑니다. 숫자는 로블록스 공개 API 에서 실시간으로 읽습니다.

**글이 500자를 넘으면 올리지 않습니다.** 올리기 전에 묶음 전체를 검사하는 단계가
있어서, 한 편이라도 넘으면 그날 작업이 거기서 멈춥니다.

---

## 글을 고치고 싶을 때

`scripts/manna-posts.ts` 의 `POSTS` 배열만 고치면 됩니다.

고친 뒤 확인:

```bash
npm run manna-threads -- --all
```

28편의 글자 수가 쭉 나오고, 한도를 넘은 글은 표시됩니다.

오늘 올라갈 글만 보려면:

```bash
npm run manna-threads -- --dry
```

## 멈추고 싶을 때

`.github/workflows/manna-threads.yml` 의 `schedule` 블록 세 줄을 지우거나,
GitHub Actions 페이지에서 해당 워크플로를 **Disable** 하면 됩니다.
