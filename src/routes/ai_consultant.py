import sys
import os

from flask import Blueprint, jsonify, request
import json

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    print("Warning: google-generativeai not available")

ai_bp = Blueprint('ai', __name__)

# Gemini API 설정
def get_gemini_client():
    """Gemini 클라이언트 가져오기"""
    if not HAS_GEMINI:
        return None
    
    # API 키 우선순위: 환경변수 > 파일 > 하드코딩
    api_key = None
    
    # 환경변수에서 로드
    api_key = os.getenv('GEMINI_API_KEY')
    
    # 파일에서 로드
    if not api_key:
        config_file = os.path.join(os.path.dirname(__file__), '..', 'config', 'api_keys.json')
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    keys = json.load(f)
                    api_key = keys.get('gemini_api_key')
            except Exception as e:
                print(f"Error loading config file: {e}")
    
    # 하드코딩된 키 (테스트용)
    if not api_key:
        api_key = 'AIzaSyDuMT2mTZryMArPHuY9YK7RuCjBxF2Xlb8'
    
    if api_key:
        try:
            genai.configure(api_key=api_key)
            return genai.GenerativeModel('gemini-2.0-flash-exp')
        except Exception as e:
            print(f"Error configuring Gemini: {e}")
            return None
    
    return None

@ai_bp.route('/analyze', methods=['POST'])
def analyze_channel():
    """채널 분석 및 AI 기반 성장 전략 제안 (Gemini 2.0 Flash)"""
    
    # 디버깅 정보
    debug_info = {
        'has_gemini': HAS_GEMINI,
        'gemini_api_key_set': bool(os.getenv('GEMINI_API_KEY')),
        'config_file_exists': os.path.exists(os.path.join(os.path.dirname(__file__), '..', 'config', 'api_keys.json'))
    }
    
    gemini_model = get_gemini_client()
    if not gemini_model:
        return jsonify({
            'error': 'Gemini API not available. Please configure GEMINI_API_KEY',
            'debug': debug_info
        }), 503
    
    try:
        # 프론트엔드에서 채널 데이터 받기
        channel_data = request.json
        
        channel_title = channel_data.get('title', '')
        channel_description = channel_data.get('description', '')
        subscribers = channel_data.get('stats', {}).get('subscribersText', '0')
        total_videos = channel_data.get('stats', {}).get('videos', 0)
        total_views = channel_data.get('stats', {}).get('views', 0)
        
        # Gemini에게 분석 요청
        prompt = f"""
당신은 YouTube 크리에이터 성장 전문가입니다. 다음 채널을 분석하고 한국 시장에 맞는 성장 전략을 제안해주세요.

**채널 정보:**
- 채널명: {channel_title}
- 구독자: {subscribers}
- 동영상 수: {total_videos}
- 총 조회수: {total_views:,}
- 설명: {channel_description[:500]}

**분석 요청:**
1. 채널의 강점과 약점 분석
2. 한국 시장에서의 기회와 위협 요소
3. 구체적인 성장 전략 (단기/중기/장기)
4. 콘텐츠 개선 방안
5. 시청자 참여도 향상 방법

한국어로 상세하고 실용적인 조언을 제공해주세요.
"""
        
        response = gemini_model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            'analysis': analysis,
            'channel': {
                'title': channel_title,
                'subscribers': subscribers,
                'videos': total_videos,
                'views': total_views
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/content-ideas', methods=['POST'])
def generate_content_ideas():
    """콘텐츠 아이디어 생성 (Gemini 2.0 Flash)"""
    gemini_model = get_gemini_client()
    if not gemini_model:
        return jsonify({'error': 'Gemini API not available'}), 503
    
    try:
        channel_data = request.json
        
        channel_title = channel_data.get('title', '')
        channel_description = channel_data.get('description', '')
        
        prompt = f"""
당신은 YouTube 콘텐츠 기획 전문가입니다. 다음 채널을 위한 새로운 콘텐츠 아이디어 10개를 제안해주세요.

**채널 정보:**
- 채널명: {channel_title}
- 설명: {channel_description[:300]}

**요구사항:**
1. 채널의 정체성에 맞는 아이디어
2. 한국 시청자에게 인기있을 주제
3. 실현 가능한 아이디어
4. 각 아이디어마다 간단한 설명 포함

10개의 콘텐츠 아이디어를 번호와 함께 제시해주세요.
"""
        
        response = gemini_model.generate_content(prompt)
        ideas = response.text
        
        return jsonify({
            'ideas': ideas
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/title-optimizer', methods=['POST'])
def optimize_title():
    """제목 최적화 (Gemini 2.0 Flash)"""
    gemini_model = get_gemini_client()
    if not gemini_model:
        return jsonify({'error': 'Gemini API not available'}), 503
    
    try:
        data = request.json
        original_title = data.get('title', '')
        
        if not original_title:
            return jsonify({'error': 'Title is required'}), 400
        
        prompt = f"""
당신은 YouTube SEO 전문가입니다. 다음 제목을 최적화하여 클릭률(CTR)을 높여주세요.

**원본 제목:** {original_title}

**요구사항:**
1. 한국어로 자연스러운 제목
2. 50자 이내
3. 감정을 자극하는 단어 사용
4. 숫자나 구체적인 정보 포함
5. SEO 키워드 최적화

5개의 최적화된 제목 옵션을 제시해주세요.
"""
        
        response = gemini_model.generate_content(prompt)
        optimized_titles = response.text
        
        return jsonify({
            'original': original_title,
            'optimized': optimized_titles
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/competitor-analysis', methods=['POST'])
def analyze_competitors():
    """경쟁 채널 분석 (Gemini 2.0 Flash)"""
    gemini_model = get_gemini_client()
    if not gemini_model:
        return jsonify({'error': 'Gemini API not available'}), 503
    
    try:
        data = request.json
        my_channel = data.get('myChannel', {})
        competitor_channels = data.get('competitors', [])
        
        prompt = f"""
당신은 YouTube 시장 분석 전문가입니다. 다음 채널들을 비교 분석해주세요.

**내 채널:**
- 이름: {my_channel.get('title', '')}
- 구독자: {my_channel.get('subscribers', '')}

**경쟁 채널들:**
{chr(10).join([f"- {c.get('title', '')}: {c.get('subscribers', '')} 구독자" for c in competitor_channels])}

**분석 요청:**
1. 경쟁 채널의 성공 요인
2. 내 채널과의 차별화 포인트
3. 벤치마킹할 전략
4. 개선 방안

한국 시장 관점에서 분석해주세요.
"""
        
        response = gemini_model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            'analysis': analysis
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/thumbnail-analysis', methods=['POST'])
def analyze_thumbnail():
    """썸네일 분석 (Gemini 2.0 Flash - 멀티모달)"""
    gemini_model = get_gemini_client()
    if not gemini_model:
        return jsonify({'error': 'Gemini API not available'}), 503
    
    try:
        data = request.json
        thumbnail_url = data.get('thumbnailUrl', '')
        
        if not thumbnail_url:
            return jsonify({'error': 'Thumbnail URL is required'}), 400
        
        # TODO: 이미지 다운로드 및 Gemini Vision API 호출
        # 현재는 URL 기반 분석만 제공
        
        prompt = f"""
YouTube 썸네일 최적화 전문가로서 다음 썸네일을 분석하고 개선 방안을 제시해주세요.

**썸네일 URL:** {thumbnail_url}

**분석 요청:**
1. 현재 썸네일의 강점과 약점
2. 클릭률 향상을 위한 개선 방안
3. 색상, 텍스트, 구도 개선 제안
4. 한국 시청자에게 어필하는 디자인 팁

구체적이고 실용적인 조언을 제공해주세요.
"""
        
        response = gemini_model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            'analysis': analysis,
            'thumbnailUrl': thumbnail_url
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

