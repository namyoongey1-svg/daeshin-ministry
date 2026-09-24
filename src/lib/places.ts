import { parsePlace, type Place } from "./region";

/*
  교회 이름을 좌표로 바꾼 결과를 담아 둔다.

  청빙게시판은 주소를 적지 않는다. 본문에는 있을 수 있지만 본문은 긁지
  않는다 — 저작권과 담당자 연락처 때문이다. 그래서 가진 것은 교회 이름과
  지역뿐이고, 카카오 장소검색으로 이름을 찍어 좌표를 얻는 수밖에 없다.

  이름으로 찾는 일은 틀릴 수 있다. 호산나교회도 예수로교회도 전국에 여럿
  있어서, 시·도만 아는 공고에서는 엉뚱한 교회에 핀이 꽂힐 수 있다. 그래서
  카카오가 돌려준 주소를 우리가 아는 지역과 맞춰 보고, 어긋나면 버린다.
  핀이 하나 없는 것보다 엉뚱한 곳에 꽂힌 핀이 더 나쁘다.
*/

export interface Pin {
  lat: number;
  lng: number;
  /** 카카오가 돌려준 장소 이름. 우리가 읽은 교회명과 다를 수 있어 그대로 둔다. */
  name: string;
  /** 지번 주소. 핀이 맞는지 사람이 눈으로 확인할 수 있게 함께 보여 준다. */
  address: string;
  /**
   * 어디까지 맞춰 보고 통과시켰는가.
   *
   * "구"는 시·군·구까지 우리 기록과 같다는 뜻이고, "시도"는 시·도만 같다는
   * 뜻이다. 시·도만 맞춘 핀은 같은 이름의 다른 교회일 수 있어 화면에서
   * 따로 표시한다.
   */
  matched: "구" | "시도";
}

/** 좌표를 찾아 둔 교회들. 키는 makeKey 가 만든다. */
export type PlaceBook = Record<string, Pin>;

/**
 * 교회 하나를 가리키는 키.
 *
 * 이름만으로는 안 된다. 파주 예수로교회와 서울 예수로교회는 다른 교회이고,
 * 좌표도 달라야 한다. 시·도까지 붙여야 서로 섞이지 않는다.
 *
 * 구·군은 키에 넣지 않는다. 같은 교회인데 게시판마다 "대전"과 "대전 유성구"로
 * 달리 적어 두는 일이 흔해서, 넣으면 한 교회를 두 번 찾게 된다.
 */
export function makeKey(church: string, place: Place): string | null {
  if (!church || !place.sido) return null;
  return `${church.replace(/\s+/g, "")}|${place.sido}`;
}

/** 카카오에 넣을 검색어. 아는 만큼 좁혀 준다. */
export function makeQuery(church: string, place: Place): string {
  return [place.sigungu ?? place.sido, church].filter(Boolean).join(" ");
}

/**
 * 카카오가 돌려준 주소가 우리가 아는 지역과 맞는지 본다.
 *
 * 맞으면 어디까지 맞았는지를 돌려주고, 어긋나면 null 이다. 이름이 같은
 * 다른 지역 교회를 걸러 내는 곳이 여기다.
 */
export function agrees(address: string, place: Place): Pin["matched"] | null {
  const found = parsePlace(address);
  if (!found.sido || found.sido !== place.sido) return null;
  if (!place.sigungu) return "시도";
  // 우리가 "성남시 분당구"까지 아는데 카카오 주소가 "성남시"까지만이면,
  // 시·도만 맞은 것으로 낮춰 잡는다.
  if (!found.sigungu) return "시도";
  return found.sigungu.startsWith(place.sigungu) || place.sigungu.startsWith(found.sigungu)
    ? "구"
    : null;
}

/** 두 좌표 사이 거리(km). 지구를 공으로 놓고 재는 흔한 방식이다. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
