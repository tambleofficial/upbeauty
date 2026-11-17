# UP BEAUTY 업뷰티 — 배포 안내 (GitHub + Cloudflare Pages)

1. 이 폴더의 파일 전체를 GitHub 저장소(예: upbeauty) 루트에 올립니다.
2. Cloudflare 대시보드 → Workers & Pages → Create → Pages → Connect to Git → 저장소 선택.
3. 빌드 설정: Framework preset **None**, Build command **비워둠**, Build output directory **/** (루트).
4. 프로젝트 이름을 **upbeauty**로 지정하면 주소는 https://upbeauty1004.com 입니다.

## 페이지 주소
- / (홈)
- /about/
- /program/
- /cases/
- /price-guide/
- /contact/

## 커스텀 도메인을 연결할 경우
index.html, sitemap.xml, robots.txt, rss.xml 안의 `https://upbeauty1004.com` 를 실제 도메인으로 모두 바꿔주세요.

## 등록
- Google Search Console / 네이버 서치어드바이저에 사이트 등록 후 `https://upbeauty1004.com/sitemap.xml` 과 `https://upbeauty1004.com/rss.xml` 을 제출합니다.

## 편집 모드

- 주소: https://upbeauty1004.com/edit (비밀번호는 Cloudflare 비밀값 `CMS_PASSWORD`)
- 저장하면 `content/text.json`, `content/media.json`, `assets/uploads/` 에 커밋 1개로 기록됩니다.
