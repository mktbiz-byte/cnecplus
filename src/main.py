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
from src.routes.database import database_bp
from src.routes.video_planner import video_planner_bp
from src.routes.video_planner_v2 import video_planner_v2_bp
from src.routes.special_user_auth import special_user_bp
from src.routes.special_auth import special_auth_bp
from src.routes.creator_contact import creator_contact_bp
from src.routes.search_history_routes import search_history_bp
from src.routes.shorts_planner import shorts_planner_bp
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
app.register_blueprint(database_bp, url_prefix='/api/database')
app.register_blueprint(video_planner_bp, url_prefix='/api/video-planner-old')
app.register_blueprint(video_planner_v2_bp)  # /api/video-planner
app.register_blueprint(special_user_bp)  # /api/special-user
app.register_blueprint(special_auth_bp, url_prefix='/api/special-auth')
app.register_blueprint(creator_contact_bp, url_prefix='/api/creator-contact')
app.register_blueprint(search_history_bp)  # /api/search-history
app.register_blueprint(shorts_planner_bp)  # /api/shorts-planner

# 저장된 API 키 로드
init_api_keys()

# 방문자 추적 미들웨어
@app.before_request
def before_request():
    track_visitor()

# 데이터베이스 설정 (Render.com Persistent Disk 지원)
if os.path.exists('/data'):
    # Render.com Persistent Disk 사용
    db_path = '/data/app.db'
    print(f"✅ Using persistent database at {db_path}")
else:
    # 로컬 개발 환경
    db_path = os.path.join(os.path.dirname(__file__), 'database', 'app.db')
    print(f"ℹ️ Using local database at {db_path}")

app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
with app.app_context():
    db.create_all()
    # 관리자 계정 초기화
    init_admin_user()

# SPA를 위한 catch-all 라우트
# 중요: 이 라우트는 블루프린트가 매칭되지 않은 경로만 처리합니다
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """
    정적 파일 또는 index.html 제공
    블루프린트가 먼저 매칭되므로 API 경로는 여기 도달하지 않음
    """
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    # 정적 파일이 실제로 존재하면 제공
    if path != "":
        file_path = os.path.join(static_folder_path, path)
        if os.path.isfile(file_path):
            return send_from_directory(static_folder_path, path)
    
    # 그 외 모든 경로는 index.html 제공 (React Router가 처리)
    index_path = os.path.join(static_folder_path, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(static_folder_path, 'index.html')
    else:
        return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)


