import os
import hashlib
import secrets
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, session
from src.models.user import db
from src.models.analytics import Visitor, Admin
from sqlalchemy import func

admin_auth_bp = Blueprint('admin_auth', __name__)

# 세션 시크릿 키
SECRET_KEY = os.getenv('ADMIN_SECRET_KEY', 'your-secret-key-change-this-in-production')

def hash_password(password):
    """비밀번호 해싱"""
    return hashlib.sha256(password.encode()).hexdigest()

def init_admin_user():
    """초기 관리자 계정 생성"""
    try:
        # 기존 관리자 확인
        existing_admin = Admin.query.filter_by(username='admin').first()
        if not existing_admin:
            # 고정 임시 비밀번호 (첫 배포용)
            default_password = 'cnecplus2025!'
            
            admin = Admin(
                username='admin',
                password_hash=hash_password(default_password)
            )
            db.session.add(admin)
            db.session.commit()
            
            print("=" * 60)
            print("🔐 관리자 계정이 생성되었습니다!")
            print(f"   Username: admin")
            print(f"   Password: {default_password}")
            print("   ⚠️  로그인 후 반드시 비밀번호를 변경하세요!")
            print("=" * 60)
            
            return default_password
        else:
            print("ℹ️  기존 관리자 계정이 존재합니다.")
            print("   Username: admin")
            print("   Password: cnecplus2025! (기본 비밀번호)")
        return None
    except Exception as e:
        print(f"Error creating admin user: {e}")
        return None

@admin_auth_bp.route('/login', methods=['POST'])
def admin_login():
    """관리자 로그인"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        # 관리자 확인
        admin = Admin.query.filter_by(username=username).first()
        
        if not admin or admin.password_hash != hash_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # 세션에 저장
        session['admin_id'] = admin.id
        session['admin_username'] = admin.username
        
        # 마지막 로그인 시간 업데이트
        admin.last_login = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'username': admin.username
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_auth_bp.route('/logout', methods=['POST'])
def admin_logout():
    """관리자 로그아웃"""
    session.pop('admin_id', None)
    session.pop('admin_username', None)
    return jsonify({'success': True})

@admin_auth_bp.route('/check', methods=['GET'])
def check_admin():
    """관리자 로그인 상태 확인"""
    if 'admin_id' in session:
        return jsonify({
            'authenticated': True,
            'username': session.get('admin_username')
        })
    return jsonify({'authenticated': False})

@admin_auth_bp.route('/stats', methods=['GET'])
def get_stats():
    """방문자 통계"""
    try:
        # 관리자 확인
        if 'admin_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # 오늘 방문자 수
        today = datetime.utcnow().date()
        today_visitors = Visitor.query.filter(
            func.date(Visitor.visit_time) == today
        ).count()
        
        # 오늘 고유 IP 수
        today_unique = db.session.query(
            func.count(func.distinct(Visitor.ip_address))
        ).filter(
            func.date(Visitor.visit_time) == today
        ).scalar()
        
        # 어제 방문자 수
        yesterday = today - timedelta(days=1)
        yesterday_visitors = Visitor.query.filter(
            func.date(Visitor.visit_time) == yesterday
        ).count()
        
        # 최근 7일 방문자 수
        week_ago = today - timedelta(days=7)
        week_visitors = Visitor.query.filter(
            Visitor.visit_time >= week_ago
        ).count()
        
        # 전체 방문자 수
        total_visitors = Visitor.query.count()
        
        # 일별 통계 (최근 30일)
        thirty_days_ago = today - timedelta(days=30)
        daily_stats = db.session.query(
            func.date(Visitor.visit_time).label('date'),
            func.count(Visitor.id).label('count'),
            func.count(func.distinct(Visitor.ip_address)).label('unique_count')
        ).filter(
            Visitor.visit_time >= thirty_days_ago
        ).group_by(
            func.date(Visitor.visit_time)
        ).order_by(
            func.date(Visitor.visit_time).desc()
        ).all()
        
        daily_data = [
            {
                'date': str(stat.date),
                'visits': stat.count,
                'unique_visitors': stat.unique_count
            }
            for stat in daily_stats
        ]
        
        # 최근 방문 기록 (최근 50개)
        recent_visits = Visitor.query.order_by(
            Visitor.visit_time.desc()
        ).limit(50).all()
        
        recent_data = [
            {
                'ip': visit.ip_address,
                'time': visit.visit_time.strftime('%Y-%m-%d %H:%M:%S'),
                'page': visit.page_path or '/',
                'user_agent': visit.user_agent[:100] if visit.user_agent else 'Unknown'
            }
            for visit in recent_visits
        ]
        
        return jsonify({
            'today': {
                'total': today_visitors,
                'unique': today_unique
            },
            'yesterday': {
                'total': yesterday_visitors
            },
            'week': {
                'total': week_visitors
            },
            'all_time': {
                'total': total_visitors
            },
            'daily_stats': daily_data,
            'recent_visits': recent_data
        })
    
    except Exception as e:
        print(f"Error getting stats: {e}")
        return jsonify({'error': str(e)}), 500

@admin_auth_bp.route('/change-password', methods=['POST'])
def change_password():
    """비밀번호 변경"""
    try:
        # 관리자 확인
        if 'admin_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.json
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Both passwords required'}), 400
        
        admin = Admin.query.get(session['admin_id'])
        
        if admin.password_hash != hash_password(current_password):
            return jsonify({'error': 'Current password incorrect'}), 401
        
        admin.password_hash = hash_password(new_password)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Password changed successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

