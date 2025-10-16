"""
특별 계정 인증 및 관리 라우트
"""

from flask import Blueprint, request, jsonify, session
from datetime import datetime
import sys
import os

# 상위 디렉토리를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.special_user import SpecialUser, db
from middleware.auth import require_admin as admin_required

special_user_bp = Blueprint('special_user', __name__, url_prefix='/api/special-user')

@special_user_bp.route('/login', methods=['POST'])
def login():
    """특별 계정 로그인"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': '아이디와 비밀번호를 입력해주세요'}), 400
        
        # 사용자 조회
        user = SpecialUser.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({'error': '존재하지 않는 계정입니다'}), 401
        
        if not user.is_active:
            return jsonify({'error': '비활성화된 계정입니다. 관리자에게 문의하세요'}), 403
        
        if not user.check_password(password):
            return jsonify({'error': '비밀번호가 일치하지 않습니다'}), 401
        
        # 로그인 성공 - 세션 설정
        session['special_user_id'] = user.id
        session['special_username'] = user.username
        
        # 마지막 로그인 시간 업데이트
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': '로그인 성공',
            'user': {
                'username': user.username,
                'display_name': user.display_name
            }
        })
    
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': '로그인 처리 중 오류가 발생했습니다'}), 500

@special_user_bp.route('/logout', methods=['POST'])
def logout():
    """특별 계정 로그아웃"""
    session.pop('special_user_id', None)
    session.pop('special_username', None)
    return jsonify({'message': '로그아웃 되었습니다'})

@special_user_bp.route('/check', methods=['GET'])
def check_auth():
    """로그인 상태 확인"""
    if 'special_user_id' in session:
        user = SpecialUser.query.get(session['special_user_id'])
        if user and user.is_active:
            return jsonify({
                'authenticated': True,
                'user': {
                    'username': user.username,
                    'display_name': user.display_name
                }
            })
    
    return jsonify({'authenticated': False})

# ============================================================
# 관리자 전용 - 특별 계정 관리
# ============================================================

@special_user_bp.route('/admin/list', methods=['GET'])
@admin_required
def list_users():
    """특별 계정 목록 조회 (관리자 전용)"""
    try:
        users = SpecialUser.query.order_by(SpecialUser.created_at.desc()).all()
        return jsonify({
            'users': [user.to_dict() for user in users]
        })
    except Exception as e:
        print(f"List users error: {e}")
        return jsonify({'error': '계정 목록 조회 실패'}), 500

@special_user_bp.route('/admin/create', methods=['POST'])
@admin_required
def create_user():
    """특별 계정 생성 (관리자 전용)"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        display_name = data.get('display_name')
        notes = data.get('notes', '')
        
        if not username or not password:
            return jsonify({'error': '아이디와 비밀번호는 필수입니다'}), 400
        
        # 중복 확인
        existing = SpecialUser.query.filter_by(username=username).first()
        if existing:
            return jsonify({'error': '이미 존재하는 아이디입니다'}), 400
        
        # 새 계정 생성
        new_user = SpecialUser(
            username=username,
            display_name=display_name or username,
            created_by=session.get('username', 'admin'),
            notes=notes
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': '계정이 생성되었습니다',
            'user': new_user.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        print(f"Create user error: {e}")
        return jsonify({'error': '계정 생성 실패'}), 500

@special_user_bp.route('/admin/update/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """특별 계정 수정 (관리자 전용)"""
    try:
        user = SpecialUser.query.get(user_id)
        if not user:
            return jsonify({'error': '존재하지 않는 계정입니다'}), 404
        
        data = request.json
        
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        
        if 'display_name' in data:
            user.display_name = data['display_name']
        
        if 'is_active' in data:
            user.is_active = data['is_active']
        
        if 'notes' in data:
            user.notes = data['notes']
        
        db.session.commit()
        
        return jsonify({
            'message': '계정이 수정되었습니다',
            'user': user.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        print(f"Update user error: {e}")
        return jsonify({'error': '계정 수정 실패'}), 500

@special_user_bp.route('/admin/delete/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """특별 계정 삭제 (관리자 전용)"""
    try:
        user = SpecialUser.query.get(user_id)
        if not user:
            return jsonify({'error': '존재하지 않는 계정입니다'}), 404
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': '계정이 삭제되었습니다'})
    
    except Exception as e:
        db.session.rollback()
        print(f"Delete user error: {e}")
        return jsonify({'error': '계정 삭제 실패'}), 500

