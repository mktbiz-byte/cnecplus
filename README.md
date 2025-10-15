# Creator Hub - AI 기반 크리에이터 성장 컨설팅 시스템

YouTube 크리에이터를 위한 통합 관리 및 AI 기반 성장 전략 컨설팅 플랫폼입니다.

## 주요 기능

### 📊 채널 분석
- YouTube 채널 정보 실시간 조회
- 구독자, 동영상 수, 총 조회수 통계
- 최신 업로드 동영상 목록

### 🤖 AI 기반 성장 전략
- **맞춤형 성장 전략**: 채널 데이터를 분석하여 구체적인 성장 로드맵 제안
- **콘텐츠 아이디어**: 채널 스타일에 맞는 새로운 콘텐츠 아이디어 10개 생성
- **제목 최적화**: 클릭률(CTR)을 높이는 매력적인 제목 5개 제안
- **경쟁 채널 분석**: 경쟁 채널과 비교하여 차별화 전략 제시

### 📈 트렌드 분석
- 현재 인기 있는 YouTube 트렌드 동영상 조회
- 한국 시장 맞춤 트렌드 정보

### 🏷️ 해시태그 추천
- 채널의 인기 동영상 분석 기반 해시태그 추천
- SEO 최적화를 위한 키워드 제안

## 기술 스택

### Backend
- **Python 3.11** - Flask 프레임워크
- **OpenAI API** - GPT-4.1-mini 모델 사용
- **SearchAPI.io** - YouTube 데이터 수집

### Frontend
- **React 18** - Vite 빌드 도구
- **Tailwind CSS** - 스타일링
- **shadcn/ui** - UI 컴포넌트 라이브러리
- **Lucide React** - 아이콘

## 설치 및 실행

### 1. 저장소 클론
```bash
git clone <repository-url>
cd creator_hub_backend
```

### 2. Python 가상환경 생성 및 활성화
```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 또는
venv\Scripts\activate  # Windows
```

### 3. 의존성 설치
```bash
pip install -r requirements.txt
```

### 4. 환경변수 설정
```bash
cp .env.example .env
nano .env  # 또는 원하는 에디터로 편집
```

`.env` 파일에 OpenAI API 키 입력:
```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

자세한 API 설정 방법은 [API_SETUP.md](API_SETUP.md)를 참조하세요.

### 5. 서버 실행
```bash
python src/main.py
```

서버가 http://localhost:5000 에서 실행됩니다.

### 6. 브라우저에서 접속
```
http://localhost:5000
```

## 프로젝트 구조

```
creator_hub_backend/
├── src/
│   ├── main.py              # Flask 애플리케이션 진입점
│   ├── routes/
│   │   ├── youtube.py       # YouTube API 라우트
│   │   └── ai_consultant.py # AI 컨설팅 라우트
│   ├── models/              # 데이터베이스 모델
│   └── static/              # React 빌드 파일 (프론트엔드)
├── requirements.txt         # Python 의존성
├── .env.example            # 환경변수 예시
├── API_SETUP.md            # API 설정 가이드
└── README.md               # 이 파일

creator_hub_frontend/
├── src/
│   ├── App.jsx             # React 메인 컴포넌트
│   └── components/         # UI 컴포넌트
├── package.json            # Node.js 의존성
└── vite.config.js          # Vite 설정
```

## API 엔드포인트

### YouTube API
- `GET /api/youtube/channel/:channelId` - 채널 정보 조회
- `GET /api/youtube/channel/:channelId/videos` - 채널 동영상 목록
- `GET /api/youtube/recommendations/hashtags/:channelId` - 해시태그 추천
- `GET /api/youtube/recommendations/topics/:channelId` - 주제 추천
- `GET /api/youtube/trends` - 트렌드 동영상 조회

### AI 컨설팅 API
- `GET /api/ai/analyze/:channelId` - AI 성장 전략 분석
- `GET /api/ai/content-ideas/:channelId` - 콘텐츠 아이디어 생성
- `POST /api/ai/title-optimizer` - 제목 최적화
- `POST /api/ai/competitor-analysis` - 경쟁 채널 분석

## 사용 방법

### 1. 채널 분석
1. 메인 페이지에서 YouTube 채널 ID 또는 핸들(@channelname) 입력
2. "분석하기" 버튼 클릭
3. 채널 정보 및 통계 확인

### 2. AI 성장 전략 받기
1. 채널 분석 후 "AI 조언" 탭 클릭
2. "AI 성장 전략 받기" 버튼 클릭
3. 맞춤형 성장 전략 확인

### 3. 콘텐츠 아이디어 생성
1. "콘텐츠 아이디어" 탭 클릭
2. "콘텐츠 아이디어 생성하기" 버튼 클릭
3. 10개의 새로운 아이디어 확인

### 4. 제목 최적화
1. "도구" 탭 클릭
2. 최적화하고 싶은 제목 입력
3. "제목 최적화하기" 버튼 클릭
4. 5개의 최적화된 제목 확인

## 배포

### 프론트엔드 빌드
```bash
cd creator_hub_frontend
pnpm install
pnpm run build
cp -r dist/* ../creator_hub_backend/src/static/
```

### 프로덕션 서버 실행
```bash
cd creator_hub_backend
gunicorn -w 4 -b 0.0.0.0:8000 src.main:app
```

## 비용 안내

### OpenAI API 비용 (GPT-4.1-mini)
- 입력: $0.15 / 1M 토큰
- 출력: $0.60 / 1M 토큰
- 평균 분석 1회: 약 2,000-3,000 토큰 사용
- **예상 비용**: 1,000회 분석 시 약 $1-2

### YouTube Data API v3
- 무료 할당량: 하루 10,000 단위
- 초과 시: $0.05 / 1,000 단위

## 보안 주의사항

⚠️ **중요:**
- `.env` 파일을 Git에 커밋하지 마세요
- API 키를 공개하지 마세요
- 프로덕션 환경에서는 HTTPS 사용 필수
- 환경변수로 민감한 정보 관리

## 라이선스

MIT License

## 지원

문제가 발생하거나 질문이 있으시면 이슈를 등록해주세요.

## 개발자

Creator Hub - AI 기반 크리에이터 성장 컨설팅 © 2025

---

**Powered by OpenAI & YouTube Data API**

