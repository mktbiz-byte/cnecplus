"""
인증 미들웨어
"""

from functools import wraps
from flask import session, jsonify

def require_admin(f):
    """
    관리자 권한 확인 데코레이터
    
    세션에 admin_id가 있는지 확인하고,
    없으면 401 Unauthorized 반환
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            return jsonify({'error': 'Unauthorized', 'message': 'Admin login required'}), 401
        return f(*args, **kwargs)
    return decorated_function

