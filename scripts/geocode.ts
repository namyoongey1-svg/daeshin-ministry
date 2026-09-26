/**
 * 교회 이름을 좌표로 바꿔 둔다.
 *
 *   KAKAO_REST_KEY=... npm run geocode
 *   npm run geocode -- --recheck      -- 이미 찾아 둔 것도 다시 확인
 *   npm run geocode -- --limit 50     -- 이번에 찾을 교회 수 제한
 *   npm run geocode -- --delay 120    -- 요청 간격(ms)
 *
 * 한 번 찾은 교회는 파일에 남겨 두고 다시 묻지 않는다. 날마다 도는 수집에서
 * 새로 올라온 교회만 묻게 되므로, 평소에는 몇 건이면 끝난다.
 *
 * 카카오가 돌려준 주소가 우리가 아는 지역과 어긋나면 저장하지 않는다.
 * 같은 이름의 교회가 전국에 여럿 있어서, 그냥 첫 결과를 받으면 엉뚱한 곳에
 * 핀이 꽂힌다. 핀이 없는 것보다 틀린 핀이 나쁘다.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildListings } from "@/lib/scrape/listings";
import { agrees, makeKey, makeLooseKey, makeQuery, type PlaceBook, type Pin } from "@/lib/places";
import { parsePlace, type Place } from "@/lib/region";
import type { ScrapedPost } from "@/lib/scrape/types";

const DIR = path.join(process.cwd(), "src", "data", "scraped");
const POSTS = path.join(DIR, "posts.json");
const PLACES = path.join(DIR, "places.json");

const KEY = process.env.KAKAO_REST_KEY;
const SEARCH = "https://dapi.kakao.com/v2/local/search/keyword.json";

interface KakaoPlace {
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_name: string;
  x: string;
  y: string;
}

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const value = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(value) ? value : fallback;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 띄어쓰기와 괄호를 지운 이름. "아름다운 안디옥 교회"와 "아름다운안디옥교회"는 같다. */
function bare(name: string): string {
  return name.replace(/[\s()[\]·,.]/g, "");
}

async function search(query: string): Promise<KakaoPlace[]> {
  const url = `${SEARCH}?query=${encodeURIComponent(query)}&size=10`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "카카오가 열쇠를 거절했습니다. REST API 키인지, 그리고 그 앱에서 카카오맵(로컬) 서비스를 켰는지 확인하세요."
    );
  }
  if (res.status === 429) throw new Error("카카오 하루 한도를 넘었습니다. 내일 다시 돌리세요.");
  if (!res.ok) throw new Error(`카카오 응답 ${res.status}`);
  const body = (await res.json()) as { documents?: KakaoPlace[] };
  return body.documents ?? [];
}

async function main() {
  if (!KEY) {
    console.error("KAKAO_REST_KEY 가 없습니다. 카카오 REST API 키를 넣고 다시 실행하세요.");
    process.exit(1);
  }

  const posts = JSON.parse(await readFile(POSTS, "utf8")) as ScrapedPost[];
  const book: PlaceBook = await readFile(PLACES, "utf8")
    .then((t) => JSON.parse(t) as PlaceBook)
    .catch(() => ({}));

  const recheck = process.argv.includes("--recheck");
  const delay = arg("delay", 120);
  const limit = arg("limit", Infinity);

  // 마감된 공고의 교회까지 찾을 이유는 없다. 지도에는 모집 중인 것만 올린다.
  const listings = buildListings(posts.filter((p) => !p.closedAt));

  /** 한 교회당 한 번만 묻는다. 같은 교회가 공고를 다섯 건 올려도 호출은 한 번이다. */
  const wanted = new Map<string, { church: string; query: string; place: Place }>();
  for (const l of listings) {
    if (!l.church) continue;
    const key = makeKey(l.church, l.place);
    if (!key) continue;
    if (book[key] && !recheck) continue;
    const before = wanted.get(key);
    // 구·군까지 아는 공고가 있으면 그것으로 묻는다. 좁게 물을수록 잘 맞는다.
    if (before && !l.place.sigungu) continue;
    wanted.set(key, { church: l.church, query: makeQuery(l.church, l.place), place: l.place });
  }

  /*
    지역을 모르는 교회는 이름만으로 묻는다.

    아무거나 집으면 안 되므로, 카카오가 그 이름으로 딱 하나만 돌려줄 때만
    받는다. 전국에 하나뿐인 이름이라는 뜻이다. 여럿이면 어느 것인지 알 수
    없으니 버린다 — 핀이 없는 것보다 틀린 핀이 나쁘다.

    여기서 얻은 주소로 지역까지 되읽으므로, 지도뿐 아니라 지역 거르기도
    함께 채워진다.
  */
  const loose = new Map<string, string>();
  for (const l of listings) {
    if (!l.church || l.place.sido) continue;
    const key = makeLooseKey(l.church);
    if (!key || (book[key] && !recheck)) continue;
    loose.set(key, l.church);
  }

  console.log(
    `모집 중 ${listings.length}건 / 이미 찾아 둔 교회 ${Object.keys(book).length}곳` +
      `
지역을 아는 교회 ${wanted.size}곳 · 이름만 아는 교회 ${loose.size}곳`
  );

  let found = 0;
  let mismatched = 0;
  let missing = 0;
  let done = 0;

  for (const [key, item] of wanted) {
    if (done >= limit) break;
    done++;

    let docs: KakaoPlace[] = [];
    try {
      docs = await search(item.query);
    } catch (err) {
      // 열쇠나 한도 문제면 더 돌려도 소용없다. 여태 찾은 것은 남기고 멈춘다.
      console.error(`\n${err instanceof Error ? err.message : String(err)}`);
      break;
    }

    const target = bare(item.church);
    const hit = docs.find((d) => {
      const name = bare(d.place_name);
      if (!name.includes(target) && !target.includes(name)) return false;
      return agrees(d.address_name || d.road_address_name, item.place) !== null;
    });

    if (!hit) {
      // 이름은 찾았는데 지역이 어긋난 경우와, 아예 못 찾은 경우를 나눠 센다.
      if (docs.some((d) => bare(d.place_name).includes(target))) mismatched++;
      else missing++;
      await sleep(delay);
      continue;
    }

    const address = hit.address_name || hit.road_address_name;
    const pin: Pin = {
      lat: Number(hit.y),
      lng: Number(hit.x),
      name: hit.place_name,
      address,
      matched: agrees(address, item.place)!,
    };
    book[key] = pin;
    found++;

    if (done % 25 === 0) process.stdout.write(`  ${done}/${wanted.size}\r`);
    await sleep(delay);
  }

  /*
    이름만 아는 교회. 딱 하나만 나올 때만 받는다.

    이름이 같은 교회가 둘 이상이면 어느 것인지 알 수 없으므로 버린다.
    "세 곳 중 하나겠지" 하고 첫 번째를 집으면, 서울에서 자리를 찾는 사람에게
    같은 이름의 부산 교회를 서울 공고처럼 보여 주게 된다.
  */
  let alone = 0;
  let ambiguous = 0;
  let unfound = 0;
  let looseDone = 0;

  for (const [key, church] of loose) {
    if (done + looseDone >= limit) break;
    looseDone++;

    let docs: KakaoPlace[] = [];
    try {
      docs = await search(church);
    } catch (err) {
      console.error(`\n${err instanceof Error ? err.message : String(err)}`);
      break;
    }

    const target = bare(church);
    // 이름이 같은 곳만 남긴다. "서울교회"를 찾는데 "서울교회사랑카페"가
    // 딸려 오면 하나뿐인 것처럼 보이거나, 반대로 여럿으로 보여 버려진다.
    const named = docs.filter((d) => bare(d.place_name) === target);

    if (named.length === 0) {
      unfound++;
    } else if (named.length > 1) {
      ambiguous++;
    } else {
      const hit = named[0];
      const address = hit.address_name || hit.road_address_name;
      // 주소에서 시·도를 못 읽으면 지역을 채울 수 없으니 받지 않는다.
      if (parsePlace(address).sido) {
        book[key] = {
          lat: Number(hit.y),
          lng: Number(hit.x),
          name: hit.place_name,
          address,
          // 지역을 우리가 안 것이 아니라 카카오가 알려 준 것이다.
          matched: "이름",
        };
        alone++;
      } else {
        unfound++;
      }
    }

    if (looseDone % 25 === 0) process.stdout.write(`  이름 ${looseDone}/${loose.size}\r`);
    await sleep(delay);
  }

  // 키 순서로 저장해야 날마다 도는 수집에서 줄만 바뀐 diff 가 안 생긴다.
  const sorted = Object.fromEntries(Object.entries(book).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(PLACES, JSON.stringify(sorted, null, 2) + "\n", "utf8");

  const count = (kind: Pin["matched"]) =>
    Object.values(sorted).filter((p) => p.matched === kind).length;
  console.log(
    `\n지역을 아는 교회  찾음 ${found} · 지역이 어긋나 버림 ${mismatched} · 카카오에 없음 ${missing}` +
      `\n이름만 아는 교회  찾음 ${alone} · 같은 이름 여럿이라 버림 ${ambiguous} · 못 찾음 ${unfound}` +
      `\n모두 ${Object.keys(sorted).length}곳 (구 ${count("구")} · 시도 ${count("시도")} · 이름 ${count("이름")})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
