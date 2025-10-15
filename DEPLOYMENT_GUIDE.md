# Creator Hub - 배포 및 사용 가이드

## 프로젝트 개요

**Creator Hub**는 YouTube 크리에이터를 위한 AI 기반 성장 컨설팅 플랫폼입니다.

### 주요 기능

1. **채널 분석**: YouTube 채널 정보, 통계, 최신 동영상 조회
2. **AI 성장 전략**: Gemini 2.5 Flash 기반 맞춤형 성장 전략 제안
3. **콘텐츠 아이디어**: 채널 스타일에 맞는 새로운 콘텐츠 아이디어 10개 생성
4. **제목 최적화**: 클릭률(CTR)을 높이는 매력적인 제목 5개 제안
5. **경쟁 채널 분석**: 경쟁 채널과 비교 분석
6. **썸네일 분석**: 썸네일 개선 방안 제안 (Gemini 멀티모달)
7. **트렌드 분석**: 현재 인기 있는 YouTube 트렌드 조회
8. **해시태그 추천**: SEO 최적화 해시태그 제안

---

## 배포된 사이트

**URL**: https://zmhqivckg7zx.manus.space

**현재 상태**: 데모 모드 (API 키 미설정)
- YouTube API와 AI 기능이 비활성화되어 있습니다
- 실제 사용을 위해서는 API 키 설정이 필요합니다

---

## 기술 스택

### Backend
- **Python 3.11** - Flask 프레임워크
- **Gemini 2.5 Flash** - AI 분석 엔진 (OpenAI 호환 API)
- **SearchAPI.io** - YouTube 데이터 수집
- **Flask-CORS** - CORS 지원

### Frontend
- **React 18** - Vite 빌드 도구
- **Tailwind CSS** - 스타일링
- **Lucide React** - 아이콘

---

## API 키 설정 방법

### 1. OpenAI API 키 (필수 - Gemini 사용)

**발급 방법:**
1. https://platform.openai.com 접속
2. 회원가입 또는 로그인
3. API Keys 메뉴에서 새 키 생성
4. 생성된 키 복사 (sk-로 시작)

**환경변수 설정:**
```bash
export OPENAI_API_KEY=sk-your-actual-api-key-here
export OPENAI_BASE_URL=https://api.openai.com/v1
```

**비용:**
- Gemini 2.5 Flash 모델 사용
- 매우 저렴 (GPT-4보다 10배 이상 저렴)
- 약 1,000회 분석 시 $1-2 정도

### 2. YouTube Data API v3 키 (선택)

현재는 SearchAPI.io를 사용하지만, 공식 YouTube API를 사용하려면:

**발급 방법:**
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성
3. "API 및 서비스" > "라이브러리"에서 "YouTube Data API v3" 활성화
4. "사용자 인증 정보" > "사용자 인증 정보 만들기" > "API 키" 선택

**환경변수 설정:**
```bash
export YOUTUBE_API_KEY=your-youtube-api-key-here
```

**비용:**
- 무료 할당량: 하루 10,000 단위
- 대부분의 개인 사용자는 무료 범위 내

---

## 로컬 설치 및 실행

### 1. 프로젝트 다운로드

압축 파일 `creator_hub_project.tar.gz`를 다운로드하여 압축 해제:

```bash
tar -xzf creator_hub_project.tar.gz
cd creator_hub_backend
```

### 2. Python 가상환경 설정

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

`.env` 파일 생성:

```bash
cp .env.example .env
nano .env  # 또는 원하는 에디터로 편집
```

`.env` 파일 내용:

```env
# OpenAI API 키 (필수)
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1

# YouTube Data API v3 키 (선택)
YOUTUBE_API_KEY=your-youtube-api-key-here
```

### 5. 서버 실행

```bash
python src/main.py
```

서버가 http://localhost:5000 에서 실행됩니다.

### 6. 브라우저에서 접속

```
http://localhost:5000
```

---

## 프로젝트 구조

```
creator_hub_backend/
├── src/
│   ├── main.py                    # Flask 애플리케이션 진입점
│   ├── routes/
│   │   ├── youtube.py             # YouTube API 라우트
│   │   ├── ai_consultant.py       # AI 컨설팅 라우트 (Gemini)
│   │   └── user.py                # 사용자 관리 라우트
│   ├── models/
│   │   └── user.py                # 데이터베이스 모델
│   └── static/                    # React 빌드 파일 (프론트엔드)
│       ├── index.html
│       └── assets/
├── requirements.txt               # Python 의존성
├── .env.example                   # 환경변수 예시
├── API_SETUP.md                   # API 설정 가이드
└── README.md                      # 프로젝트 설명

creator_hub_frontend/
├── src/
│   ├── App.jsx                    # React 메인 컴포넌트
│   └── components/                # UI 컴포넌트
├── package.json                   # Node.js 의존성
└── vite.config.js                 # Vite 설정
```

---

## API 엔드포인트

### YouTube API

| 엔드포인트 | 메서드 | 설명 |
|----------|--------|------|
| `/api/youtube/channel/:channelId` | GET | 채널 정보 조회 |
| `/api/youtube/channel/:channelId/videos` | GET | 채널 동영상 목록 |
| `/api/youtube/recommendations/hashtags/:channelId` | GET | 해시태그 추천 |
| `/api/youtube/recommendations/topics/:channelId` | GET | 주제 추천 |
| `/api/youtube/trends` | GET | 트렌드 동영상 조회 |

### AI 컨설팅 API (Gemini 2.5 Flash)

| 엔드포인트 | 메서드 | 설명 |
|----------|--------|------|
| `/api/ai/analyze/:channelId` | GET | AI 성장 전략 분석 |
| `/api/ai/content-ideas/:channelId` | GET | 콘텐츠 아이디어 생성 |
| `/api/ai/title-optimizer` | POST | 제목 최적화 |
| `/api/ai/competitor-analysis` | POST | 경쟁 채널 분석 |
| `/api/ai/thumbnail-analysis` | POST | 썸네일 분석 (멀티모달) |

---

## 사용 방법

### 1. 채널 분석

1. 메인 페이지에서 YouTube 채널 ID 또는 핸들(@channelname) 입력
2. "분석하기" 버튼 클릭
3. 채널 정보 및 통계 확인

**예시 채널 ID:**
- `UCJ5v_MCY6GNUBTO8-D3XoAg` (WWE)
- `@Manus-AI` (핸들 형식)

### 2. AI 성장 전략 받기

1. 채널 분석 후 "AI 조언" 탭 클릭
2. "AI 성장 전략 받기" 버튼 클릭
3. Gemini가 생성한 맞춤형 성장 전략 확인

**제공 내용:**
- 채널 현황 분석 (SWOT)
- 단기/중기/장기 성장 전략
- 콘텐츠 최적화 방안
- 트렌드 활용 방법
- 구독자 대비 조회수 비율 분석

### 3. 콘텐츠 아이디어 생성

1. "콘텐츠 아이디어" 탭 클릭
2. "콘텐츠 아이디어 생성하기" 버튼 클릭
3. 10개의 새로운 아이디어 확인

**각 아이디어 포함 내용:**
- 매력적인 영상 제목
- 콘텐츠 내용 설명
- 타겟 시청자층
- 차별화 포인트

### 4. 제목 최적화

1. "도구" 탭 클릭
2. 최적화하고 싶은 제목 입력
3. "제목 최적화하기" 버튼 클릭
4. 5개의 최적화된 제목 확인

**최적화 기준:**
- 클릭률(CTR) 향상
- SEO 키워드 포함
- 호기심 자극
- 50자 이내

### 5. 트렌드 확인

1. 상단의 "트렌드" 버튼 클릭
2. 현재 인기 있는 YouTube 동영상 확인
3. 한국 시장 맞춤 트렌드 정보

---

## Gemini 2.5 Flash의 장점

### 1. 멀티모달 분석
- 썸네일 이미지 직접 분석 가능
- 비디오 내용 이해 (향후 확장 가능)
- 텍스트 + 이미지 통합 분석

### 2. YouTube 특화
- Google 서비스라 YouTube 데이터 이해도 높음
- 크리에이터 생태계에 대한 깊은 이해
- 한국 시장 트렌드 반영

### 3. 비용 효율
- GPT-4보다 10배 이상 저렴
- 무료 할당량 제공
- 높은 성능 대비 낮은 비용

### 4. 한국어 성능
- 한국어 처리 성능 우수
- 한국 문화 이해도 높음
- 자연스러운 한국어 생성

---

## 프론트엔드 수정 방법

### 1. 프론트엔드 개발 환경 설정

```bash
cd creator_hub_frontend
pnpm install  # 또는 npm install
```

### 2. 개발 서버 실행

```bash
pnpm run dev  # 또는 npm run dev
```

http://localhost:5173 에서 개발 서버 실행

### 3. 코드 수정

`src/App.jsx` 파일을 수정하여 UI 변경

### 4. 빌드

```bash
pnpm run build  # 또는 npm run build
```

### 5. 백엔드에 배포

```bash
cp -r dist/* ../creator_hub_backend/src/static/
```

---

## 배포 방법

### 1. Heroku 배포

```bash
# Heroku CLI 설치 후
heroku create creator-hub
heroku config:set OPENAI_API_KEY=sk-your-key-here
git push heroku main
```

### 2. Vercel 배포 (프론트엔드만)

```bash
cd creator_hub_frontend
vercel deploy
```

### 3. Docker 배포

```dockerfile
# Dockerfile 생성
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "src/main.py"]
```

```bash
docker build -t creator-hub .
docker run -p 5000:5000 -e OPENAI_API_KEY=sk-your-key creator-hub
```

---

## 문제 해결

### 1. "YouTube API not available" 오류

**원인**: data_api 모듈을 찾을 수 없음

**해결방법**:
- 로컬 환경에서는 정상적으로 작동하지 않을 수 있음
- YouTube Data API v3 키를 발급받아 공식 API 사용
- 또는 배포된 사이트 사용

### 2. "AI service not available" 오류

**원인**: OpenAI API 키가 설정되지 않음

**해결방법**:
```bash
export OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. "Rate limit exceeded" 오류

**원인**: API 사용량 초과

**해결방법**:
- OpenAI 대시보드에서 사용량 확인
- 결제 정보 등록
- 요청 빈도 줄이기

### 4. CORS 오류

**원인**: 프론트엔드와 백엔드 도메인이 다름

**해결방법**:
- `src/main.py`에 이미 CORS 설정되어 있음
- 필요시 `CORS(app, origins=['https://your-frontend-domain.com'])` 수정

---

## 보안 주의사항

⚠️ **중요:**

1. **API 키 보안**
   - `.env` 파일을 Git에 커밋하지 마세요
   - API 키를 공개 저장소에 업로드하지 마세요
   - `.gitignore`에 `.env` 포함 확인

2. **환경변수 사용**
   - 모든 민감한 정보는 환경변수로 관리
   - 프로덕션 환경에서는 시스템 환경변수 사용

3. **HTTPS 사용**
   - 프로덕션 환경에서는 반드시 HTTPS 사용
   - Let's Encrypt로 무료 SSL 인증서 발급

---

## 비용 예상

### OpenAI API (Gemini 2.5 Flash)

| 사용량 | 예상 비용 |
|--------|----------|
| 100회 분석 | $0.10 - $0.20 |
| 1,000회 분석 | $1 - $2 |
| 10,000회 분석 | $10 - $20 |

### YouTube Data API v3

| 사용량 | 예상 비용 |
|--------|----------|
| 하루 10,000 단위 이하 | 무료 |
| 하루 10,000 단위 초과 | $0.05 / 1,000 단위 |

**대부분의 개인 크리에이터는 무료 범위 내에서 사용 가능합니다.**

---

## 향후 개선 계획

1. **사용자 인증**: 로그인 기능 추가
2. **채널 즐겨찾기**: 자주 분석하는 채널 저장
3. **분석 히스토리**: 과거 분석 결과 저장 및 비교
4. **알림 기능**: 트렌드 변화 알림
5. **팀 협업**: 여러 크리에이터가 함께 사용
6. **모바일 앱**: React Native로 모바일 앱 개발
7. **비디오 분석**: Gemini 멀티모달로 실제 영상 내용 분석
8. **자동 보고서**: 주간/월간 성장 보고서 자동 생성

---

## 라이선스

MIT License

---

## 지원

문제가 발생하거나 질문이 있으시면:
- GitHub Issues 등록
- 이메일 문의
- 문서 참조: `README.md`, `API_SETUP.md`

---

## 개발자

Creator Hub - AI 기반 크리에이터 성장 컨설팅 © 2025

**Powered by:**
- Gemini 2.5 Flash (Google AI)
- YouTube Data API (Google)
- Flask (Python)
- React (Meta)

---

## 참고 자료

- [OpenAI API 문서](https://platform.openai.com/docs)
- [YouTube Data API 문서](https://developers.google.com/youtube/v3)
- [Flask 문서](https://flask.palletsprojects.com/)
- [React 문서](https://react.dev/)
- [Gemini API 문서](https://ai.google.dev/docs)

