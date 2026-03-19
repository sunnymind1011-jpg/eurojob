# EuroJob — Vercel 배포 가이드

## 파일 구조
```
eurojob-vercel/
├── index.html        ← 프론트엔드 (EuroJob 앱)
├── vercel.json       ← Vercel 설정 + 자동 수집 스케줄
└── api/
    ├── jobs.js       ← 채용공고 API (JSearch 호출)
    └── cron.js       ← 매일 자동 수집 (한국시간 오전 9시)
```

## 배포 방법

### 1단계 — GitHub에 올리기

1. [github.com](https://github.com) 로그인
2. 오른쪽 상단 **"+"** → **"New repository"**
3. Repository name: `eurojob`
4. **"Create repository"** 클릭
5. 아래 화면에서 **"uploading an existing file"** 클릭
6. 이 폴더의 파일 4개를 모두 드래그 앤 드롭
   - `index.html`
   - `vercel.json`
   - `api/jobs.js`
   - `api/cron.js`
7. **"Commit changes"** 클릭

### 2단계 — Vercel에 배포하기

1. [vercel.com](https://vercel.com) 로그인
2. **"Add New Project"** 클릭
3. **"Import Git Repository"** → GitHub 연결
4. `eurojob` 저장소 선택 → **"Deploy"** 클릭
5. 1~2분 후 배포 완료!

### 3단계 — 완료!

배포 후 Vercel이 URL을 줘요:
```
https://eurojob-xxxx.vercel.app
```
이 주소로 어디서든 접속 가능합니다.

## 자동 수집 스케줄

`vercel.json`에 설정된 cron:
```json
"schedule": "0 0 * * *"
```
= UTC 00:00 = **한국시간 오전 9시** 매일 자동 실행

## API Key

`api/jobs.js`와 `api/cron.js` 파일 상단에 이미 Key가 들어있어요:
```js
const RAPIDAPI_KEY = '804d41afa6mshfacd6e6662b519ap1a1554jsn197924664c5f';
