"""
검색 기록 모델
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class SearchHistory(db.Model):
    """채널 검색 기록"""
    __tablename__ = 'search_history'
    
    id = db.Column(db.Integer, primary_key=True)
    search_type = db.Column(db.String(50))  # 'channel', 'email', 'trend' 등
    query = db.Column(db.String(500))  # 검색어
    result_data = db.Column(db.Text)  # 검색 결과 (JSON)
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """딕셔너리 변환"""
        return {
            'id': self.id,
            'search_type': self.search_type,
            'query': self.query,
            'result_data': self.result_data,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<SearchHistory {self.search_type}: {self.query}>'


class EmailSearchHistory(db.Model):
    """이메일 검색 기록"""
    __tablename__ = 'email_search_history'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_url = db.Column(db.String(500))
    channel_name = db.Column(db.String(200))
    email_found = db.Column(db.String(200))
    success = db.Column(db.Boolean, default=False)
    ip_address = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """딕셔너리 변환"""
        return {
            'id': self.id,
            'channel_url': self.channel_url,
            'channel_name': self.channel_name,
            'email_found': self.email_found,
            'success': self.success,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<EmailSearchHistory {self.channel_name}>'

