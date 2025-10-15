from datetime import datetime
from src.models.user import db

class Visitor(db.Model):
    """일일 방문자 추적"""
    __tablename__ = 'visitors'
    
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(50), nullable=False)
    user_agent = db.Column(db.String(500))
    visit_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    visit_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    page_path = db.Column(db.String(200))
    
    def __repr__(self):
        return f'<Visitor {self.ip_address} on {self.visit_date}>'

class Admin(db.Model):
    """관리자 계정"""
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    def __repr__(self):
        return f'<Admin {self.username}>'

