import os
import json
import requests

from flask import Blueprint, jsonify, request

ai_bp = Blueprint('ai', __name__)

# Gemini API 설정
# API 키 로드 밸런싱을 위한 전역 변수
_gemini_key_index = 0
_gemini_keys_cache = None

def get_gemini_api_keys():
    """
    config 파일 또는 환경변수에서 Gemini API 키 목록 가져오기
    
    Returns:
        list: API 키 리스트
    """
    global _gemini_keys_cache
    if _gemini_keys_cache is not None:
        return _gemini_keys_cache

    api_keys = []
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', 'api_keys.json')

    # 1. config 파일에서 키 로드
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                keys = config.get('gemini_keys')  # Check for plural first
                if not keys:
                    key = config.get('gemini_api_key') # Check for singular
                    if key: keys = [key]
                if isinstance(keys, list):
                    api_keys.extend(keys)
                elif isinstance(keys, str):
                    api_keys.append(keys)
        except Exception as e:
            print(f"Error reading config file: {e}")

    # 2. 환경 변수에서 키 로드 (중복 방지)
    existing_keys = set(api_keys)
    single_key = os.getenv('GEMINI_API_KEY')
    if single_key and single_key not in existing_keys:
        api_keys.append(single_key)
        existing_keys.add(single_key)

    index = 1
    while True:
        key = os.getenv(f'GEMINI_API_KEY_{index}')
        if not key:
            break
        if key not in existing_keys:
            api_keys.append(key)
            existing_keys.add(key)
        index += 1
    
    # 중복 제거
    api_keys = list(set(api_keys))
    
    # 캐시 저장
    _gemini_keys_cache = api_keys if api_keys else None
    
    return _gemini_keys_cache

def get_gemini_api_key():
    """
    Gemini API 키 가져오기 - 로드 밸런싱
    
    여러 키가 있으면 라운드 로빈 방식으로 순환
    
    Returns:
        str: API 키
    """
    global _gemini_key_index
    
    api_keys = get_gemini_api_keys()
    
    if not api_keys:
        return None
    
    # 단일 키면 바로 반환
    if len(api_keys) == 1:
        return api_keys[0]
    
    # 여러 키면 라운드 로빈
    key = api_keys[_gemini_key_index % len(api_keys)]
    _gemini_key_index += 1
    
    return key

# YouTube API 키 로드 밸런싱을 위한 전역 변수
_youtube_key_index = 0
_youtube_keys_cache = None

def get_youtube_api_keys():
    """
    config 파일 또는 환경변수에서 YouTube API 키 목록 가져오기
    
    Returns:
        list: API 키 리스트
    """
    global _youtube_keys_cache
    if _youtube_keys_cache is not None:
        return _youtube_keys_cache

    api_keys = []
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', 'api_keys.json')

    # 1. config 파일에서 키 로드
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                keys = config.get('youtube_keys') # Check for plural first
                if not keys:
                    key = config.get('youtube_api_key') # Check for singular
                    if key: keys = [key]
                if isinstance(keys, list):
                    api_keys.extend(keys)
                elif isinstance(keys, str):
                    api_keys.append(keys)
        except Exception as e:
            print(f"Error reading config file: {e}")

    # 2. 환경 변수에서 키 로드 (중복 방지)
    existing_keys = set(api_keys)
    single_key = os.getenv('YOUTUBE_API_KEY')
    if single_key and single_key not in existing_keys:
        api_keys.append(single_key)
        existing_keys.add(single_key)

    index = 1
    while True:
        key = os.getenv(f'YOUTUBE_API_KEY_{index}')
        if not key:
            break
        if key not in existing_keys:
            api_keys.append(key)
            existing_keys.add(key)
        index += 1
    
    # 중복 제거
    api_keys = list(set(api_keys))
    
    # 캐시 저장
    _youtube_keys_cache = api_keys if api_keys else None
    
    return _youtube_keys_cache

def get_youtube_api_key():
    """
    YouTube API 키 가져오기 - 로드 밸런싱
    
    여러 키가 있으면 라운드 로빈 방식으로 순환
    
    Returns:
        str: API 키
    """
    global _youtube_key_index
    
    api_keys = get_youtube_api_keys()
    
    if not api_keys:
        return None
    
    # 단일 키면 바로 반환
    if len(api_keys) == 1:
        return api_keys[0]
    
    # 여러 키면 라운드 로빈
    key = api_keys[_youtube_key_index % len(api_keys)]
    _youtube_key_index += 1
    
    return key

def call_gemini_api(prompt, api_key, model='gemini-1.5-flash'):
    """
    Gemini REST API 직접 호출
    
    Args:
        prompt: 프롬프트 텍스트
        api_key: Gemini API 키
        model: 사용할 모델 ('gemini-1.5-pro' 또는 'gemini-1.5-flash')
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
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
            "maxOutputTokens": 8192,
        }
    }
    
    try:
        print(f"Calling Gemini API with model: {model}")
        response = requests.post(url, headers=headers, json=data, timeout=120)
        print(f"Response status: {response.status_code}")
        response.raise_for_status()
        result = response.json()
        print(f"Response received: {len(str(result))} chars")
        
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

def get_channel_videos(channel_id, api_key, max_results=20):
    """채널의 최신 영상 가져오기"""
    print(f"[DEBUG] get_channel_videos for {channel_id} with key ...{api_key[-4:]}")
    try:
        # 1. 채널의 업로드 플레이리스트 ID 가져오기
        channel_url = 'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'contentDetails',
            'id': channel_id,
            'key': api_key
        }
        
        channel_response = requests.get(channel_url, params=channel_params, timeout=10)
        channel_data = channel_response.json()
        
        if 'items' not in channel_data or len(channel_data['items']) == 0:
            print(f"[DEBUG] Channel not found or no contentDetails for {channel_id}")
            print("[DEBUG] No video IDs found to fetch details.")
            return []
        
        uploads_playlist_id = channel_data['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        
        # 2. 플레이리스트에서 최신 동영상 가져오기
        videos_url = 'https://www.googleapis.com/youtube/v3/playlistItems'
        videos_params = {
            'part': 'snippet',
            'playlistId': uploads_playlist_id,
            'maxResults': max_results,
            'key': api_key
        }
        
        videos_response = requests.get(videos_url, params=videos_params, timeout=10)
        videos_data = videos_response.json()
        
        # 3. 동영상 ID 수집
        video_ids = []
        if 'items' in videos_data:
            for item in videos_data.get('items', []):
                video_ids.append(item['snippet']['resourceId']['videoId'])
        else:
            print(f"[DEBUG] No items in playlist response: {videos_data}")
        
        # 4. 동영상 상세 정보 가져오기
        print(f"[DEBUG] Found {len(video_ids)} video IDs.")
        if video_ids:
            details_url = 'https://www.googleapis.com/youtube/v3/videos'
            details_params = {
                'part': 'statistics,snippet',
                'id': ','.join(video_ids),
                'key': api_key
            }
            
            details_response = requests.get(details_url, params=details_params, timeout=10)
            details_data = details_response.json()
            
            videos = []
            for video in details_data.get('items', []):
                videos.append({
                    'title': video['snippet']['title'],
                    'views': int(video['statistics'].get('viewCount', '0')),
                    'likes': int(video['statistics'].get('likeCount', '0')),
                    'comments': int(video['statistics'].get('commentCount', '0'))
                })
            
            return videos
        
        print("[DEBUG] No video IDs found to fetch details.")
        return []

    except Exception as e:
        import traceback
        print(f"[ERROR] in get_channel_videos: {e}")
        print(traceback.format_exc())
        return []

@ai_bp.route('/analyze', methods=['POST'])
def analyze_channel():
    """채널 분석 및 AI 기반 성장 전략 제안 (실제 영상 데이터 기반)"""
    
    gemini_api_key = get_gemini_api_key()
    youtube_api_key = get_youtube_api_key()
    
    if not gemini_api_key:
        return jsonify({
            'error': 'Gemini API not available. Please configure GEMINI_API_KEY'
        }), 503
    
    if not youtube_api_key:
        return jsonify({
            'error': 'YouTube API not available. Please configure YOUTUBE_API_KEY'
        }), 503
    
    try:
        # 프론트엔드에서 채널 데이터 받기
        channel_data = request.json
        
        if not channel_data:
            return jsonify({'error': 'No channel data provided'}), 400
        
        # 채널 ID 추출
        channel_id = channel_data.get('id')
        if not channel_id:
            return jsonify({'error': 'Channel ID not provided'}), 400
        
        # 실제 영상 데이터 가져오기
        videos = get_channel_videos(channel_id, youtube_api_key, max_results=30)
        
        # 영상 데이터가 있으면 분석, 없으면 기본 분석
        if videos and len(videos) > 0:
            # 영상 데이터 분석
            videos_sorted = sorted(videos, key=lambda x: x['views'], reverse=True)
            top_5_videos = videos_sorted[:5]
            bottom_5_videos = videos_sorted[-5:]
            
            avg_views = sum(v['views'] for v in videos) / len(videos)
            avg_likes = sum(v['likes'] for v in videos) / len(videos)
            avg_engagement = sum((v['likes'] + v['comments']) / v['views'] * 100 if v['views'] > 0 else 0 for v in videos) / len(videos)
        else:
            # 영상 데이터를 가져오지 못한 경우 기본값 설정
            videos = []
            top_5_videos = []
            bottom_5_videos = []
            avg_views = 0
            avg_likes = 0
            avg_engagement = 0
        
        # Gemini에게 전달할 프롬프트 생성
        if videos and len(videos) > 0:
            # 영상 데이터가 있는 경우
            prompt = f"""당신은 YouTube 크리에이터 성장 전문 컨설턴트입니다. 다음 채널의 **실제 영상 데이터**를 분석하고 한국 시장에 맞는 **구체적이고 실용적인** 성장 전략을 제안해주세요.

**채널 기본 정보:**
- 채널명: {channel_data.get('title', 'N/A')}
- 구독자 수: {channel_data.get('stats', {}).get('subscribers', 'N/A')}
- 총 동영상 수: {channel_data.get('stats', {}).get('videos', 'N/A')}
- 총 조회수: {channel_data.get('stats', {}).get('views', 'N/A')}
- 채널 설명: {channel_data.get('description', 'N/A')}

**최근 30개 영상 분석 결과:**
- 평균 조회수: {int(avg_views):,}
- 평균 좋아요: {int(avg_likes):,}
- 평균 참여율: {avg_engagement:.2f}%

**인기 영상 Top 5:**
{chr(10).join([f"{i+1}. {v['title']} - 조회수: {v['views']:,}, 좋아요: {v['likes']:,}" for i, v in enumerate(top_5_videos)])}

**저조한 영상 Bottom 5:**
{chr(10).join([f"{i+1}. {v['title']} - 조회수: {v['views']:,}, 좋아요: {v['likes']:,}" for i, v in enumerate(bottom_5_videos)])}"""
        else:
            # 영상 데이터가 없는 경우 기본 분석
            prompt = f"""당신은 YouTube 크리에이터 성장 전문 컨설턴트입니다. 다음 채널의 기본 정보를 분석하고 한국 시장에 맞는 **구체적이고 실용적인** 성장 전략을 제안해주세요.

**채널 기본 정보:**
- 채널명: {channel_data.get('title', 'N/A')}
- 구독자 수: {channel_data.get('stats', {}).get('subscribers', 'N/A')}
- 총 동영상 수: {channel_data.get('stats', {}).get('videos', 'N/A')}
- 총 조회수: {channel_data.get('stats', {}).get('views', 'N/A')}
- 채널 설명: {channel_data.get('description', 'N/A')}

**분석 요청:**
1. 채널의 특징과 강점 분석
2. 구독자 수와 조회수를 고려한 성장 전략
3. 콘텐츠 방향성 제안
4. 단기 액션 아이템 (1개월)
5. 중기 목표 (3개월)"""
        
        # 공통 프롬프트 부분
        prompt += f"""

**분석 요청:**
1. **인기 영상 패턴 분석**: Top 5 영상의 제목에서 공통 키워드, 주제, 패턴을 찾아주세요.
2. **저조한 영상 원인 분석**: Bottom 5 영상이 왜 성과가 낮은지 분석해주세요.
3. **구체적인 개선 방안**: 
   - 어떤 주제/키워드를 더 다뤄야 하는지
   - 제목 작성 팁 (실제 인기 영상 제목 패턴 기반)
   - 콘텐츠 방향성
4. **단기 액션 아이템 (1개월)**: 즉시 실행 가능한 3가지
5. **중기 목표 (3개월)**: 채널 성장을 위한 구체적 목표

**출력 형식:**
### 1. 채널 특징 및 강점
(이 채널만의 특징과 강점)

### 2. 인기 영상 성공 요인
(Top 5 영상의 공통 패턴과 성공 요인)

### 3. 개선이 필요한 부분
(Bottom 5 영상의 문제점과 개선 방향)

### 4. 맞춤형 성장 전략
(구체적인 콘텐츠 방향, 제목 작성법, 키워드 전략)

### 5. 실행 계획
**단기 (1개월):**
1. [구체적인 액션]
2. [구체적인 액션]
3. [구체적인 액션]

**중기 (3개월):**
- [구체적인 목표]

한국어로 작성하고, 실제 데이터에 기반한 구체적이고 실용적인 조언을 제공해주세요."""

        # Gemini API 호출 (Gemini 1.5 Pro - 깊이 있는 분석용)
        analysis = call_gemini_api(prompt, gemini_api_key, model='gemini-2.0-flash-exp')
        
        if analysis:
            return jsonify({'analysis': analysis})
        else:
            return jsonify({'error': 'Failed to generate analysis'}), 500
    
    except Exception as e:
        import traceback
        print(f"Error in analyze_channel: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/content-ideas', methods=['POST'])
def generate_content_ideas():
    """콘텐츠 아이디어 생성 (실제 영상 데이터 기반)"""
    
    gemini_api_key = get_gemini_api_key()
    youtube_api_key = get_youtube_api_key()
    
    if not gemini_api_key or not youtube_api_key:
        return jsonify({'error': 'API keys not configured'}), 503
    
    try:
        channel_data = request.json
        
        if not channel_data:
            return jsonify({'error': 'No channel data provided'}), 400
        
        channel_id = channel_data.get('id')
        if not channel_id:
            return jsonify({'error': 'Channel ID not provided'}), 400
        
        # 실제 영상 데이터 가져오기
        videos = get_channel_videos(channel_id, youtube_api_key, max_results=20)
        
        # 영상 데이터가 있으면 사용
        if videos:
            videos_sorted = sorted(videos, key=lambda x: x['views'], reverse=True)
            top_videos = videos_sorted[:10]
        else:
            top_videos = []
        
        # 프롬프트 구성
        if top_videos:
            video_info = f"""
**인기 영상 Top 10:**
{chr(10).join([f"{i+1}. {v['title']} (조회수: {v['views']:,})" for i, v in enumerate(top_videos)])}
"""
        else:
            video_info = """
**참고:** 영상 데이터를 가져올 수 없어 채널 정보만으로 분석합니다.
"""
        
        prompt = f"""당신은 YouTube 콘텐츠 기획 전문가입니다. 다음 채널에 맞는 새로운 콘텐츠 아이디어 10개를 제안해주세요.

**채널 정보:**
- 채널명: {channel_data.get('title', 'N/A')}
- 채널 설명: {channel_data.get('description', 'N/A')}
{video_info}

**요청사항:**
1. 위 인기 영상들의 패턴을 분석하세요
2. 이 채널의 스타일과 시청자 취향에 맞는 새로운 아이디어 10개를 제안하세요
3. 각 아이디어는 기존 인기 영상의 성공 요소를 활용하되, 새로운 각도로 접근하세요

**출력 형식:**
### 콘텐츠 아이디어 10개

**아이디어 1:**
- **제목**: [50자 이내, 클릭을 유도하는 제목]
- **개요**: [어떤 내용인지 2-3줄]
- **인기 영상과의 연결**: [어떤 인기 영상의 성공 요소를 활용하는지]
- **예상 효과**: [왜 이 영상이 잘 될 것인지]
- **제작 난이도**: ⭐⭐⭐ (별 1~5개)

(아이디어 2~10도 동일한 형식)

한국어로 작성하고, 이 채널의 실제 데이터에 기반한 구체적인 아이디어를 제공해주세요."""

        # Gemini 2.0 Flash - 빠른 아이디어 생성
        ideas = call_gemini_api(prompt, gemini_api_key, model='gemini-2.0-flash-exp')
        
        if ideas:
            return jsonify({'ideas': ideas})
        else:
            return jsonify({'error': 'Failed to generate ideas'}), 500
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in generate_content_ideas: {e}")
        print(f"Traceback: {error_details}")
        return jsonify({'error': str(e), 'details': error_details}), 500

@ai_bp.route('/title-optimizer', methods=['POST'])
def optimize_title():
    """제목 최적화"""
    
    api_key = get_gemini_api_key()
    
    if not api_key:
        return jsonify({'error': 'Gemini API not available'}), 503
    
    try:
        data = request.json
        title = data.get('title', '')
        
        if not title:
            return jsonify({'error': 'No title provided'}), 400
        
        prompt = f"""당신은 YouTube 제목 최적화 전문가입니다. 다음 제목을 분석하고 클릭률(CTR)을 높일 수 있는 개선된 제목 5개를 제안해주세요.

**원본 제목:**
{title}

**요청사항:**
1. 원본 제목의 강점과 약점을 분석하세요
2. 클릭률을 높일 수 있는 개선된 제목 5개를 제안하세요
3. 각 제목은 50자 이내로 작성하세요
4. 한국 YouTube 시청자에게 효과적인 제목을 작성하세요

**출력 형식:**
### 원본 제목 분석
- 강점: [분석]
- 약점: [분석]

### 개선된 제목 5개
1. [제목] - [왜 이 제목이 더 좋은지 설명]
2. [제목] - [설명]
3. [제목] - [설명]
4. [제목] - [설명]
5. [제목] - [설명]

한국어로 작성해주세요."""

        # Gemini 1.5 Flash - 빠른 제목 최적화
        result = call_gemini_api(prompt, api_key, model='gemini-1.5-flash')
        
        if result:
            return jsonify({'result': result})
        else:
            return jsonify({'error': 'Failed to optimize title'}), 500
    
    except Exception as e:
        print(f"Error in optimize_title: {e}")
        return jsonify({'error': str(e)}), 500



@ai_bp.route('/channel-score', methods=['POST'])
def get_channel_score():
    """채널 AI 평가 점수 시스템 (0-10점 척도)"""
    
    gemini_api_key = get_gemini_api_key()
    youtube_api_key = get_youtube_api_key()
    
    if not gemini_api_key or not youtube_api_key:
        return jsonify({'error': 'API keys not configured'}), 503
    
    try:
        channel_data = request.json
        
        if not channel_data:
            return jsonify({'error': 'No channel data provided'}), 400
        
        channel_id = channel_data.get('id')
        if not channel_id:
            return jsonify({'error': 'Channel ID not provided'}), 400
        
        # 실제 영상 데이터 가져오기
        videos = get_channel_videos(channel_id, youtube_api_key, max_results=50)
        
        if not videos:
            return jsonify({'error': 'Failed to fetch channel videos'}), 500
        
        # 기본 통계 계산
        total_videos = len(videos)
        avg_views = sum(v['views'] for v in videos) / total_videos if total_videos > 0 else 0
        avg_likes = sum(v['likes'] for v in videos) / total_videos if total_videos > 0 else 0
        avg_comments = sum(v['comments'] for v in videos) / total_videos if total_videos > 0 else 0
        avg_engagement = sum((v['likes'] + v['comments']) / v['views'] * 100 if v['views'] > 0 else 0 for v in videos) / total_videos if total_videos > 0 else 0
        
        # 조회수 일관성 계산 (표준편차 기반)
        import statistics
        views_list = [v['views'] for v in videos]
        views_std = statistics.stdev(views_list) if len(views_list) > 1 else 0
        views_cv = (views_std / avg_views * 100) if avg_views > 0 else 0  # 변동계수
        
        # 인기 영상 비율
        top_videos = sorted(videos, key=lambda x: x['views'], reverse=True)[:10]
        top_avg_views = sum(v['views'] for v in top_videos) / len(top_videos) if top_videos else 0
        
        # Gemini에게 점수 평가 요청
        prompt = f"""당신은 YouTube 채널 평가 전문가입니다. 다음 채널 데이터를 분석하여 5가지 항목에 대해 **0~10점** 척도로 정확한 점수를 매겨주세요.

**채널 기본 정보:**
- 채널명: {channel_data.get('title', 'N/A')}
- 구독자 수: {channel_data.get('stats', {}).get('subscribers', 'N/A')}
- 총 동영상 수: {channel_data.get('stats', {}).get('videos', 'N/A')}
- 총 조회수: {channel_data.get('stats', {}).get('views', 'N/A')}

**최근 50개 영상 분석 결과:**
- 분석한 영상 수: {total_videos}개
- 평균 조회수: {int(avg_views):,}
- 평균 좋아요: {int(avg_likes):,}
- 평균 댓글: {int(avg_comments):,}
- 평균 참여율: {avg_engagement:.2f}%
- 조회수 변동계수: {views_cv:.1f}% (낮을수록 일관성 높음)
- Top 10 평균 조회수: {int(top_avg_views):,}

**평가 기준:**

1. **콘텐츠 품질 점수 (0-10점)**
   - 평가 요소: 평균 조회수, 평균 참여율, 구독자 대비 조회수 비율
   - 10점: 매우 우수한 품질 (참여율 5% 이상, 구독자 대비 높은 조회수)
   - 7-9점: 우수한 품질
   - 4-6점: 보통 품질
   - 0-3점: 개선 필요

2. **시청자 참여도 점수 (0-10점)**
   - 평가 요소: 좋아요율, 댓글 수, 전체 참여율
   - 10점: 매우 높은 참여도 (참여율 5% 이상)
   - 7-9점: 높은 참여도 (참여율 3-5%)
   - 4-6점: 보통 참여도 (참여율 1-3%)
   - 0-3점: 낮은 참여도 (참여율 1% 미만)

3. **업로드 일관성 점수 (0-10점)**
   - 평가 요소: 조회수 변동계수, 영상 간 성과 일관성
   - 10점: 매우 일관적 (변동계수 30% 미만)
   - 7-9점: 일관적 (변동계수 30-60%)
   - 4-6점: 보통 (변동계수 60-100%)
   - 0-3점: 불일치함 (변동계수 100% 이상)

4. **성장 잠재력 점수 (0-10점)**
   - 평가 요소: 최근 영상 트렌드, Top 10 영상 성과, 구독자 증가 가능성
   - 10점: 매우 높은 성장 잠재력
   - 7-9점: 높은 성장 잠재력
   - 4-6점: 보통 성장 잠재력
   - 0-3점: 낮은 성장 잠재력

5. **제목 최적화 점수 (0-10점)**
   - 평가 요소: 최근 10개 영상 제목의 품질, 키워드 사용, 클릭 유도성
   - 10점: 매우 우수한 제목 (키워드, 호기심, 명확성 모두 우수)
   - 7-9점: 우수한 제목
   - 4-6점: 보통 제목
   - 0-3점: 개선 필요한 제목

**최근 10개 영상 제목:**
{chr(10).join([f"{i+1}. {v['title']}" for i, v in enumerate(videos[:10])])}

**출력 형식 (반드시 이 형식을 정확히 따라주세요):**
```json
{{
  "content_quality": {{
    "score": [0-10 사이의 정수],
    "reason": "[점수 이유를 1-2문장으로]"
  }},
  "viewer_engagement": {{
    "score": [0-10 사이의 정수],
    "reason": "[점수 이유를 1-2문장으로]"
  }},
  "upload_consistency": {{
    "score": [0-10 사이의 정수],
    "reason": "[점수 이유를 1-2문장으로]"
  }},
  "growth_potential": {{
    "score": [0-10 사이의 정수],
    "reason": "[점수 이유를 1-2문장으로]"
  }},
  "title_optimization": {{
    "score": [0-10 사이의 정수],
    "reason": "[점수 이유를 1-2문장으로]"
  }},
  "overall_summary": "[전체 평가 요약을 2-3문장으로]"
}}
```

**중요:** 반드시 위의 JSON 형식으로만 응답하고, 다른 텍스트는 포함하지 마세요."""

        # Gemini 1.5 Flash - 빠른 해시태그/주제 추천
        result = call_gemini_api(prompt, gemini_api_key, model='gemini-1.5-flash')
        
        if result:
            # JSON 추출 (```json ... ``` 형식 처리)
            import re
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', result, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # JSON 블록이 없으면 전체를 JSON으로 파싱 시도
                json_str = result.strip()
            
            try:
                scores = json.loads(json_str)
                return jsonify(scores)
            except json.JSONDecodeError:
                # JSON 파싱 실패 시 기본 점수 반환
                return jsonify({
                    'content_quality': {'score': 5, 'reason': 'AI 분석 중 오류 발생'},
                    'viewer_engagement': {'score': 5, 'reason': 'AI 분석 중 오류 발생'},
                    'upload_consistency': {'score': 5, 'reason': 'AI 분석 중 오류 발생'},
                    'growth_potential': {'score': 5, 'reason': 'AI 분석 중 오류 발생'},
                    'title_optimization': {'score': 5, 'reason': 'AI 분석 중 오류 발생'},
                    'overall_summary': 'AI 분석 중 오류가 발생했습니다. 나중에 다시 시도해주세요.',
                    'raw_response': result
                })
        else:
            return jsonify({'error': 'Failed to generate scores'}), 500
    
    except Exception as e:
        print(f"Error in get_channel_score: {e}")
        return jsonify({'error': str(e)}), 500

