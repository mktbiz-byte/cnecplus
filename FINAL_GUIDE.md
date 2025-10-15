# Creator Hub - 최종 배포 가이드

## 🎉 배포 완료!

**최신 배포 URL**: https://qjh9iec3exog.manus.space

---

## 🆕 새로운 기능: API 설정 관리 페이지

웹 인터페이스에서 직접 API 키를 설정하고 관리할 수 있습니다!

### 접속 방법
1. 메인 페이지 우측 상단 **"API 설정 지원"** 버튼 클릭
2. 관리자 페이지로 이동

### 주요 기능

#### 1. 시스템 상태 확인
- **OpenAI API**: 설정 여부 및 출처 표시
- **YouTube API**: 설정 여부 확인
- **Data API**: 사용 가능 여부 확인

#### 2. API 키 설정
- **OpenAI API 키 입력**: Gemini 2.5 Flash 사용 (필수)
- **YouTube API 키 입력**: 공식 YouTube Data API v3 (선택)
- **저장 버튼**: 서버에 API 키 저장
- **테스트 버튼**: 연결 상태 확인
- **삭제 버튼**: 저장된 API 키 제거

#### 3. API 키 발급 가이드
각 API별로 상세한 발급 방법 제공:

**OpenAI API:**
1. OpenAI Platform 링크 클릭
2. 회원가입 또는 로그인
3. API Keys 메뉴에서 새 키 생성
4. 생성된 키 복사 (sk-로 시작)

**YouTube Data API v3:**
1. Google Cloud Console 링크 클릭
2. 새 프로젝트 생성
3. "API 및 서비스" → "라이브러리"
4. "YouTube Data API v3" 검색 및 활성화
5. "사용자 인증 정보" → "API 키" 생성

#### 4. 비용 정보
- **OpenAI**: Gemini 2.5 Flash 사용 시 1,000회 분석에 약 $1-2
- **YouTube**: 무료 할당량 하루 10,000 단위 (대부분 무료 범위 내)

---

## 📋 전체 기능 목록

### 채널 분석
- YouTube 채널 정보 조회
- 구독자, 동영상 수, 조회수 통계
- 최신 업로드 동영상 목록

### AI 기반 분석 (Gemini 2.5 Flash)
1. **AI 성장 전략**: 채널 데이터 기반 맞춤형 성장 전략
2. **콘텐츠 아이디어**: 채널 스타일에 맞는 새로운 아이디어 10개
3. **제목 최적화**: 클릭률 높은 제목 5개 제안
4. **경쟁 채널 분석**: 경쟁 채널과 비교 분석
5. **썸네일 분석**: 썸네일 개선 방안 제안 (멀티모달)

### 추가 기능
- 트렌드 동영상 조회
- 해시태그 추천
- 주제 추천

### 관리 기능
- API 키 웹 설정
- 시스템 상태 모니터링
- API 연결 테스트

---

## 🚀 사용 시작하기

### 1단계: API 키 설정

**웹 인터페이스 사용 (권장):**
1. https://qjh9iec3exog.manus.space 접속
2. 우측 상단 "API 설정 지원" 클릭
3. OpenAI API 키 입력 및 저장
4. "테스트" 버튼으로 연결 확인

**환경변수 사용 (고급):**
```bash
export OPENAI_API_KEY=sk-your-actual-api-key-here
export OPENAI_BASE_URL=https://api.openai.com/v1
```

### 2단계: 채널 분석
1. 메인 페이지에서 채널 ID 또는 핸들 입력
2. "분석하기" 버튼 클릭
3. 채널 정보 확인

### 3단계: AI 조언 받기
1. "AI 조언" 탭 클릭
2. "AI 성장 전략 받기" 버튼 클릭
3. Gemini가 생성한 맞춤형 전략 확인

---

## 💾 API 키 저장 방식

### 웹 설정 (새로운 기능)
- **저장 위치**: `creator_hub_backend/src/config/api_keys.json`
- **형식**: JSON (암호화되지 않음)
- **우선순위**: 웹 설정 > 환경변수
- **재시작**: 서버 재시작 불필요 (즉시 적용)

### 환경변수 (기존 방식)
- **저장 위치**: 시스템 환경변수
- **형식**: `export OPENAI_API_KEY=...`
- **우선순위**: 웹 설정보다 낮음
- **재시작**: 서버 재시작 필요

---

## 🔒 보안 주의사항

### 웹 설정 사용 시
⚠️ **중요**: API 키는 평문으로 저장됩니다.

**권장 사항:**
1. **개발/테스트 환경**: 웹 설정 사용 가능
2. **프로덕션 환경**: 환경변수 사용 권장
3. **공개 서버**: 관리자 페이지 접근 제한 필요
4. **백업**: `config/api_keys.json` 파일을 Git에 커밋하지 마세요

### 파일 권한 설정
```bash
chmod 600 creator_hub_backend/src/config/api_keys.json
```

### .gitignore 추가
```
src/config/api_keys.json
```

---

## 🛠️ 로컬 설치 및 실행

### 1. 프로젝트 다운로드
```bash
tar -xzf creator_hub_final.tar.gz
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

### 4. 서버 실행
```bash
python src/main.py
```

### 5. 브라우저 접속
```
http://localhost:5000
```

### 6. API 키 설정
- 웹 인터페이스에서 "API 설정 지원" 클릭
- OpenAI API 키 입력 및 저장

---

## 📊 API 엔드포인트

### 관리 API (새로 추가)
| 엔드포인트 | 메서드 | 설명 |
|----------|--------|------|
| `/api/admin/api-keys` | GET | 저장된 API 키 조회 (마스킹) |
| `/api/admin/api-keys` | POST | API 키 저장 |
| `/api/admin/api-keys/test` | POST | API 연결 테스트 |
| `/api/admin/api-keys/delete` | POST | API 키 삭제 |
| `/api/admin/status` | GET | 시스템 상태 확인 |

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

## 📁 프로젝트 구조

```
creator_hub_backend/
├── src/
│   ├── main.py                    # Flask 애플리케이션 진입점
│   ├── config/                    # 설정 파일 (새로 추가)
│   │   └── api_keys.json          # API 키 저장 (자동 생성)
│   ├── routes/
│   │   ├── youtube.py             # YouTube API 라우트
│   │   ├── ai_consultant.py       # AI 컨설팅 라우트 (Gemini)
│   │   ├── admin.py               # 관리자 API 라우트 (새로 추가)
│   │   └── user.py                # 사용자 관리 라우트
│   ├── models/
│   │   └── user.py                # 데이터베이스 모델
│   └── static/                    # React 빌드 파일 (프론트엔드)
│       ├── index.html
│       └── assets/
├── requirements.txt               # Python 의존성
├── .env.example                   # 환경변수 예시
├── API_SETUP.md                   # API 설정 가이드
├── DEPLOYMENT_GUIDE.md            # 배포 가이드
└── README.md                      # 프로젝트 설명

creator_hub_frontend/
├── src/
│   ├── App.jsx                    # React 메인 컴포넌트 (관리자 페이지 포함)
│   └── components/                # UI 컴포넌트
├── package.json                   # Node.js 의존성
└── vite.config.js                 # Vite 설정
```

---

## 🎨 UI/UX 개선사항

### 관리자 페이지
- **시스템 상태 대시보드**: 실시간 API 상태 확인
- **API 키 마스킹**: 보안을 위한 키 일부 숨김 (sk-xxx...xxx)
- **발급 가이드**: 각 API별 상세한 발급 절차
- **외부 링크**: OpenAI Platform, Google Cloud Console 직접 연결
- **테스트 기능**: 저장한 API 키 즉시 테스트
- **삭제 기능**: 확인 후 안전하게 삭제

### 메인 페이지
- **API 설정 버튼**: 우측 상단에 눈에 띄게 배치
- **상태 표시**: API 설정 여부 시각적 표시
- **에러 메시지**: API 키 미설정 시 친절한 안내

---

## 🔧 문제 해결

### 1. "YouTube API not available" 오류
**원인**: data_api 모듈을 찾을 수 없음

**해결방법**:
- 현재는 SearchAPI.io 사용 중 (정상)
- YouTube Data API v3 키를 발급받아 설정하면 공식 API 사용 가능

### 2. "AI service not available" 오류
**원인**: OpenAI API 키가 설정되지 않음

**해결방법**:
1. 웹에서 "API 설정 지원" 클릭
2. OpenAI API 키 입력 및 저장
3. "테스트" 버튼으로 확인

### 3. API 키 저장 후에도 작동하지 않음
**원인**: 서버가 키를 로드하지 못함

**해결방법**:
1. 브라우저 새로고침
2. 서버 재시작 (로컬 환경)
3. `config/api_keys.json` 파일 확인

### 4. "Rate limit exceeded" 오류
**원인**: API 사용량 초과

**해결방법**:
- OpenAI 대시보드에서 사용량 확인
- 결제 정보 등록
- 요청 빈도 줄이기

---

## 💰 비용 예상

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

## 🌟 주요 개선사항 요약

### 이번 업데이트 (v2.0)
✅ **웹 기반 API 키 관리**: 코드 수정 없이 웹에서 API 키 설정  
✅ **시스템 상태 모니터링**: 실시간 API 상태 확인  
✅ **API 발급 가이드**: 상세한 발급 절차 및 외부 링크  
✅ **연결 테스트**: 저장한 API 키 즉시 테스트  
✅ **사용자 친화적 UI**: 직관적인 관리자 페이지  

### 기존 기능 (v1.0)
✅ YouTube 채널 분석  
✅ AI 성장 전략 (Gemini 2.5 Flash)  
✅ 콘텐츠 아이디어 생성  
✅ 제목 최적화  
✅ 트렌드 분석  
✅ 해시태그 추천  

---

## 📚 참고 자료

- [OpenAI API 문서](https://platform.openai.com/docs)
- [YouTube Data API 문서](https://developers.google.com/youtube/v3)
- [Flask 문서](https://flask.palletsprojects.com/)
- [React 문서](https://react.dev/)
- [Gemini API 문서](https://ai.google.dev/docs)

---

## 🎯 다음 단계

### 즉시 사용 가능
1. https://qjh9iec3exog.manus.space 접속
2. "API 설정 지원" 클릭
3. OpenAI API 키 입력
4. 채널 분석 시작!

### 로컬 설치
1. `creator_hub_final.tar.gz` 압축 해제
2. 의존성 설치
3. 서버 실행
4. 웹에서 API 키 설정

---

## 📞 지원

문제가 발생하거나 질문이 있으시면:
- 문서 참조: `README.md`, `API_SETUP.md`, `DEPLOYMENT_GUIDE.md`
- 관리자 페이지의 "도움말" 섹션 확인

---

## ✨ Creator Hub - AI 기반 크리에이터 성장 컨설팅

**Powered by:**
- Gemini 2.5 Flash (Google AI)
- YouTube Data API (Google)
- Flask (Python)
- React (Meta)

**© 2025 Creator Hub - 한국 크리에이터를 위한 성장 파트너**

