import { logger } from '@/lib/notifications/logger'

const popbill = require('popbill')
const KakaoService = require('popbill/lib/KakaoService')

const POPBILL_LINK_ID = process.env.POPBILL_LINK_ID ?? ''
const POPBILL_SECRET_KEY = process.env.POPBILL_SECRET_KEY ?? ''
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM ?? ''
const POPBILL_SMS_SENDER = process.env.POPBILL_SMS_SENDER ?? ''
const POPBILL_IS_TEST = process.env.POPBILL_IS_TEST === 'true'

function getKakaoService() {
  const config = {
    LinkID: POPBILL_LINK_ID,
    SecretKey: POPBILL_SECRET_KEY,
    IsTest: POPBILL_IS_TEST,
  }
  return new KakaoService(config)
}

function stripHyphens(phone: string): string {
  return phone.replace(/-/g, '')
}

export async function sendKakaoAlimtalk(params: {
  templateCode: string
  receiverNum: string
  receiverName: string
  message: string
  altText?: string
}): Promise<{ success: boolean; error?: string }> {
  if (!POPBILL_LINK_ID || !POPBILL_SECRET_KEY || !POPBILL_CORP_NUM) {
    logger.warn('팝빌 환경변수가 설정되지 않았습니다')
    return { success: false, error: '팝빌 환경변수 누락' }
  }

  const receiverNum = stripHyphens(params.receiverNum)
  if (!receiverNum) {
    return { success: false, error: '수신자 번호 없음' }
  }

  const kakaoService = getKakaoService()

  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    try {
      // sendATS_one: CorpNum, templateCode, Sender(SMS발신번호), content, altContent, altSendType, sndDT, receiver, receiverName, success, error
      // Sender = 알림톡 실패 시 대체문자 발신번호 (카카오 채널은 템플릿에 연결됨)
      // altSendType: 'C' = 알림톡 실패 시 대체문자 발송
      const altContent = params.altText || params.message
      const altSendType = 'C'
      const sndDT = '' // 즉시 발송

      kakaoService.sendATS_one(
        POPBILL_CORP_NUM,
        params.templateCode,
        POPBILL_SMS_SENDER,
        params.message,
        altContent,
        altSendType,
        sndDT,
        receiverNum,
        params.receiverName,
        (receiptNum: string) => {
          logger.info('알림톡 발송 성공', { receiverNum: logger.mask(receiverNum) })
          resolve({ success: true })
        },
        (err: { code: number; message: string }) => {
          logger.error('알림톡 발송 실패', err, { receiverNum: logger.mask(receiverNum) })
          resolve({ success: false, error: `${err.code}: ${err.message}` })
        },
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('알림톡 발송 중 에러', err, { receiverNum: logger.mask(receiverNum) })
      resolve({ success: false, error: message })
    }
  })
}
