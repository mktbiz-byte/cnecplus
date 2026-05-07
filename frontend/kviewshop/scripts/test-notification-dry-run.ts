import { proposalGongguInviteMessage, proposalProductPickMessage, bulkSendReportMessage } from '../src/lib/notifications/templates'

async function main() {
  console.log('===== 1. 공구 초대 템플릿 =====')
  const gonggu = proposalGongguInviteMessage({
    creatorName: '테스트 크리에이터',
    brandName: '테스트 브랜드',
    campaignName: '테스트 캠페인',
    commissionRate: 15,
    messageBody: '안녕하세요, 테스트 메시지입니다.',
    acceptUrl: 'https://www.cnecshop.com/ko/creator/proposals/test-id',
  })
  console.log('카카오 templateCode:', gonggu.kakao.templateCode)
  console.log('카카오 메시지:', gonggu.kakao.message.substring(0, 80) + '...')
  console.log('이메일 제목:', gonggu.email.subject)
  console.log('이메일 HTML 길이:', gonggu.email.html.length, 'chars')
  console.log('인앱:', gonggu.inApp)

  console.log('\n===== 2. 상품 추천 템플릿 =====')
  const pick = proposalProductPickMessage({
    creatorName: '테스트 크리에이터',
    brandName: '테스트 브랜드',
    productName: '테스트 상품',
    commissionRate: 10,
    messageBody: '추천 상품입니다.',
    acceptUrl: 'https://www.cnecshop.com/ko/creator/proposals/test-id',
  })
  console.log('카카오 templateCode:', pick.kakao.templateCode)
  console.log('이메일 제목:', pick.email.subject)
  console.log('인앱:', pick.inApp)

  console.log('\n===== 3. 벌크 리포트 템플릿 =====')
  const report = bulkSendReportMessage({
    brandName: '테스트 브랜드',
    sentCount: 45,
    failedCount: 5,
    channelBreakdown: { inApp: 30, email: 20, kakao: 15, dm: 10 },
    paidCount: 10,
    paidAmount: 5000,
    reportLink: 'https://www.cnecshop.com/brand/creators/proposals',
  })
  console.log('카카오:', report.kakao)
  console.log('이메일 제목:', report.email!.subject)
  console.log('이메일 HTML 길이:', report.email!.html.length, 'chars')
  console.log('인앱:', report.inApp)

  console.log('\n===== 4. 환경변수 체크 =====')
  console.log('SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET')
  console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? 'SET' : 'NOT SET')
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM ? 'SET' : 'NOT SET')
  console.log('POPBILL_LINK_ID:', process.env.POPBILL_LINK_ID ? 'SET' : 'NOT SET')
  console.log('POPBILL_SECRET_KEY:', process.env.POPBILL_SECRET_KEY ? 'SET' : 'NOT SET')
  console.log('POPBILL_CORP_NUM:', process.env.POPBILL_CORP_NUM ? 'SET' : 'NOT SET')
  console.log('POPBILL_SMS_SENDER:', process.env.POPBILL_SMS_SENDER ? 'SET' : 'NOT SET')

  console.log('\n===== DONE =====')
}

main().catch(console.error)
