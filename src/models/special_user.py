"""
특별 계정 모델 (영상 기획안 전용)
"""

from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from src.models.user import db

class SpecialUser(db.Model):
    """특별 계정 (관리자가 직접 발급)"""
    __tablename__ = 'special_users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    display_name = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(80))  # 발급한 관리자
    last_login = db.Column(db.DateTime)
    notes = db.Column(db.Text)  # 메모 (크리에이터 정보 등)
    
    def set_password(self, password):
        """비밀번호 해시 설정"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """비밀번호 확인"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """딕셔너리 변환"""
        return {
            'id': self.id,
            'username': self.username,
            'display_name': self.display_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'notes': self.notes
        }
    
    def __repr__(self):
        return f'<SpecialUser {self.username}>'

