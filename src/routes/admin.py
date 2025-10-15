from flask import Blueprint, jsonify, request
import os
import json

admin_bp = Blueprint('admin', __name__)

# API 키 저장 경로
CONFIG_FILE = os.path.join(os.path.dirname(__file__), '..', 'config', 'api_keys.json')

def ensure_config_dir():
    """config 디렉토리가 없으면 생성"""
    config_dir = os.path.dirname(CONFIG_FILE)
    if not os.path.exists(config_dir):
        os.makedirs(config_dir)

def load_api_keys():
    """저장된 API 키 로드"""
    ensure_config_dir()
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_api_keys(keys):
    """API 키 저장"""
    ensure_config_dir()
    with open(CONFIG_FILE, 'w') as f:
        json.dump(keys, f, indent=2)

def update_env_variables(keys):
    """환경변수 업데이트"""
    if keys.get('openai_api_key'):
        os.environ['OPENAI_API_KEY'] = keys['openai_api_key']
    if keys.get('youtube_api_key'):
        os.environ['YOUTUBE_API_KEY'] = keys['youtube_api_key']

@admin_bp.route('/api-keys', methods=['GET'])
def get_api_keys():
    """저장된 API 키 조회 (마스킹)"""
    try:
        keys = load_api_keys()
        
        # API 키 마스킹 (보안)
        masked_keys = {}
        if keys.get('openai_api_key'):
            key = keys['openai_api_key']
            masked_keys['openai_api_key'] = f"{key[:7]}...{key[-4:]}" if len(key) > 11 else "***"
        else:
            masked_keys['openai_api_key'] = None
            
        if keys.get('youtube_api_key'):
            key = keys['youtube_api_key']
            masked_keys['youtube_api_key'] = f"{key[:7]}...{key[-4:]}" if len(key) > 11 else "***"
        else:
            masked_keys['youtube_api_key'] = None
        
        return jsonify({
            'keys': masked_keys,
            'hasOpenAI': bool(keys.get('openai_api_key')),
            'hasYouTube': bool(keys.get('youtube_api_key'))
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api-keys', methods=['POST'])
def save_api_keys_endpoint():
    """API 키 저장"""
    try:
        data = request.get_json()
        
        keys = load_api_keys()
        
        # OpenAI API 키 업데이트
        if 'openai_api_key' in data and data['openai_api_key']:
            keys['openai_api_key'] = data['openai_api_key'].strip()
        
        # YouTube API 키 업데이트
        if 'youtube_api_key' in data and data['youtube_api_key']:
            keys['youtube_api_key'] = data['youtube_api_key'].strip()
        
        # 파일에 저장
        save_api_keys(keys)
        
        # 환경변수 업데이트
        update_env_variables(keys)
        
        return jsonify({
            'success': True,
            'message': 'API 키가 성공적으로 저장되었습니다.'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api-keys/test', methods=['POST'])
def test_api_keys():
    """API 키 연결 테스트"""
    try:
        data = request.get_json()
        api_type = data.get('type')  # 'openai' or 'youtube'
        
        results = {}
        
        if api_type == 'openai' or api_type == 'all':
            # OpenAI API 테스트
            try:
                from openai import OpenAI
                client = OpenAI()
                
                # 간단한 테스트 요청
                response = client.chat.completions.create(
                    model="gemini-2.5-flash",
                    messages=[{"role": "user", "content": "Hello"}],
                    max_tokens=10
                )
                
                results['openai'] = {
                    'status': 'success',
                    'message': 'OpenAI API 연결 성공',
                    'model': 'gemini-2.5-flash'
                }
            except Exception as e:
                results['openai'] = {
                    'status': 'error',
                    'message': f'OpenAI API 연결 실패: {str(e)}'
                }
        
        if api_type == 'youtube' or api_type == 'all':
            # YouTube API 테스트
            results['youtube'] = {
                'status': 'info',
                'message': 'YouTube API는 실제 채널 조회 시 테스트됩니다.'
            }
        
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api-keys/delete', methods=['POST'])
def delete_api_key():
    """API 키 삭제"""
    try:
        data = request.get_json()
        key_type = data.get('type')  # 'openai' or 'youtube'
        
        keys = load_api_keys()
        
        if key_type == 'openai':
            if 'openai_api_key' in keys:
                del keys['openai_api_key']
                if 'OPENAI_API_KEY' in os.environ:
                    del os.environ['OPENAI_API_KEY']
        elif key_type == 'youtube':
            if 'youtube_api_key' in keys:
                del keys['youtube_api_key']
                if 'YOUTUBE_API_KEY' in os.environ:
                    del os.environ['YOUTUBE_API_KEY']
        
        save_api_keys(keys)
        
        return jsonify({
            'success': True,
            'message': f'{key_type.upper()} API 키가 삭제되었습니다.'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/status', methods=['GET'])
def get_system_status():
    """시스템 상태 확인"""
    try:
        keys = load_api_keys()
        
        status = {
            'openai': {
                'configured': bool(keys.get('openai_api_key') or os.getenv('OPENAI_API_KEY')),
                'source': 'file' if keys.get('openai_api_key') else ('env' if os.getenv('OPENAI_API_KEY') else 'none')
            },
            'youtube': {
                'configured': bool(keys.get('youtube_api_key') or os.getenv('YOUTUBE_API_KEY')),
                'source': 'file' if keys.get('youtube_api_key') else ('env' if os.getenv('YOUTUBE_API_KEY') else 'none')
            },
            'data_api': {
                'available': os.path.exists('/opt/.manus/.sandbox-runtime')
            }
        }
        
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 앱 시작 시 저장된 API 키를 환경변수로 로드
def init_api_keys():
    """앱 시작 시 저장된 API 키 로드"""
    try:
        keys = load_api_keys()
        update_env_variables(keys)
        print(f"Loaded API keys from config file")
    except Exception as e:
        print(f"Failed to load API keys: {e}")

