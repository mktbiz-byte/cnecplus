# AGENTS.md

## Project

CNEC Shop -- K-뷰티 크리에이터 커머스 플랫폼 (Next.js + Prisma + Railway PostgreSQL + NextAuth v5 + PortOne V2 + Cloudflare R2)

## Development Environment

- macOS (iMac) 환경. WSL/Linux 가정 금지
- .env.local DATABASE_URL = Railway 연결 기준 (127.0.0.1 가정 금지)
- 환경 확인 질문 생략, 바로 작업 시작

## Package Manager

- **pnpm** 사용. `npm install` 절대 금지.
- 패키지 설치: `pnpm add [패키지명]`
- 개발 의존성: `pnpm add -D [패키지명]`

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **ORM**: Prisma 7 + Railway PostgreSQL
- **Auth**: NextAuth.js v5 (beta.30), Credentials provider
- **Payment**: PortOne V2 SDK (`@portone/browser-sdk/v2`)
- **Storage**: Cloudflare R2 (AWS S3 호환)
- **State**: Zustand (auth, cart stores)
- **UI**: shadcn/ui + Radix UI + lucide-react 아이콘
- **Toast**: sonner
- **Deployment**: Vercel (Netlify 사용하지 않음)

## Repository Structure

- `frontend/kviewshop/` -- Next.js app (App Router, TypeScript, Tailwind CSS)
  - `src/app/` -- 페이지 라우트 (locale 기반)
  - `src/components/` -- 공통 컴포넌트
  - `src/lib/actions/` -- Server actions (brand.ts, creator.ts, buyer.ts, shop.ts, admin.ts)
  - `src/lib/store/` -- Zustand stores (auth, cart)
  - `src/lib/utils/` -- 유틸리티 (date.ts 등)
  - `src/lib/stock.ts` -- 재고 차감/복원 (Prisma 트랜잭션)
  - `prisma/schema.prisma` -- DB 스키마

## Code Style

- 한국어 UI 텍스트 사용 (알림, 버튼, 메시지 등 영어 노출 금지)
- TypeScript strict mode
- shadcn/ui 컴포넌트 사용
- lucide-react 아이콘만 (이모지 사용 금지)
- sonner로 토스트 메시지 표시
- Prisma camelCase <-> DB snake_case 혼용 주의
- Decimal 필드는 반드시 `Number()`로 변환 후 사용
- D-day 계산은 `src/lib/utils/date.ts`의 공유 유틸 사용 (Math.ceil 기준)
- Server actions에서 알림 생성 시 try/catch로 감싸서 알림 실패가 주요 로직에 영향 주지 않도록
- 환경 변수 fallback에 실제 키값 하드코딩 절대 금지

## Key Patterns

- Campaign status flow: DRAFT -> RECRUITING -> ACTIVE -> ENDED
- Campaign type: GONGGU (공구) | ALWAYS (상시)
- Notification types: ORDER, SHIPPING, SETTLEMENT, CAMPAIGN, SYSTEM
- Cart: Zustand persist store (`cnec-cart` localStorage key)
- Payment: PortOne V2 SDK 연동 (prepare -> SDK -> complete -> webhook)

## Payment Flow

1. `POST /api/payments/prepare` -- 주문 생성 + 재고 차감 (atomic transaction)
2. Client: PortOne SDK `requestPayment()` 호출
3. `POST /api/payments/complete` -- PortOne API로 결제 검증 + PENDING->PAID
4. `POST /api/payments/webhook` -- HMAC-SHA256 서명 검증 + 이중 금액 확인

## Git Rules

- 커밋 메시지는 conventional commits (feat/fix/chore) 형식
- 작업 완료 후 커밋 + 푸시 + main 머지까지 자동 실행
- PR 생성 불필요, 직접 머지

## Critical Infrastructure -- DO NOT MODIFY

아래 항목은 수정 시 플랫폼 전체에 치명적 영향을 미치는 핵심 인프라.
반드시 충분한 이해 + 테스트 없이는 변경 금지.

### 결제/보안
- 결제 웹훅 HMAC-SHA256 서명 검증 -- 제거/우회 금지
- 결제 완료 시 PortOne API 이중 검증 (금액 + 상태)
- 금액 불일치 시 자동 취소 + 주문 CANCELLED 처리
- 주문 소유권 검증 (로그인 유저: buyerId, 비회원: email+phone)
- 웹훅 멱등성 -- 중복 수신 시 이중 처리 방지
- `toss/payment-cancel.ts` 3회 재시도 로직 -- 제거하면 환불 누락

### 정산/커미션 (Settlement & Commission)
- `admin-settlements.ts` 정산 상태머신 (PENDING->HOLD->PAID/CANCELLED) -- 전이 규칙 변경 금지
- `payments/complete` 내 커미션 계산 (10% 기본 + 캠페인별 오버라이드) -- 기존 계약 소급 변경 절대 금지
- `Conversion` 레코드 생성 로직 -- 크리에이터 매출 귀속(attribution)의 근간
- 감사 로그(`audit.ts`) -- 전자상거래법 5년 기록 보관 의무. 비활성화/삭제 금지

### 크리에이터 어트리뷰션 체인
- `middleware.ts` 내 `last_shop_id` 쿠키 -- 크리에이터 샵 구매 추적 핵심 데이터
- `Cart.shopId` + `Conversion.creatorId` -- 매출 귀속. 잘못 연결 = 다른 크리에이터에게 커미션 지급
- `@username` -> shop 라우팅 rewrite -- 깨지면 모든 크리에이터 샵 접속 불가

### 인증/권한 (Auth & RBAC)
- `auth.ts` JWT callback의 `role` + `userId` -- 빠지면 전체 RBAC 무력화
- `middleware.ts` RBAC 라우트 가드 regex -- 한 글자 틀리면 관리자 페이지 노출
- `middleware.ts` `PLATFORM_PREFIXES` 배열 -- 새 라우트 추가 시 반드시 여기도 업데이트
- `User.ci` unique 제약 -- 제거하면 1인 다계정 생성 가능
- `failedLoginCount` / `lockedUntil` 브루트포스 방어 -- 5회 실패 후 5분 잠금

### 재고/주문 트랜잭션
- `src/lib/stock.ts` -- atomic 재고 차감/복원. 트랜잭션 래퍼 제거 시 overselling 발생
- `payments/prepare` -> SDK -> `payments/complete` -> webhook 순서 -- 결제 플로우 순서 변경 금지

### 시딩/체험 상태머신
- `trial.ts` 상태 전이: `pending->approved->shipped->received->decided` -- 각 전이마다 소유권 검증 포함
- 중복 신청 방지 로직 -- 제거하면 무한 샘플 요청 가능

### DB 스키마 -- 변경 금지 제약조건
- `Order.orderNumber` unique -- 결제 참조 키
- `Creator.username` / `Creator.shopId` unique -- 샵 URL/식별자
- `[buyerId, shopId]` compound on Cart -- 샵당 1카트 보장
- `[cartId, productId, campaignId]` compound on CartItem -- 캠페인가/정상가 구분
- `CampaignParticipation [campaignId, creatorId]` -- 중복 참여 방지
- `ProductReview.orderItemId` unique -- 주문당 1리뷰
- Decimal 정밀도 (commissionRate 5,4 / amount 10,0 등) -- 정밀도 변경 = 정산 오류
- `onDelete: Cascade` on OrderItem->Order -- 제거하면 고아 데이터
- `onDelete: SetNull` on Order->Buyer -- 탈퇴해도 주문 보존

### 알림 시스템
- 모든 `sendNotification` 호출의 try/catch -- 알림 실패가 비즈니스 로직 롤백하면 안 됨
- `kakao.ts` 템플릿 코드 -- 카카오 알림톡 사전등록 템플릿과 매칭. 코드 변경 = 발송 실패
- `normalizePhone` 포맷 -- 전화번호 형식 깨지면 카카오 알림톡 전체 발송 실패
- `logger.ts` PII 마스킹 -- 제거하면 로그에 전화번호/이메일 노출 (PIPA 위반)

### 파일 스토리지
- `NEXT_PUBLIC_R2_PUBLIC_URL` -- 변경하면 DB에 저장된 모든 기존 이미지 URL 깨짐
- 업로드 키 구조 `{folder}/{userId}/{timestamp}.{ext}` -- 구조 변경 = URL 충돌
- 파일 타입 화이트리스트 (jpeg/png/webp/gif) + 5MB 제한 -- 제거하면 악성 파일 업로드 가능

### 브랜드 구독/빌링
- `billing/apply-payment.ts` 플랜별 커미션율 (STANDARD=10%, PRO=8%) + `priorPlanSnapshot` 롤백용 스냅샷
- `billing-env.ts` vs `payment-env.ts` Toss 키 분리 -- 혼용하면 결제 오류

### 카트/체크아웃
- Guest-to-member 카트 병합 (`syncGuestCartToUser`) -- 깨지면 로그인 시 장바구니 소실
- null `campaignId` 처리 workaround -- Prisma compound unique with null 이슈로 upsert 대신 find+create/update 사용 중
