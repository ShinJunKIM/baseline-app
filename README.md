# 베이스라인 · 아이폰 홈 화면 앱

운동 기록 + 목표 기반 프로그램 추천 + 진행 분석 앱. 이 폴더가 그대로 **설치형 웹앱(PWA)** 이다. 아이폰 Safari에서 열고 "홈 화면에 추가"하면 아이콘·전체화면·오프라인까지 일반 앱처럼 돈다.

## 1. 인터넷에 올리기 (GitHub Pages, 무료, 5분)

1. github.com 에서 새 저장소 만들기 → 이름 예: `baseline-app`, **Public**.
2. 저장소 페이지에서 **Add file → Upload files** → 이 폴더 안의 파일 전부 드래그 (`index.html`, `*.js`, `manifest.webmanifest`, `sw.js`, `icon-*.png`). `src/` 폴더와 `README.md`는 안 올려도 된다.
3. **Commit changes**.
4. 저장소 **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save**.
5. 1~2분 뒤 `https://<깃허브아이디>.github.io/baseline-app/` 에서 열린다.

터미널이 편하면:

```bash
cd "C:\Users\김신준\Desktop\재밌는 것\베이스라인-앱"
git init && git add index.html *.js manifest.webmanifest sw.js icon-*.png && git commit -m "baseline app"
git branch -M main && git remote add origin https://github.com/<아이디>/baseline-app.git && git push -u origin main
```

그 다음 Settings → Pages 에서 main 브랜치를 선택.

## 2. 아이폰에 설치

1. **Safari**(크롬 말고)로 위 주소를 연다.
2. 아래 **공유 버튼(□↑)** → **홈 화면에 추가** → 추가.
3. 홈 화면의 파란 아이콘으로 연다. 상태바까지 검정으로 차오르는 전체화면이면 성공.

처음 한 번만 인터넷이 필요하고, 그 뒤로는 오프라인에서도 열린다. 기록은 아이폰 안(IndexedDB)에 저장된다.

## 3. 코치(Claude)와 연결

- **설정 → 코치에게 보내기 → 보고서 보기·복사** → Claude 앱 채팅에 붙여 넣기.
- 또는 **설정 → 데이터 → JSON 내보내기**로 백업/이동.
- claude.ai 아티팩트 버전(https://claude.ai/artifact/AA93mU5Fw7gucCvRewDZh2)은 클라우드에 저장되고 Claude가 직접 읽는다. 두 버전은 데이터가 따로라서, 옮길 땐 JSON 내보내기 → 가져오기.

## 4. 업데이트

코드를 고친 뒤 같은 저장소에 파일을 다시 올리면 된다. `sw.js` 안의 `VERSION` 숫자를 올려야 아이폰이 새 파일을 받는다. 앱을 완전히 닫았다가 두 번 열면 갱신된다.

빌드 스크립트: `src/build-pwa.py` (아티팩트용 `src/baseline.html` + JS를 이 폴더로 조립). 실행: `python src/build-pwa.py src . 4` (마지막 숫자가 버전).

## 폴더 구성

- `index.html` 앱 껍데기 (iOS 메타, 매니페스트, 아이콘)
- `data.js` 운동 99개·근육 지도·동작 설명 / `engine.js` 프로그램 생성·진행 규칙·부하 분석 / `app-*.js` 화면·동작
- `manifest.webmanifest` 앱 이름·아이콘·전체화면 / `sw.js` 오프라인 캐시 / `icon-*.png` 아이콘
