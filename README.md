# StackBox

## 개요


## 기술 스택
- Next.js
- TypeScript
- Tailwind CSS
- Tiptap (노션 스타일 에디터)
## 설치

```bash
git clone https://github.com/2026-Sunrin-Vacation-Project-TEAM6/stackbox-frontend.git
cd stackbox-frontend
```

## 실행

```bash
npm install
npm run dev
```

## 프로젝트 구조

```bash
stackbox-frontend/
├── app/
│   ├── api/ # API 라우트
│   ├── (auth)/ # 인증 관련 페이지
│   ├── (workspace)/ # 워크스페이스 관련 페이지
│   └── page.tsx # 메인 페이지
├── components/ # UI 컴포넌트
│   ├── layout/ # 레이아웃 컴포넌트 (헤더, 푸터 등)
│   ├── ui/ # 재사용 가능한 UI 컴포넌트 (버튼, 입력창 등)
│   └── features/ # 기능별 컴포넌트 (채팅, 파일 업로드 등)
├── lib/ # 인증, API 클라이언트, DB, WebSocket, 코드 실행 등 상태/연결/설정이 있는 것
    ├── auth/ # 인증 관련 로직
    ├── api/ # API 클라이언트
    ├── realtime/ # 실시간 통신 (WebSocket 등)
    ├── config/ # 설정 관리
├── contexts/ # 전역 상태 관리
├── types/ # 타입 정의
├── styles/ # CSS 파일
├── hooks/ # 커스텀 훅 (상태 관리, API 호출 등)
├── utils/ # 유틸리티 함수 (공통 로직)
├── public/ # 정적 파일
├── proxy.ts # 인증 검토를 위한 프록시
└── README.md
```