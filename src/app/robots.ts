import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/*
  검색엔진은 들이고, 자료를 통째로 퍼 가는 기계는 막는다.

  구직자가 이 사이트를 찾는 길은 대개 검색이다. 그래서 구글·네이버·다음·빙과
  카카오 미리보기는 그대로 들인다. 그 밖의 기계에는 문을 닫는다.

  우리가 모아 둔 것이 그냥 굴러다니는 자료가 아니기 때문이다. 지역을 17개
  시·도로 나누고, 교단을 게시판과 본문에서 읽어 내고, 교회 좌표를 찾고,
  같은 자리가 여러 게시판에 올라온 것을 하나로 묶는 일을 했다. 원문은 각
  게시판과 글쓴이의 것이지만, 이 정리는 우리 것이다.

  robots.txt 는 예의를 지키는 기계에만 통한다. 무시하고 긁는 쪽은 이것으로
  막히지 않는다. 다만 우리가 남의 게시판을 대할 때 지키는 것과 같은 표시를
  우리도 내걸어야, 장신대에 허락을 구했던 일이 앞뒤가 맞는다.

  퍼 가고 싶은 곳이 있으면 막아 두고 연락을 받는 편이 낫다. 어떻게 쓸지
  이야기하고 내어 줄 수 있다 — 우리가 장신대에 그랬듯이.
*/

/** 색인을 맡기는 검색엔진. 이들에게는 사이트를 그대로 연다. */
const SEARCH_ENGINES = [
  "Googlebot",
  "Googlebot-Image",
  "Google-InspectionTool",
  "Yeti", // 네이버
  "Daum",
  "Daumoa",
  "bingbot",
  "kakaotalk-scrap", // 카카오톡으로 주소를 보낼 때 뜨는 미리보기
  "facebookexternalhit",
  "Twitterbot",
];

/** 로그인한 사람에게만 뜻이 있는 화면은 검색엔진에도 내주지 않는다. */
const PRIVATE = ["/account", "/auth/", "/login"];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      ...SEARCH_ENGINES.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE,
      })),
      // 나머지 기계는 들이지 않는다. 자료를 쓰고 싶으면 사람이 연락하면 된다.
      { userAgent: "*", disallow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
