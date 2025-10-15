# Render 배포 가이드

## 🚀 Render에 Creator Hub 배포하기

### 1단계: Render 계정 준비
- ✅ 이미 가입 완료하셨습니다!

### 2단계: GitHub 저장소 연결

1. **Render 대시보드 접속**: https://dashboard.render.com
2. **"New +" 버튼 클릭** → **"Web Service" 선택**
3. **GitHub 저장소 연결**:
   - "Connect a repository" 클릭
   - GitHub 계정 인증 (처음 한 번만)
   - `mktbiz-byte/cnecplus` 저장소 선택
   - "Connect" 클릭

### 3단계: 서비스 설정

#### 기본 설정
- **Name**: `creator-hub` (또는 원하는 이름)
- **Region**: `Singapore` (한국과 가장 가까움)
- **Branch**: `main`
- **Root Directory**: 비워두기 (또는 `creator_hub_backend`)
- **Runtime**: `Python 3`

#### Build & Deploy 설정
- **Build Command**: 
  ```bash
  pip install -r requirements.txt
  ```

- **Start Command**: 
  ```bash
  gunicorn -w 4 -b 0.0.0.0:$PORT src.main:app
  ```

#### 플랜 선택
- **Free** (무료) - 테스트용
- **Starter** ($7/월) - 프로덕션 추천 (슬립 모드 없음)

### 4단계: 환경변수 설정

**"Environment" 섹션에서 다음 변수 추가**:

1. **PYTHON_VERSION**
   - Value: `3.11.0`

2. **SECRET_KEY**
   - "Generate" 버튼 클릭 (자동 생성)

3. **GEMINI_API_KEY** (선택사항 - 나중에 관리자 페이지에서 설정 가능)
   - Value: 귀하의 Gemini API 키

4. **YOUTUBE_API_KEY** (선택사항 - 나중에 관리자 페이지에서 설정 가능)
   - Value: 귀하의 YouTube API 키

### 5단계: 배포 시작

1. **"Create Web Service" 버튼 클릭**
2. 자동 배포 시작 (5-10분 소요)
3. 배포 로그 확인

### 6단계: 배포 완료 확인

배포가 완료되면:
- **URL 확인**: `https://creator-hub-xxxx.onrender.com`
- **메인 페이지 접속**: 정상 작동 확인
- **관리자 페이지 접속**: `/admin` 경로

---

## 🔑 관리자 계정 정보

배포 후 첫 실행 시 관리자 계정이 자동 생성됩니다.

**로그에서 비밀번호 확인**:
1. Render 대시보드 → Logs 탭
2. "관리자 계정이 생성되었습니다" 메시지 찾기
3. Username과 Password 확인

**기본 정보**:
- Username: `admin`
- Password: 로그에서 확인 (랜덤 생성)

---

## 📊 API 키 설정 (중요!)

배포 후 반드시 API 키를 설정해야 합니다:

1. **관리자 페이지 접속**: `https://your-app.onrender.com/admin`
2. **로그인**: 위에서 확인한 관리자 계정
3. **API 키 입력**:
   - Gemini API Key
   - YouTube API Key
4. **저장** 버튼 클릭

---

## 🔧 문제 해결

### 배포 실패 시
1. **Logs 탭 확인**: 오류 메시지 확인
2. **Build Command 확인**: `pip install -r requirements.txt`
3. **Start Command 확인**: `gunicorn -w 4 -b 0.0.0.0:$PORT src.main:app`

### 슬립 모드 (무료 플랜)
- 15분 미사용 시 자동 슬립
- 첫 접속 시 10-30초 소요
- **해결**: Starter 플랜으로 업그레이드 ($7/월)

### 데이터베이스 오류
- SQLite 파일이 자동 생성됩니다
- 재배포 시 데이터 초기화됨
- **해결**: 영구 스토리지 필요 시 Render Disk 추가

---

## 🎯 배포 후 체크리스트

- [ ] 메인 페이지 접속 확인
- [ ] 관리자 페이지 로그인
- [ ] API 키 설정
- [ ] 채널 검색 테스트
- [ ] AI 기능 테스트
- [ ] 모바일 반응형 확인

---

## 🔄 업데이트 방법

코드 수정 후:
1. GitHub에 푸시: `git push origin main`
2. Render가 **자동으로 재배포**
3. 배포 완료까지 5-10분 대기

---

## 💰 비용

### 무료 플랜
- 월 $0
- 750시간/월
- 슬립 모드 있음

### Starter 플랜 (추천)
- 월 $7
- 슬립 모드 없음
- 월 1만 방문자 처리 가능

---

## 📞 지원

문제 발생 시:
1. Render Logs 확인
2. GitHub Issues 등록
3. Render 지원팀 문의

---

**배포 성공을 기원합니다! 🚀**

