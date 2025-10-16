"""
숏폼 영상 기획안 생성 API
YouTube Shorts, Instagram Reels, TikTok 등 숏폼 콘텐츠 전용
"""

from flask import Blueprint, request, jsonify, session
import os
import sys
from src.utils.api_key_manager import get_gemini_api_key, make_youtube_api_request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

shorts_planner_bp = Blueprint('shorts_planner', __name__, url_prefix='/api/shorts-planner')


# ============================================================
# Gemini API 호출
# ============================================================

def call_gemini(prompt, max_retries=3):
    """
    Gemini API 호출 (로테이션 적용)
    
    Args:
        prompt: 프롬프트
        max_retries: 최대 재시도 횟수
    
    Returns:
        생성된 텍스트 또는 None
    """
    import requests
    
    for attempt in range(max_retries):
        # API 키 가져오기 (로테이션 적용)
        api_key = get_gemini_api_key()
        if not api_key:
            print(f"[SHORTS_PLANNER] No Gemini API key available")
            return None
        
        url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}'
        
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
                "temperature": 0.9,  # 쇼폼은 창의성이 더 중요
                "maxOutputTokens": 4096,
            }
        }
        
        try:
            print(f"[SHORTS_PLANNER] Calling Gemini API (attempt {attempt+1}/{max_retries})...")
            response = requests.post(url, headers=headers, json=data, timeout=60)
            print(f"[SHORTS_PLANNER] Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                if 'candidates' in result and len(result['candidates']) > 0:
                    candidate = result['candidates'][0]
                    if 'content' in candidate and 'parts' in candidate['content']:
                        parts = candidate['content']['parts']
                        if len(parts) > 0 and 'text' in parts[0]:
                            print(f"[SHORTS_PLANNER] Successfully generated plan")
                            return parts[0]['text']
                
                print(f"[SHORTS_PLANNER] No valid response from Gemini")
                continue
            elif response.status_code == 429:
                print(f"[SHORTS_PLANNER] Quota exceeded, trying next key...")
                continue
            else:
                print(f"[SHORTS_PLANNER] API error: {response.text}")
                continue
            
        except Exception as e:
            print(f"[SHORTS_PLANNER] Gemini API error: {e}")
            import traceback
            traceback.print_exc()
            if attempt < max_retries - 1:
                continue
    
    print(f"[SHORTS_PLANNER] All {max_retries} attempts failed")
    return None


# ============================================================
# 채널 분석
# ============================================================

def analyze_channel_for_shorts(channel_id):
    """숏폼에 적합한 채널 분석"""
    try:
        # 채널 정보
        channel_url = 'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'snippet,statistics,contentDetails',
            'id': channel_id
        }
        channel_data, error = make_youtube_api_request(channel_url, channel_params)
        if error or not channel_data or 'items' not in channel_data or len(channel_data['items']) == 0:
            return None, error
        
        channel_info = channel_data['items'][0]
        
        # 최근 Shorts 영상 가져오기 (60초 이하)
        uploads_playlist_id = channel_info['contentDetails']['relatedPlaylists']['uploads']
        
        videos_url = 'https://www.googleapis.com/youtube/v3/playlistItems'
        videos_params = {
            'part': 'snippet',
            'playlistId': uploads_playlist_id,
            'maxResults': 50  # 더 많이 가져와서 Shorts 필터링
        }
        videos_data, error = make_youtube_api_request(videos_url, videos_params)
        if error:
            print(f"Playlist items error: {error}")
            # 채널 정보만이라도 반환
            return {
                'channel_name': channel_info['snippet']['title'],
                'description': channel_info['snippet']['description'],
                'subscriber_count': int(channel_info['statistics'].get('subscriberCount', 0)),
                'video_count': int(channel_info['statistics'].get('videoCount', 0)),
                'shorts': []
            }, None

        video_ids = [item['snippet']['resourceId']['videoId'] for item in videos_data.get('items', [])]
        
        # 영상 상세 정보
        shorts = []
        if video_ids:
            details_url = 'https://www.googleapis.com/youtube/v3/videos'
            details_params = {
                'part': 'statistics,snippet,contentDetails',
                'id': ','.join(video_ids)
            }
            details_data, error = make_youtube_api_request(details_url, details_params)
            if error:
                print(f"Video details error: {error}")
            else:
                for item in details_data.get('items', []):
                    # 60초 이하인 영상만 (Shorts)
                    duration = item['contentDetails']['duration']
                    # PT1M = 1분, PT30S = 30초
                    import re
                    match = re.match(r'PT(?:(\d+)M)?(?:(\d+)S)?', duration)
                    if match:
                        minutes = int(match.group(1) or 0)
                        seconds = int(match.group(2) or 0)
                        total_seconds = minutes * 60 + seconds
                        
                        if total_seconds <= 60:  # 60초 이하만
                            shorts.append({
                                'title': item['snippet']['title'],
                                'views': int(item['statistics'].get('viewCount', 0)),
                                'likes': int(item['statistics'].get('likeCount', 0)),
                                'comments': int(item['statistics'].get('commentCount', 0)),
                                'duration': total_seconds
                            })
        
        return {
            'channel_name': channel_info['snippet']['title'],
            'description': channel_info['snippet']['description'],
            'subscriber_count': int(channel_info['statistics'].get('subscriberCount', 0)),
            'video_count': int(channel_info['statistics'].get('videoCount', 0)),
            'shorts': shorts[:10]  # 최근 10개 Shorts만
        }, None
        
    except Exception as e:
        print(f"Channel analysis error: {e}")
        import traceback
        traceback.print_exc()
        return None, str(e)


def get_trending_shorts():
    """현재 트렌딩 Shorts 분석"""
    try:
        url = 'https://www.googleapis.com/youtube/v3/videos'
        params = {
            'part': 'snippet',
            'chart': 'mostPopular',
            'regionCode': 'KR',
            'videoCategoryId': '0',  # All categories
            'maxResults': 50
        }
        data, error = make_youtube_api_request(url, params)
        if error:
            print(f"Trending topics error: {error}")
            return []
        
        topics = []
        for item in data.get('items', [])[:20]:  # 상위 20개만
            topics.append(item['snippet']['title'])
        
        return topics
    except Exception as e:
        print(f"Trending error: {e}")
        return []


# ============================================================
# 채널 ID 추출
# ============================================================

def convert_handle_to_channel_id(handle):
    """핸들명(@username)을 채널 ID로 변환 (API 키 로테이션 적용)"""
    try:
        handle = handle.lstrip('@')
        
        url = 'https://www.googleapis.com/youtube/v3/search'
        params = {
            'part': 'snippet',
            'q': handle,
            'type': 'channel',
            'maxResults': 5
        }
        
        data, error = make_youtube_api_request(url, params)
        if error:
            return None, error

        if data and 'items' in data and len(data['items']) > 0:
            for item in data['items']:
                channel_title = item['snippet']['title'].lower()
                if handle.lower() in channel_title or channel_title in handle.lower():
                    return item['snippet']['channelId'], None
            return data['items'][0]['snippet']['channelId'], None
        
        return None, "Channel not found by handle."
    except Exception as e:
        return None, str(e)


def extract_channel_id(url):
    """URL에서 채널 ID 추출 (API 키 로테이션 적용)"""
    import re
    
    # @핸들 URL 형식
    handle_match = re.search(r'youtube\.com/@([^/\?]+)', url)
    if handle_match:
        handle = handle_match.group(1)
        return convert_handle_to_channel_id(handle)
    
    # 채널 ID URL 형식
    id_match = re.search(r'youtube\.com/channel/([^/\?]+)', url)
    if id_match:
        return id_match.group(1), None
    
    # URL이 아닌 직접 입력 형식
    if url.startswith('UC') and len(url) == 24:
        return url, None
    elif url.startswith('@'):
        return convert_handle_to_channel_id(url)
    
    return None, "Invalid channel URL or handle format."


# ============================================================
# 숏폼 기획안 생성 API
# ============================================================

@shorts_planner_bp.route('/generate', methods=['POST'])
def generate_shorts_plan():
    """숏폼 영상 기획안 생성"""
    
    # 로그인 확인
    if 'special_user_id' not in session:
        return jsonify({'error': '로그인이 필요합니다'}), 401
    
    try:
        data = request.json
        channel_url = data.get('channel_url')
        topic = data.get('topic')
        keywords = data.get('keywords', '')
        length = data.get('length', '30초')  # 기본 30초
        
        if not channel_url or not topic:
            return jsonify({'error': '채널 URL과 주제를 입력해주세요'}), 400
        
        # API 키 로드
        gemini_key = get_gemini_api_key()
        if not gemini_key:
            return jsonify({'error': 'Gemini API 키가 설정되지 않았습니다'}), 503
        
        # 채널 ID 추출
        channel_id, error = extract_channel_id(channel_url)
        if error:
            return jsonify({'error': '채널 ID를 확인하는 중 오류가 발생했습니다.', 'details': error}), 500
        if not channel_id:
            return jsonify({'error': '유효하지 않은 채널 URL입니다'}), 400
        
        # 1. 채널 분석
        channel_analysis, error = analyze_channel_for_shorts(channel_id)
        if error:
            return jsonify({'error': '채널 분석 중 오류가 발생했습니다.', 'details': error}), 500
        if not channel_analysis:
            return jsonify({'error': '채널 정보를 가져올 수 없습니다'}), 500
        
        # 2. 트렌드 분석
        trending = get_trending_shorts()
        
        # 3. 프롬프트 생성
        shorts_info = ""
        if channel_analysis['shorts']:
            avg_views = sum(s['views'] for s in channel_analysis['shorts']) / len(channel_analysis['shorts'])
            popular_shorts = sorted(channel_analysis['shorts'], key=lambda x: x['views'], reverse=True)[:3]
            
            shorts_info = f"""
**채널의 기존 Shorts 분석:**
- 평균 조회수: {avg_views:,.0f}회
- 인기 Shorts:
"""
            for i, short in enumerate(popular_shorts, 1):
                shorts_info += f"  {i}. {short['title']} ({short['views']:,}회, {short['duration']}초)\n"
        
        trending_info = ""
        if trending:
            trending_info = f"\n**현재 트렌드:**\n" + "\n".join(f"- {t}" for t in trending[:5])
        
        prompt = f"""
당신은 YouTube Shorts 전문 기획자입니다. 다음 채널을 위한 숏폼 영상 기획안을 작성해주세요.

**채널 정보:**
- 채널명: {channel_analysis['channel_name']}
- 구독자: {channel_analysis['subscriber_count']:,}명
- 채널 설명: {channel_analysis['description'][:200]}
{shorts_info}
{trending_info}

**기획 요청:**
- 주제: {topic}
- 키워드: {keywords}
- 목표 길이: {length}

**숏폼 기획안 작성 가이드:**
1. **후킹 (0-3초)**: 시청자를 즉시 사로잡을 강력한 오프닝
2. **전개 (3-45초)**: 빠른 템포로 핵심 내용 전달
3. **마무리 (45-60초)**: CTA(Call To Action) 또는 반전

다음 형식으로 작성해주세요:

## {channel_analysis['channel_name']} 맞춤형 Shorts 기획안: {topic}

**채널 분석:** (채널 특성과 Shorts 스타일 분석)

### 1. 영상 제목 (3개 제안)
- **제목 1:** (강렬하고 짧은 제목, 이모지 활용)
- **제목 2:** (호기심 유발 제목)
- **제목 3:** (트렌드 반영 제목)

### 2. 썸네일 아이디어
- **메인 비주얼:** (첫 프레임이 썸네일이 되므로 강렬한 이미지)
- **텍스트:** (큰 글씨, 강조 문구)
- **색상/스타일:** (눈에 띄는 색상, 대비)

### 3. 초별 구성 (시간대별 상세 가이드)

**[0-3초] 후킹**
- **화면:** (첫 화면 구성)
- **대사/자막:** (강렬한 한 문장)
- **효과음/음악:** (트렌드 음악 추천)
- **편집:** (빠른 컷, 줌인 등)

**[3-15초] 문제 제기/도입**
- **화면:** 
- **대사/자막:** 
- **효과음/음악:** 
- **편집:** 

**[15-45초] 핵심 내용**
- **화면:** 
- **대사/자막:** 
- **효과음/음악:** 
- **편집:** 

**[45-60초] 마무리 & CTA**
- **화면:** 
- **대사/자막:** 
- **효과음/음악:** 
- **편집:** 

### 4. 자막 스타일
- **폰트:** (추천 폰트)
- **색상:** (배경과 대비되는 색상)
- **위치:** (화면 중앙 또는 하단)
- **효과:** (등장 애니메이션)

### 5. 음악/효과음 추천
- **배경음악:** (트렌드 음악 또는 분위기에 맞는 음악)
- **효과음:** (강조할 부분의 효과음)

### 6. 해시태그 (10개)
#Shorts #숏폼 #... (관련 해시태그)

### 7. 예상 성과
- **타겟 시청자:** 
- **예상 조회수:** 
- **성공 포인트:** 
  - 포인트 1
  - 포인트 2
  - 포인트 3

**추가 제안:**
- 시리즈화 아이디어
- 챌린지/트렌드 활용 방안
"""
        
        # 4. AI 기획안 생성
        plan = call_gemini(prompt)
        
        if not plan:
            return jsonify({'error': 'AI 기획안 생성에 실패했습니다'}), 500
        
        # 5. 응답
        return jsonify({
            'channel_info': {
                'name': channel_analysis['channel_name'],
                'subscribers': channel_analysis['subscriber_count'],
                'shorts_count': len(channel_analysis['shorts'])
            },
            'plan': plan
        }), 200
        
    except Exception as e:
        print(f"Shorts plan generation error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

