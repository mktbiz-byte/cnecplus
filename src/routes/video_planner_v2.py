"""
영상 기획안 자동 생성 (크리에이터 맞춤형)
- 유튜브 채널 분석
- 트렌드 반영
- 대사 10개 + 촬영 장면
"""

from flask import Blueprint, request, jsonify, session
import requests
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

video_planner_v2_bp = Blueprint('video_planner_v2', __name__, url_prefix='/api/video-planner')

# ============================================================
# 인증 데코레이터
# ============================================================

def special_user_required(f):
    """특별 계정 로그인 필수"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'special_user_id' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        return f(*args, **kwargs)
    return decorated_function

# ============================================================
# API 키 관리
# ============================================================

def get_api_keys():
    """API 키 로드"""
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', 'api_keys.json')
    
    keys = {
        'gemini': None,
        'youtube': None
    }
    
    # config 파일에서 로드
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                keys['gemini'] = config.get('gemini_api_key')
                keys['youtube'] = config.get('youtube_api_key')
        except:
            pass
    
    # 환경변수에서 로드 (우선순위)
    keys['gemini'] = os.getenv('GEMINI_API_KEY', keys['gemini'])
    keys['youtube'] = os.getenv('YOUTUBE_API_KEY', keys['youtube'])
    
    return keys

# ============================================================
# YouTube 채널 분석
# ============================================================

def analyze_channel(channel_id, youtube_api_key):
    """채널 스타일 분석"""
    try:
        # 채널 정보
        channel_url = 'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'snippet,statistics,contentDetails',
            'id': channel_id,
            'key': youtube_api_key
        }
        
        channel_response = requests.get(channel_url, params=channel_params, timeout=10)
        channel_data = channel_response.json()
        
        if 'items' not in channel_data or len(channel_data['items']) == 0:
            return None
        
        channel_info = channel_data['items'][0]
        
        # 최근 영상 가져오기
        uploads_playlist_id = channel_info['contentDetails']['relatedPlaylists']['uploads']
        
        videos_url = 'https://www.googleapis.com/youtube/v3/playlistItems'
        videos_params = {
            'part': 'snippet',
            'playlistId': uploads_playlist_id,
            'maxResults': 20,
            'key': youtube_api_key
        }
        
        videos_response = requests.get(videos_url, params=videos_params, timeout=10)
        videos_data = videos_response.json()
        
        video_ids = [item['snippet']['resourceId']['videoId'] for item in videos_data.get('items', [])]
        
        # 영상 상세 정보
        videos = []
        if video_ids:
            details_url = 'https://www.googleapis.com/youtube/v3/videos'
            details_params = {
                'part': 'statistics,snippet',
                'id': ','.join(video_ids),
                'key': youtube_api_key
            }
            
            details_response = requests.get(details_url, params=details_params, timeout=10)
            details_data = details_response.json()
            
            for item in details_data.get('items', []):
                videos.append({
                    'title': item['snippet']['title'],
                    'views': int(item['statistics'].get('viewCount', 0)),
                    'likes': int(item['statistics'].get('likeCount', 0)),
                    'comments': int(item['statistics'].get('commentCount', 0))
                })
        
        return {
            'channel_name': channel_info['snippet']['title'],
            'description': channel_info['snippet']['description'],
            'subscriber_count': int(channel_info['statistics'].get('subscriberCount', 0)),
            'video_count': int(channel_info['statistics'].get('videoCount', 0)),
            'videos': sorted(videos, key=lambda x: x['views'], reverse=True)[:10]
        }
    
    except Exception as e:
        print(f"Channel analysis error: {e}")
        return None

# ============================================================
# 트렌드 분석
# ============================================================

def get_trending_topics(youtube_api_key):
    """현재 트렌딩 주제 분석"""
    try:
        url = 'https://www.googleapis.com/youtube/v3/videos'
        params = {
            'part': 'snippet',
            'chart': 'mostPopular',
            'regionCode': 'KR',
            'maxResults': 10,
            'key': youtube_api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        topics = []
        for item in data.get('items', []):
            topics.append({
                'title': item['snippet']['title'],
                'category': item['snippet'].get('categoryId', '')
            })
        
        return topics
    
    except Exception as e:
        print(f"Trending topics error: {e}")
        return []

# ============================================================
# Gemini API 호출
# ============================================================

def call_gemini(prompt, api_key):
    """Gemini API 호출"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}"
    
    data = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "temperature": 0.8,
            "maxOutputTokens": 8192,
        }
    }
    
    try:
        response = requests.post(url, json=data, timeout=120)
        response.raise_for_status()
        result = response.json()
        
        if 'candidates' in result and len(result['candidates']) > 0:
            return result['candidates'][0]['content']['parts'][0]['text']
        
        return None
    except Exception as e:
        print(f"Gemini API error: {e}")
        return None

# ============================================================
# 영상 기획안 생성
# ============================================================

@video_planner_v2_bp.route('/generate', methods=['POST'])
@special_user_required
def generate_plan():
    """맞춤형 영상 기획안 생성"""
    try:
        data = request.json
        channel_url = data.get('channel_url')  # 유튜브 채널 URL
        user_topic = data.get('topic')  # 사용자가 원하는 주제
        user_keywords = data.get('keywords', '')  # 키워드
        video_length = data.get('length', '10분')  # 영상 길이
        
        if not channel_url or not user_topic:
            return jsonify({'error': '채널 URL과 주제를 입력해주세요'}), 400
        
        # API 키 로드
        keys = get_api_keys()
        if not keys['gemini'] or not keys['youtube']:
            return jsonify({'error': 'API 키가 설정되지 않았습니다'}), 503
        
        # 채널 ID 추출
        channel_id = extract_channel_id(channel_url)
        if not channel_id:
            return jsonify({'error': '유효하지 않은 채널 URL입니다'}), 400
        
        # 1. 채널 분석
        channel_analysis = analyze_channel(channel_id, keys['youtube'])
        if not channel_analysis:
            return jsonify({'error': '채널 정보를 가져올 수 없습니다'}), 500
        
        # 2. 트렌드 분석
        trending = get_trending_topics(keys['youtube'])
        
        # 3. 프롬프트 생성
        prompt = create_planning_prompt(channel_analysis, trending, user_topic, user_keywords, video_length)
        
        # 4. AI 기획안 생성
        plan = call_gemini(prompt, keys['gemini'])
        
        if not plan:
            return jsonify({'error': '기획안 생성에 실패했습니다'}), 500
        
        return jsonify({
            'plan': plan,
            'channel_info': {
                'name': channel_analysis['channel_name'],
                'subscribers': channel_analysis['subscriber_count']
            }
        })
    
    except Exception as e:
        print(f"Generate plan error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ============================================================
# 유틸리티 함수
# ============================================================

def extract_channel_id(url):
    """URL에서 채널 ID 추출"""
    import re
    
    # @핸들 형식
    handle_match = re.search(r'youtube\.com/@([^/\?]+)', url)
    if handle_match:
        # 핸들을 채널 ID로 변환하는 API 호출 필요
        # 여기서는 간단히 핸들 반환
        return f"@{handle_match.group(1)}"
    
    # 채널 ID 형식
    id_match = re.search(r'youtube\.com/channel/([^/\?]+)', url)
    if id_match:
        return id_match.group(1)
    
    # URL이 아닌 경우 그대로 반환
    if url.startswith('UC') or url.startswith('@'):
        return url
    
    return None

def create_planning_prompt(channel_analysis, trending, user_topic, user_keywords, video_length):
    """AI 프롬프트 생성"""
    
    # 인기 영상 정보
    top_videos_text = "\n".join([
        f"{i+1}. {v['title']} (조회수: {v['views']:,})"
        for i, v in enumerate(channel_analysis['videos'][:5])
    ])
    
    # 트렌드 정보
    trending_text = "\n".join([
        f"- {t['title']}"
        for t in trending[:5]
    ])
    
    prompt = f"""당신은 유튜브 콘텐츠 기획 전문가입니다. 다음 정보를 바탕으로 **크리에이터 맞춤형 영상 기획안**을 작성해주세요.

## 📊 크리에이터 정보
- **채널명**: {channel_analysis['channel_name']}
- **구독자**: {channel_analysis['subscriber_count']:,}명
- **채널 설명**: {channel_analysis['description'][:200]}

## 🔥 인기 영상 Top 5
{top_videos_text}

## 📈 현재 트렌드
{trending_text}

## 🎬 사용자 요청
- **주제**: {user_topic}
- **키워드**: {user_keywords}
- **영상 길이**: {video_length}

---

## 📝 작성 요청사항

**이 크리에이터의 스타일과 트렌드를 반영하여**, 다음 형식으로 영상 기획안을 작성해주세요:

### 1. 영상 제목 (3개 제안)
- 제목 1: [클릭을 유도하는 제목]
- 제목 2: [SEO 최적화 제목]
- 제목 3: [트렌드 반영 제목]

### 2. 썸네일 아이디어
- 메인 비주얼: [어떤 이미지를 사용할지]
- 텍스트: [썸네일에 들어갈 텍스트]
- 색상/스타일: [이 채널에 맞는 스타일]

### 3. 영상 대사 (10개 장면)

**장면 1 (인트로 - 0:00~0:30)**
- 대사: [크리에이터가 말할 대사]
- 촬영: [카메라 앵글, 배경, 소품]
- 편집: [자막, 효과음, BGM]

**장면 2 (문제 제기 - 0:30~1:30)**
- 대사: [...]
- 촬영: [...]
- 편집: [...]

**장면 3~8 (메인 콘텐츠)**
[각 장면마다 동일한 형식으로]

**장면 9 (클라이맥스 - 8:30~9:30)**
- 대사: [...]
- 촬영: [...]
- 편집: [...]

**장면 10 (아웃트로 - 9:30~10:00)**
- 대사: [...]
- 촬영: [...]
- 편집: [...]

### 4. SEO 최적화
- **태그 10개**: #태그1 #태그2 ...
- **설명란 초안**: [영상 설명]
- **타임스탬프**: 0:00 인트로 / 0:30 본론 시작 / ...

### 5. 예상 성과
- **타겟 시청자**: [누구를 위한 영상인지]
- **예상 조회수**: [이 채널 기준 예상]
- **성공 포인트**: [왜 이 기획이 효과적인지]

---

**중요**: 이 크리에이터의 기존 인기 영상 스타일을 반영하고, 현재 트렌드를 자연스럽게 통합하세요. 대사는 이 크리에이터가 실제로 말할 법한 톤으로 작성하세요."""

    return prompt

