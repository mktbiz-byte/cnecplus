import os
import json
import requests

from flask import Blueprint, jsonify, request

ai_bp = Blueprint('ai', __name__)

# Gemini API 설정
def get_gemini_api_key():
    """Gemini API 키 가져오기"""
    # 1. 환경변수에서 확인
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key:
        return api_key
    
    # 2. config 파일에서 확인
    try:
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'api_keys.json')
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
                return config.get('gemini_api_key')
    except Exception as e:
        print(f"Error loading config: {e}")
    
    return None

def call_gemini_api(prompt, api_key):
    """Gemini REST API 직접 호출"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}"
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    data = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048,
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        # 응답에서 텍스트 추출
        if 'candidates' in result and len(result['candidates']) > 0:
            candidate = result['candidates'][0]
            if 'content' in candidate and 'parts' in candidate['content']:
                parts = candidate['content']['parts']
                if len(parts) > 0 and 'text' in parts[0]:
                    return parts[0]['text']
        
        return None
    except requests.exceptions.RequestException as e:
        print(f"Gemini API error: {e}")
        return None

@ai_bp.route('/analyze', methods=['POST'])
def analyze_channel():
    """채널 분석 및 AI 기반 성장 전략 제안 (Gemini 2.0 Flash)"""
    
    api_key = get_gemini_api_key()
    
    # 디버깅 정보
    debug_info = {
        'gemini_api_key_set': bool(api_key),
        'config_file_exists': os.path.exists(os.path.join(os.path.dirname(__file__), '..', 'config', 'api_keys.json')),
        'using_rest_api': True
    }
    
    if not api_key:
        return jsonify({
            'error': 'Gemini API not available. Please configure GEMINI_API_KEY',
            'debug': debug_info
        }), 503
    
    try:
        # 프론트엔드에서 채널 데이터 받기
        channel_data = request.json
        
        if not channel_data:
            return jsonify({'error': 'No channel data provided'}), 400
        
        # Gemini에게 전달할 프롬프트 생성
        prompt = f"""
당신은 YouTube 크리에이터 성장 전문 컨설턴트입니다. 다음 채널 정보를 분석하고 한국 시장에 맞는 구체적인 성장 전략을 제안해주세요.

**채널 정보:**
- 채널명: {channel_data.get('title', 'N/A')}
- 구독자 수: {channel_data.get('subscriberCount', 'N/A')}
- 동영상 수: {channel_data.get('videoCount', 'N/A')}
- 총 조회수: {channel_data.get('viewCount', 'N/A')}
- 채널 설명: {channel_data.get('description', 'N/A')[:500]}

**분석 요청사항:**

1. **채널 현황 분석**
   - 현재 채널의 강점과 약점
   - 구독자 대비 조회수 비율 분석
   - 콘텐츠 업로드 빈도 평가

2. **성장 전략 (SMART 목표)**
   - 단기 목표 (1-3개월): 구체적인 수치와 실행 방법
   - 중기 목표 (3-6개월): 채널 확장 전략
   - 장기 목표 (6-12개월): 브랜드 구축 방향

3. **콘텐츠 전략**
   - 추천 콘텐츠 유형 3가지
   - 업로드 최적 시간대
   - 썸네일 및 제목 전략

4. **한국 시장 맞춤 조언**
   - 한국 시청자 선호도 반영
   - 트렌드 활용 방법
   - 커뮤니티 관리 전략

5. **실행 가능한 액션 아이템 (Top 5)**
   - 즉시 실행 가능한 구체적인 행동 목록

**응답 형식:** 마크다운 형식으로 구조화하여 작성해주세요. 이모지를 적절히 사용하여 가독성을 높여주세요.
"""
        
        # Gemini API 호출
        analysis = call_gemini_api(prompt, api_key)
        
        if not analysis:
            return jsonify({'error': 'Failed to generate analysis'}), 500
        
        return jsonify({
            'analysis': analysis,
            'channel_name': channel_data.get('title', 'Unknown')
        })
        
    except Exception as e:
        print(f"Error in analyze_channel: {e}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@ai_bp.route('/content-ideas', methods=['POST'])
def content_ideas():
    """콘텐츠 아이디어 생성"""
    
    api_key = get_gemini_api_key()
    
    if not api_key:
        return jsonify({'error': 'Gemini API not available'}), 503
    
    try:
        channel_data = request.json
        
        if not channel_data:
            return jsonify({'error': 'No channel data provided'}), 400
        
        prompt = f"""
당신은 YouTube 콘텐츠 기획 전문가입니다. 다음 채널을 위한 창의적이고 실행 가능한 콘텐츠 아이디어 10개를 제안해주세요.

**채널 정보:**
- 채널명: {channel_data.get('title', 'N/A')}
- 구독자 수: {channel_data.get('subscriberCount', 'N/A')}
- 채널 설명: {channel_data.get('description', 'N/A')[:500]}

**요구사항:**
1. 각 아이디어는 구체적이고 실행 가능해야 합니다
2. 한국 시청자를 타겟으로 합니다
3. 현재 트렌드를 반영합니다
4. 채널의 정체성과 일치해야 합니다

**응답 형식:**
각 아이디어를 다음 형식으로 작성해주세요:

### 아이디어 1: [제목]
**설명:** [1-2문장으로 아이디어 설명]
**예상 효과:** [조회수, 참여도 등]
**제작 난이도:** ⭐⭐⭐ (1-5)

(총 10개의 아이디어)
"""
        
        ideas = call_gemini_api(prompt, api_key)
        
        if not ideas:
            return jsonify({'error': 'Failed to generate content ideas'}), 500
        
        return jsonify({
            'ideas': ideas,
            'channel_name': channel_data.get('title', 'Unknown')
        })
        
    except Exception as e:
        print(f"Error in content_ideas: {e}")
        return jsonify({'error': f'Failed to generate ideas: {str(e)}'}), 500

@ai_bp.route('/title-optimizer', methods=['POST'])
def title_optimizer():
    """제목 최적화"""
    
    api_key = get_gemini_api_key()
    
    if not api_key:
        return jsonify({'error': 'Gemini API not available'}), 503
    
    try:
        data = request.json
        original_title = data.get('title', '')
        
        if not original_title:
            return jsonify({'error': 'No title provided'}), 400
        
        prompt = f"""
당신은 YouTube SEO 및 제목 최적화 전문가입니다. 다음 제목을 분석하고 클릭률(CTR)을 높일 수 있는 개선된 제목 5개를 제안해주세요.

**원본 제목:** {original_title}

**최적화 기준:**
1. 50자 이내로 작성
2. 한국어 키워드 최적화
3. 감정적 트리거 활용
4. 호기심 유발
5. 검색 최적화 (SEO)

**응답 형식:**

### 제안 1: [최적화된 제목]
**개선 포인트:** [어떤 부분을 개선했는지]
**예상 효과:** [CTR 향상 예상]

(총 5개의 제안)

### 추가 조언
[제목 작성 시 주의사항 및 팁]
"""
        
        optimized = call_gemini_api(prompt, api_key)
        
        if not optimized:
            return jsonify({'error': 'Failed to optimize title'}), 500
        
        return jsonify({
            'optimized': optimized,
            'original_title': original_title
        })
        
    except Exception as e:
        print(f"Error in title_optimizer: {e}")
        return jsonify({'error': f'Failed to optimize title: {str(e)}'}), 500

@ai_bp.route('/competitor-analysis', methods=['POST'])
def competitor_analysis():
    """경쟁 채널 분석"""
    
    api_key = get_gemini_api_key()
    
    if not api_key:
        return jsonify({'error': 'Gemini API not available'}), 503
    
    try:
        data = request.json
        my_channel = data.get('my_channel', {})
        competitor_channels = data.get('competitors', [])
        
        prompt = f"""
당신은 YouTube 시장 분석 전문가입니다. 다음 채널들을 비교 분석하고 경쟁 전략을 제안해주세요.

**내 채널:**
- 채널명: {my_channel.get('title', 'N/A')}
- 구독자: {my_channel.get('subscriberCount', 'N/A')}

**경쟁 채널 정보:**
{json.dumps(competitor_channels, ensure_ascii=False, indent=2)}

**분석 요청:**
1. 경쟁 채널의 성공 요인
2. 내 채널과의 차별화 포인트
3. 벤치마킹 전략
4. 시장 포지셔닝 제안

**응답 형식:** 마크다운으로 구조화하여 작성
"""
        
        analysis = call_gemini_api(prompt, api_key)
        
        if not analysis:
            return jsonify({'error': 'Failed to analyze competitors'}), 500
        
        return jsonify({
            'analysis': analysis
        })
        
    except Exception as e:
        print(f"Error in competitor_analysis: {e}")
        return jsonify({'error': f'Failed to analyze: {str(e)}'}), 500

@ai_bp.route('/thumbnail-analysis', methods=['POST'])
def thumbnail_analysis():
    """썸네일 분석 및 개선 제안"""
    
    api_key = get_gemini_api_key()
    
    if not api_key:
        return jsonify({'error': 'Gemini API not available'}), 503
    
    try:
        data = request.json
        thumbnail_url = data.get('thumbnail_url', '')
        video_title = data.get('video_title', '')
        
        prompt = f"""
당신은 YouTube 썸네일 디자인 전문가입니다. 다음 정보를 바탕으로 썸네일 개선 방안을 제안해주세요.

**동영상 제목:** {video_title}
**썸네일 URL:** {thumbnail_url}

**분석 요청:**
1. 현재 썸네일의 강점과 약점
2. 클릭률 향상을 위한 개선 방안
3. 한국 시청자에게 어필할 수 있는 디자인 요소
4. 색상, 텍스트, 이미지 구성 제안

**응답 형식:** 마크다운으로 구조화하여 작성
"""
        
        analysis = call_gemini_api(prompt, api_key)
        
        if not analysis:
            return jsonify({'error': 'Failed to analyze thumbnail'}), 500
        
        return jsonify({
            'analysis': analysis
        })
        
    except Exception as e:
        print(f"Error in thumbnail_analysis: {e}")
        return jsonify({'error': f'Failed to analyze thumbnail: {str(e)}'}), 500

