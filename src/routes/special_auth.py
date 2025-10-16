"""
특별 계정 인증 시스템
이메일 기반 간단 인증
"""

from flask import Blueprint, request, jsonify, session
from datetime import datetime, timedelta
import os
import json
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

special_auth_bp = Blueprint('special_auth', __name__)

# 특별 계정 이메일 리스트
SPECIAL_ACCOUNTS = os.getenv('SPECIAL_ACCOUNTS', 'special1@example.com,special2@example.com').split(',')

# 인증 코드 저장 (실제 운영 시에는 Redis 등 사용 권장)
verification_codes = {}


def send_verification_email(email, code):
    """
    인증 코드 이메일 발송
    실제 운영 시에는 SendGrid, AWS SES 등 사용 권장
    """
    try:
        # 환경 변수에서 SMTP 설정 가져오기
        smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USER', '')
        smtp_password = os.getenv('SMTP_PASSWORD', '')
        
        if not smtp_user or not smtp_password:
            print("SMTP 설정이 없습니다. 콘솔에 인증 코드 출력합니다.")
            print(f"[인증 코드] {email}: {code}")
            return True
        
        # 이메일 구성
        msg = MIMEMultipart('alternative')
        msg['Subject'] = '[CNEC Plus] 로그인 인증 코드'
        msg['From'] = smtp_user
        msg['To'] = email
        
        # HTML 본문
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 10px;">
              <h2 style="color: #333;">CNEC Plus 로그인 인증</h2>
              <p style="font-size: 16px; color: #666;">안녕하세요,</p>
              <p style="font-size: 16px; color: #666;">
                CNEC Plus 특별 계정 로그인을 위한 인증 코드입니다.
              </p>
              <div style="background-color: #fff; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
                <h1 style="color: #4CAF50; font-size: 36px; margin: 0; letter-spacing: 5px;">
                  {code}
                </h1>
              </div>
              <p style="font-size: 14px; color: #999;">
                이 코드는 10분간 유효합니다.<br>
                본인이 요청하지 않았다면 이 이메일을 무시하세요.
              </p>
            </div>
          </body>
        </html>
        """
        
        part = MIMEText(html, 'html')
        msg.attach(part)
        
        # 이메일 발송
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        return True
        
    except Exception as e:
        print(f"이메일 발송 실패: {e}")
        # 개발 환경에서는 콘솔에 출력
        print(f"[인증 코드] {email}: {code}")
        return True  # 개발 환경에서는 계속 진행


@special_auth_bp.route('/check-email', methods=['POST'])
def check_email():
    """
    이메일이 특별 계정인지 확인
    """
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': '이메일을 입력해주세요.'}), 400
        
        is_special = email in [acc.strip().lower() for acc in SPECIAL_ACCOUNTS]
        
        return jsonify({
            'isSpecialAccount': is_special,
            'message': '특별 계정입니다.' if is_special else '일반 사용자입니다.'
        })
        
    except Exception as e:
        return jsonify({
            'error': '이메일 확인 중 오류 발생',
            'message': str(e)
        }), 500


@special_auth_bp.route('/request-code', methods=['POST'])
def request_verification_code():
    """
    인증 코드 요청
    """
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': '이메일을 입력해주세요.'}), 400
        
        # 특별 계정 확인
        if email not in [acc.strip().lower() for acc in SPECIAL_ACCOUNTS]:
            return jsonify({
                'error': '권한 없음',
                'message': '이 기능은 특별 계정만 사용할 수 있습니다.'
            }), 403
        
        # 6자리 인증 코드 생성
        code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        
        # 만료 시간 설정 (10분)
        expiry = datetime.now() + timedelta(minutes=10)
        
        # 저장
        verification_codes[email] = {
            'code': code,
            'expiry': expiry,
            'attempts': 0
        }
        
        # 이메일 발송
        send_verification_email(email, code)
        
        return jsonify({
            'success': True,
            'message': '인증 코드가 이메일로 전송되었습니다.',
            'expiry': expiry.isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': '인증 코드 요청 중 오류 발생',
            'message': str(e)
        }), 500


@special_auth_bp.route('/verify-code', methods=['POST'])
def verify_code():
    """
    인증 코드 확인 및 로그인
    """
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        code = data.get('code', '').strip()
        
        if not email or not code:
            return jsonify({'error': '이메일과 인증 코드를 입력해주세요.'}), 400
        
        # 저장된 코드 확인
        if email not in verification_codes:
            return jsonify({
                'error': '인증 코드가 존재하지 않습니다.',
                'message': '먼저 인증 코드를 요청해주세요.'
            }), 400
        
        stored = verification_codes[email]
        
        # 만료 확인
        if datetime.now() > stored['expiry']:
            del verification_codes[email]
            return jsonify({
                'error': '인증 코드가 만료되었습니다.',
                'message': '새로운 인증 코드를 요청해주세요.'
            }), 400
        
        # 시도 횟수 확인 (최대 5회)
        if stored['attempts'] >= 5:
            del verification_codes[email]
            return jsonify({
                'error': '인증 시도 횟수를 초과했습니다.',
                'message': '새로운 인증 코드를 요청해주세요.'
            }), 400
        
        # 코드 확인
        if stored['code'] != code:
            stored['attempts'] += 1
            remaining = 5 - stored['attempts']
            return jsonify({
                'error': '인증 코드가 일치하지 않습니다.',
                'message': f'남은 시도 횟수: {remaining}회'
            }), 400
        
        # 인증 성공
        del verification_codes[email]
        
        # 세션 설정
        session['user_email'] = email
        session['is_special_account'] = True
        session['login_time'] = datetime.now().isoformat()
        
        return jsonify({
            'success': True,
            'message': '로그인 성공',
            'user': {
                'email': email,
                'isSpecialAccount': True
            }
        })
        
    except Exception as e:
        return jsonify({
            'error': '인증 확인 중 오류 발생',
            'message': str(e)
        }), 500


@special_auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    로그아웃
    """
    try:
        session.clear()
        return jsonify({
            'success': True,
            'message': '로그아웃되었습니다.'
        })
    except Exception as e:
        return jsonify({
            'error': '로그아웃 중 오류 발생',
            'message': str(e)
        }), 500


@special_auth_bp.route('/session', methods=['GET'])
def get_session():
    """
    현재 세션 정보 조회
    """
    try:
        user_email = session.get('user_email')
        
        if not user_email:
            return jsonify({
                'isLoggedIn': False
            })
        
        return jsonify({
            'isLoggedIn': True,
            'user': {
                'email': user_email,
                'isSpecialAccount': session.get('is_special_account', False),
                'loginTime': session.get('login_time')
            }
        })
        
    except Exception as e:
        return jsonify({
            'error': '세션 조회 중 오류 발생',
            'message': str(e)
        }), 500


@special_auth_bp.route('/update-special-accounts', methods=['POST'])
def update_special_accounts():
    """
    특별 계정 목록 업데이트 (관리자 전용)
    실제 운영 시에는 관리자 인증 추가 필요
    """
    try:
        # 관리자 권한 확인
        if 'admin_id' not in session:
            return jsonify({
                'error': 'Unauthorized',
                'message': '관리자 권한이 필요합니다.'
            }), 401
        
        data = request.json
        new_accounts = data.get('accounts', [])
        
        if not new_accounts or not isinstance(new_accounts, list):
            return jsonify({'error': '유효한 계정 목록을 입력해주세요.'}), 400
        
        # 환경 변수 업데이트 (실제로는 .env 파일 수정 필요)
        global SPECIAL_ACCOUNTS
        SPECIAL_ACCOUNTS = [acc.strip().lower() for acc in new_accounts]
        
        return jsonify({
            'success': True,
            'message': '특별 계정 목록이 업데이트되었습니다.',
            'accounts': SPECIAL_ACCOUNTS
        })
        
    except Exception as e:
        return jsonify({
            'error': '계정 목록 업데이트 중 오류 발생',
            'message': str(e)
        }), 500


@special_auth_bp.route('/list-special-accounts', methods=['GET'])
def list_special_accounts():
    """
    특별 계정 목록 조회 (관리자 전용)
    """
    try:
        # 관리자 권한 확인
        if 'admin_id' not in session:
            return jsonify({
                'error': 'Unauthorized',
                'message': '관리자 권한이 필요합니다.'
            }), 401
        
        return jsonify({
            'success': True,
            'accounts': SPECIAL_ACCOUNTS
        })
        
    except Exception as e:
        return jsonify({
            'error': '계정 목록 조회 중 오류 발생',
            'message': str(e)
        }), 500

