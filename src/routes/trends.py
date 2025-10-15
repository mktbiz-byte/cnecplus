from flask import Blueprint, jsonify, request
import requests
import json
import os
from datetime import datetime, timedelta

trends_bp = Blueprint('trends', __name__)

def get_youtube_api_key():
    """YouTube API 키 가져오기"""
    api_key = None
    
    config_file = os.path.join(os.path.dirname(__file__), '..', 'config', 'api_keys.json')
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                keys = json.load(f)
                api_key = keys.get('youtube_api_key')
        except:
            pass
    
    if not api_key:
        api_key = os.getenv('YOUTUBE_API_KEY')
    
    return api_key
def get_gemini_api_key():
    """Gemini API 키 가져오기"""
    api_key = None
    
    config_file = os.path.join(os.path.dirname(__file__), '..', 'config', 'api_keys.json')
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                keys = json.load(f)
                api_key = keys.get('gemini_api_key')
        except:
            pass
    
    if not api_key:
        api_key = os.getenv('GEMINI_API_KEY')
    
    return api_key

def resolve_channel_id(input_str, api_key):
    """핸들(@) 또는 채널명을 채널 ID로 변환"""
    if input_str.startswith('UC') and len(input_str) == 24:
        return input_str
    
    if input_str.startswith('@'):
        input_str = input_str[1:]
    
    url = 'https://www.googleapis.com/youtube/v3/search'
    params = {
        'part': 'snippet',
        'q': input_str,
        'type': 'channel',
        'maxResults': 1,
        'key': api_key
    }
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        if data.get('items'):
            return data['items'][0]['snippet']['channelId']
    
    return None
@trends_bp.route('/youtube-trending', methods=['GET'])
def get_youtube_trending():
    """YouTube 트렌딩 영상 가져오기 (한국)"""
    api_key = get_youtube_api_key()
    
    if not api_key:
        return jsonify({'error': 'YouTube API key not configured'}), 503
    
    try:
        url = 'https://www.googleapis.com/youtube/v3/videos'
        params = {
            'part': 'snippet,statistics',
            'chart': 'mostPopular',
            'regionCode': 'KR',
            'maxResults': 50,
            'key': api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        videos = []
        for video in data.get('items', []):
            videos.append({
                'id': video['id'],
                'title': video['snippet']['title'],
                'channelTitle': video['snippet']['channelTitle'],
                'categoryId': video['snippet']['categoryId'],
                'views': int(video['statistics'].get('viewCount', '0')),
                'likes': int(video['statistics'].get('likeCount', '0')),
                'comments': int(video['statistics'].get('commentCount', '0')),
                'publishedAt': video['snippet']['publishedAt']
            })
        
        return jsonify({'trending_videos': videos})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trends_bp.route('/analyze-for-creator/<channel_id>', methods=['GET'])
def analyze_trends_for_creator(channel_id):
    """크리에이터 맞춤형 트렌드 분석 및 추천"""
    youtube_api_key = get_youtube_api_key()
    gemini_api_key = get_gemini_api_key()
    
    if not youtube_api_key or not gemini_api_key:
        return jsonify({'error': 'API keys not configured'}), 503
    
    # 핸들(@) 또는 채널명을 채널 ID로 변환
    resolved_id = resolve_channel_id(channel_id, youtube_api_key)
    if not resolved_id:
        return jsonify({'error': 'Channel not found'}), 404
    
    channel_id = resolved_id
    
    try:
        # 1. 크리에이터 채널 정보 가져오기
        channel_url = 'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'snippet,statistics,contentDetails',
            'id': channel_id,
            'key': youtube_api_key
        }
        
        channel_response = requests.get(channel_url, params=channel_params, timeout=10)
        channel_data = channel_response.json()
        
        if 'items' not in channel_data or len(channel_data['items']) == 0:
            return jsonify({'error': 'Channel not found'}), 404
        
        channel = channel_data['items'][0]
        channel_title = channel['snippet']['title']
        channel_description = channel['snippet']['description']
        
        # 2. 크리에이터의 최근 영상 10개 가져오기
        uploads_playlist_id = channel['contentDetails']['relatedPlaylists']['uploads']
        
        videos_url = 'https://www.googleapis.com/youtube/v3/playlistItems'
        videos_params = {
            'part': 'snippet',
            'playlistId': uploads_playlist_id,
            'maxResults': 10,
            'key': youtube_api_key
        }
        
        videos_response = requests.get(videos_url, params=videos_params, timeout=10)
        videos_data = videos_response.json()
        
        creator_video_titles = [item['snippet']['title'] for item in videos_data.get('items', [])]
        
        # 3. YouTube 트렌딩 영상 가져오기 (한국)
        trending_url = 'https://www.googleapis.com/youtube/v3/videos'
        trending_params = {
            'part': 'snippet,statistics',
            'chart': 'mostPopular',
            'regionCode': 'KR',
            'maxResults': 20,
            'key': youtube_api_key
        }
        
        trending_response = requests.get(trending_url, params=trending_params, timeout=10)
        trending_data = trending_response.json()
        
        trending_videos = []
        for video in trending_data.get('items', []):
            trending_videos.append({
                'title': video['snippet']['title'],
                'channelTitle': video['snippet']['channelTitle'],
                'views': int(video['statistics'].get('viewCount', '0')),
                'categoryId': video['snippet']['categoryId']
            })
        
        # 4. Gemini AI로 맞춤형 추천 생성
        prompt = f"""당신은 YouTube 크리에이터를 위한 전문 컨설턴트입니다.

**크리에이터 정보:**
- 채널명: {channel_title}
- 채널 설명: {channel_description}
- 최근 영상 제목들:
{chr(10).join([f"  - {title}" for title in creator_video_titles[:10]])}

**현재 한국 YouTube 트렌딩 영상 Top 20:**
{chr(10).join([f"  - {v['title']} (조회수: {v['views']:,})" for v in trending_videos[:20]])}

**분석 요청:**
1. 이 크리에이터의 콘텐츠 스타일과 주제를 분석하세요.
2. 현재 트렌딩 영상 중에서 이 크리에이터가 따라할 수 있는 트렌드를 찾아주세요.
3. 크리에이터의 스타일에 맞게 트렌드를 재해석한 구체적인 영상 아이디어 5개를 제시하세요.

**출력 형식:**
### 1. 채널 스타일 분석
(크리에이터의 콘텐츠 특징, 타겟 시청자, 강점)

### 2. 현재 트렌드 중 활용 가능한 주제
(트렌딩 영상에서 발견한 패턴과 이 크리에이터가 활용할 수 있는 트렌드)

### 3. 맞춤형 영상 아이디어 5개
각 아이디어마다:
- **제목**: (50자 이내, 클릭을 유도하는 제목)
- **개요**: (어떤 내용인지 간단히)
- **트렌드 연결**: (어떤 트렌드를 활용하는지)
- **예상 효과**: (왜 이 영상이 잘 될 것인지)
- **제작 난이도**: ⭐⭐⭐ (별 1~5개)

한국어로 작성하고, 실용적이고 구체적으로 답변해주세요."""

        # Gemini API 호출
        gemini_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={gemini_api_key}'
        gemini_payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4096
            }
        }
        
        gemini_response = requests.post(gemini_url, json=gemini_payload, timeout=60)
        gemini_data = gemini_response.json()
        
        if 'candidates' in gemini_data and len(gemini_data['candidates']) > 0:
            analysis = gemini_data['candidates'][0]['content']['parts'][0]['text']
            
            result = {
                'channel_info': {
                    'title': channel_title,
                    'description': channel_description
                },
                'trending_videos_count': len(trending_videos),
                'ai_analysis': analysis
            }
            
            return jsonify(result)
        else:
            return jsonify({'error': 'Failed to generate AI analysis'}), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trends_bp.route('/google-trends', methods=['GET'])
def get_google_trends():
    """Google Trends 데이터 가져오기 (pytrends 사용)"""
    try:
        # pytrends 라이브러리 사용
        from pytrends.request import TrendReq
        
        pytrends = TrendReq(hl='ko-KR', tz=540)
        
        # 실시간 인기 검색어
        trending_searches = pytrends.trending_searches(pn='south_korea')
        
        trends = trending_searches[0].tolist()[:20]
        
        return jsonify({'google_trends': trends})
    
    except ImportError:
        return jsonify({'error': 'pytrends library not installed. Install with: pip install pytrends'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

