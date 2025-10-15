from datetime import datetime
from flask import request
from src.models.user import db
from src.models.analytics import Visitor

def track_visitor():
    """방문자 추적 미들웨어"""
    try:
        # 관리자 페이지나 API 호출은 제외
        if request.path.startswith('/api/') or request.path.startswith('/admin'):
            return
        
        # IP 주소 가져오기
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        
        # User Agent 가져오기
        user_agent = request.headers.get('User-Agent', '')
        
        # 방문 기록 저장
        visitor = Visitor(
            ip_address=ip_address,
            user_agent=user_agent,
            page_path=request.path,
            visit_date=datetime.utcnow().date(),
            visit_time=datetime.utcnow()
        )
        
        db.session.add(visitor)
        db.session.commit()
    
    except Exception as e:
        # 에러가 발생해도 메인 기능에 영향 없도록
        print(f"Visitor tracking error: {e}")
        db.session.rollback()

