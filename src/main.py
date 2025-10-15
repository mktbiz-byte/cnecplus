import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
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

# API 블루프린트 등록 (catch-all 라우트보다 먼저 등록)
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

# Static file serving (이 부분을 맨 마지막에 배치)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

