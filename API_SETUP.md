# Creator Hub - API 설정 가이드

## 필요한 API 키

이 애플리케이션을 실행하려면 다음 API 키가 필요합니다:

### 1. OpenAI API 키 (필수)
AI 기능 (성장 전략 분석, 콘텐츠 아이디어, 제목 최적화)을 사용하려면 필요합니다.

**발급 방법:**
1. https://platform.openai.com 접속
2. 회원가입 또는 로그인
3. API Keys 메뉴에서 새 키 생성
4. 생성된 키 복사 (sk-로 시작)

**비용:**
- GPT-4.1-mini 모델 사용 (저렴한 모델)
- 약 1,000회 분석 시 $1-2 정도 예상

### 2. YouTube Data API v3 키 (선택)
현재는 SearchAPI.io를 사용하지만, 공식 YouTube API를 사용하려면 필요합니다.

**발급 방법:**
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성
3. "API 및 서비스" > "라이브러리"에서 "YouTube Data API v3" 활성화
4. "사용자 인증 정보" > "사용자 인증 정보 만들기" > "API 키" 선택

**비용:**
- 무료 할당량: 하루 10,000 단위
- 채널 조회 1회 = 1 단위
- 비디오 목록 조회 1회 = 1 단위

---

## 환경변수 설정 방법

### 로컬 개발 환경

1. `creator_hub_backend` 폴더에 `.env` 파일 생성:

```bash
cd creator_hub_backend
nano .env
```

2. 다음 내용 입력:

```env
# OpenAI API 키 (필수)
OPENAI_API_KEY=sk-your-openai-api-key-here

# OpenAI API 베이스 URL (기본값 사용)
OPENAI_BASE_URL=https://api.openai.com/v1

# YouTube Data API v3 키 (선택 - 현재는 SearchAPI 사용)
YOUTUBE_API_KEY=your-youtube-api-key-here
```

3. 저장 후 종료 (Ctrl+O, Enter, Ctrl+X)

### 배포 환경 (서버)

배포 플랫폼에 따라 환경변수 설정:

**Heroku:**
```bash
heroku config:set OPENAI_API_KEY=sk-your-key-here
```

**Vercel/Netlify:**
- 대시보드에서 Environment Variables 섹션에 추가

**Docker:**
```bash
docker run -e OPENAI_API_KEY=sk-your-key-here ...
```

---

## 테스트 방법

1. 서버 실행:
```bash
cd creator_hub_backend
source venv/bin/activate
python src/main.py
```

2. 브라우저에서 http://localhost:5000 접속

3. 채널 ID 입력 후 "AI 조언" 탭에서 테스트

4. 정상 작동 시 한국어로 된 성장 전략이 표시됩니다

---

## 문제 해결

### "API key not found" 오류
- `.env` 파일이 `creator_hub_backend` 폴더에 있는지 확인
- 환경변수 이름이 정확한지 확인 (`OPENAI_API_KEY`)

### "Rate limit exceeded" 오류
- OpenAI API 사용량 초과
- https://platform.openai.com/usage 에서 사용량 확인
- 결제 정보 등록 필요할 수 있음

### AI 기능이 작동하지 않음
- 서버 로그 확인
- OpenAI API 키가 유효한지 확인
- 인터넷 연결 확인

---

## 보안 주의사항

⚠️ **중요:**
- `.env` 파일을 절대 Git에 커밋하지 마세요
- API 키를 공개 저장소에 업로드하지 마세요
- `.gitignore`에 `.env`가 포함되어 있는지 확인하세요

---

## 비용 최적화 팁

1. **캐싱 사용**: 같은 채널을 여러 번 분석할 때 결과 저장
2. **모델 선택**: GPT-4.1-mini 대신 GPT-3.5-turbo 사용 (더 저렴)
3. **토큰 제한**: max_tokens 값을 줄여서 비용 절감
4. **사용량 모니터링**: OpenAI 대시보드에서 정기적으로 확인

---

## 지원

문제가 발생하면 다음을 확인하세요:
- 서버 로그 (`python src/main.py` 실행 시 출력)
- 브라우저 개발자 도구 콘솔
- API 키 유효성

