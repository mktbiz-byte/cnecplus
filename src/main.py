import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, request
from flask_cors import CORS
from dotenv import load_dotenv
from src.models.user import db

# .env 파일 로드
load_dotenv()
from src.routes.user import user_bp
from src.routes.youtube import youtube_bp
from src.routes.ai_consultant import ai_bp
from src.routes.admin import admin_bp, init_api_keys
from src.routes.analytics import analytics_bp
from src.routes.trends import trends_bp
from src.routes.beauty import beauty_bp
from src.routes.admin_auth import admin_auth_bp, init_admin_user
from src.middleware.visitor_tracker import track_visitor

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'asdf#FGSgvasgf$5$WGT')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
CORS(app, supports_credentials=True)

# API 블루프린트 등록
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(youtube_bp, url_prefix='/api/youtube')
app.register_blueprint(ai_bp, url_prefix='/api/ai')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
app.register_blueprint(trends_bp, url_prefix='/api/trends')
app.register_blueprint(beauty_bp, url_prefix='/api/beauty')
app.register_blueprint(admin_auth_bp, url_prefix='/api/admin-auth')

# 저장된 API 키 로드
init_api_keys()

# 방문자 추적 미들웨어
@app.before_request
def before_request():
    track_visitor()

# uncomment if you need to use database
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
with app.app_context():
    db.create_all()
    # 관리자 계정 초기화
    init_admin_user()

# 루트 경로
@app.route('/')
def index():
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404
    
    index_path = os.path.join(static_folder_path, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(static_folder_path, 'index.html')
    else:
        return "index.html not found", 404

# 404 에러 핸들러 - React Router를 위한 SPA 폴백
@app.errorhandler(404)
def not_found(e):
    # API 경로에 대한 404는 JSON으로 반환하고 끝
    if request.path.startswith('/api/'):
        from flask import jsonify
        return jsonify({'error': 'Not found'}), 404
    
    # 그 외 경로는 정적 파일 또는 index.html 제공
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404
    
    # 요청 경로에 해당하는 정적 파일이 있으면 제공
    requested_path = request.path.lstrip('/')
    if requested_path and os.path.exists(os.path.join(static_folder_path, requested_path)):
        return send_from_directory(static_folder_path, requested_path)
    
    # 없으면 index.html 제공 (React Router가 처리)
    index_path = os.path.join(static_folder_path, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(static_folder_path, 'index.html')
    else:
        return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

