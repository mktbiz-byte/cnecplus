import os
import json
import requests

from flask import Blueprint, jsonify, request
from src.utils.api_key_manager import get_gemini_api_key, make_youtube_api_request

ai_bp = Blueprint('ai', __name__)

def call_gemini_api(prompt, api_key=None, model='gemini-2.0-flash-exp', max_retries=3):
    """
    Gemini API 호출 (REST API 방식) - 재시도 로직 포함
    
    Args:
        prompt (str): 프롬프트
        api_key (str): Gemini API 키 (None이면 자동으로 가져옴)
        model (str): 모델명
        max_retries (int): 최대 재시도 횟수
    
    Returns:
        str: 생성된 텍스트 또는 None
    """
    for attempt in range(max_retries):
        # API 키 가져오기 (로테이션 적용)
        current_key = api_key if api_key else get_gemini_api_key()
        
        if not current_key:
            print("No Gemini API key available")
            return None
        
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={current_key}'
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
            print(f"[Attempt {attempt+1}/{max_retries}] Calling Gemini API with model: {model}")
            response = requests.post(url, headers=headers, json=data, timeout=120)
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"Response received: {len(str(result))} chars")
                
                # 응답에서 텍스트 추출
                if 'candidates' in result and len(result['candidates']) > 0:
                    candidate = result['candidates'][0]
                    if 'content' in candidate and 'parts' in candidate['content']:
                        parts = candidate['content']['parts']
                        if len(parts) > 0 and 'text' in parts[0]:
                            return parts[0]['text']
            elif response.status_code == 429:
                print(f"Rate limit exceeded, trying next key...")
                continue
            else:
                print(f"API error: {response.status_code} - {response.text}")
                continue
                
        except requests.exceptions.RequestException as e:
            print(f"Gemini API error (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                print("Retrying with next key...")
                continue
    
    print(f"All {max_retries} attempts failed")
    return None

def get_channel_videos(channel_id, max_results=20):
    """채널의 최신 영상 가져오기 (API 키 로테이션 적용)"""
    print(f"[DEBUG] get_channel_videos for {channel_id}")
    try:
        # 1. 채널의 업로드 플레이리스트 ID 가져오기
        channel_url = 'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'contentDetails',
            'id': channel_id
        }
        
        channel_data, error = make_youtube_api_request(channel_url, channel_params)
        if error or not channel_data or 'items' not in channel_data or len(channel_data['items']) == 0:
            print(f"[DEBUG] Channel not found or no contentDetails for {channel_id}")
            return []
        
        uploads_playlist_id = channel_data['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        
        # 2. 플레이리스트에서 최신 동영상 가져오기
        videos_url = 'https://www.googleapis.com/youtube/v3/playlistItems'
        videos_params = {
            'part': 'snippet',
            'playlistId': uploads_playlist_id,
            'maxResults': max_results
        }
        
        videos_data, error = make_youtube_api_request(videos_url, videos_params)
        if error or not videos_data:
            print(f"[DEBUG] Failed to get playlist items: {error}")
            return []
        
        # 3. 동영상 ID 수집
        video_ids = []
        for item in videos_data.get('items', []):
            video_id = item['snippet']['resourceId']['videoId']
            video_ids.append(video_id)
        
        if not video_ids:
            print("[DEBUG] No video IDs found")
            return []
        
        # 4. 동영상 상세 정보 가져오기
        details_url = 'https://www.googleapis.com/youtube/v3/videos'
        details_params = {
            'part': 'statistics,snippet',
            'id': ','.join(video_ids)
        }
        
        details_data, error = make_youtube_api_request(details_url, details_params)
        if error or not details_data:
            print(f"[DEBUG] Failed to get video details: {error}")
            return []
        
        videos = []
        for item in details_data.get('items', []):
            video = {
                'title': item['snippet']['title'],
                'views': int(item['statistics'].get('viewCount', 0)),
                'likes': int(item['statistics'].get('likeCount', 0)),
                'comments': int(item['statistics'].get('commentCount', 0))
            }
            videos.append(video)
        
        print(f"[DEBUG] Found {len(videos)} videos")
        return videos
        
    except Exception as e:
        print(f"[DEBUG] Error in get_channel_videos: {e}")
        import traceback
        traceback.print_exc()
        return []

@ai_bp.route('/channel-score', methods=['POST'])
def get_channel_score():
    """채널 AI 평가 점수 시스템 (0-10점 척도)"""
    
    try:
        channel_data = request.json
        channel_id = channel_data.get('channel_id')
        
        if not channel_id:
            return jsonify({'error': 'Channel ID not provided'}), 400
        
        print(f"[CHANNEL_SCORE] Analyzing channel: {channel_id}")
        
        # 1. 채널 정보 가져오기
        channel_url = 'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'snippet,statistics',
            'id': channel_id
        }
        
        channel_info, error = make_youtube_api_request(channel_url, channel_params)
        if error or not channel_info or 'items' not in channel_info or len(channel_info['items']) == 0:
            return jsonify({'error': f'Failed to get channel info: {error}'}), 500
        
        channel = channel_info['items'][0]
        channel_name = channel['snippet']['title']
        subscriber_count = int(channel['statistics'].get('subscriberCount', 0))
        video_count = int(channel['statistics'].get('videoCount', 0))
        total_views = int(channel['statistics'].get('viewCount', 0))
        
        print(f"[CHANNEL_SCORE] Channel: {channel_name}, Subscribers: {subscriber_count}, Videos: {video_count}")
        
        # 2. 최근 영상 가져오기
        videos = get_channel_videos(channel_id, max_results=20)
        
        if not videos:
            return jsonify({'error': 'Failed to get channel videos'}), 500
        
        # 3. 영상 통계 분석
        avg_views = sum(v['views'] for v in videos) / len(videos) if videos else 0
        avg_likes = sum(v['likes'] for v in videos) / len(videos) if videos else 0
        avg_comments = sum(v['comments'] for v in videos) / len(videos) if videos else 0
        
        # 4. AI 평가 프롬프트 생성
        prompt = f"""
당신은 YouTube 채널 분석 전문가입니다. 다음 채널을 5가지 기준으로 0-10점 척도로 평가해주세요.

채널 정보:
- 채널명: {channel_name}
- 구독자 수: {subscriber_count:,}명
- 총 영상 수: {video_count}개
- 총 조회수: {total_views:,}회
- 평균 조회수 (최근 20개 영상): {avg_views:,.0f}회
- 평균 좋아요 (최근 20개 영상): {avg_likes:,.0f}개
- 평균 댓글 (최근 20개 영상): {avg_comments:,.0f}개

다음 형식으로 JSON 응답해주세요:

{{
  "content_quality": {{
    "score": 8.5,
    "reason": "영상 품질이 뛰어나고 편집이 전문적입니다"
  }},
  "viewer_engagement": {{
    "score": 7.5,
    "reason": "좋아요와 댓글 반응이 좋은 편입니다"
  }},
  "upload_consistency": {{
    "score": 9.0,
    "reason": "규칙적인 업로드 주기를 유지하고 있습니다"
  }},
  "growth_potential": {{
    "score": 8.0,
    "reason": "트렌드를 잘 활용하면 빠른 성장 가능성이 있습니다"
  }},
  "title_optimization": {{
    "score": 6.5,
    "reason": "제목에 클릭 유도 요소를 더 추가하면 좋습니다"
  }},
  "overall_summary": "이 채널은 전반적으로 우수한 품질을 보여주고 있으며, 규칙적인 업로드와 좋은 시청자 반응을 얻고 있습니다. 제목 최적화와 트렌드 활용을 개선하면 더 빠른 성장을 기대할 수 있습니다."
}}

JSON 형식으로만 응답해주세요. 각 항목에 대해 0-10점 사이의 점수와 구체적인 이유를 제시해주세요.
"""
        
        # 5. AI 평가 실행
        print("[CHANNEL_SCORE] Calling Gemini API for evaluation...")
        ai_response = call_gemini_api(prompt)
        
        if not ai_response:
            return jsonify({'error': 'Failed to get AI evaluation'}), 500
        
        # 6. JSON 파싱
        try:
            # JSON 블록 추출
            import re
            json_match = re.search(r'```json\s*(.*?)\s*```', ai_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # JSON 블록이 없으면 전체 응답을 JSON으로 파싱 시도
                json_str = ai_response
            
            evaluation = json.loads(json_str)
            
            # 7. 응답 구성
            result = {
                'channel_id': channel_id,
                'channel_name': channel_name,
                'statistics': {
                    'subscribers': subscriber_count,
                    'videos': video_count,
                    'total_views': total_views,
                    'avg_views': round(avg_views),
                    'avg_likes': round(avg_likes),
                    'avg_comments': round(avg_comments)
                },
                'evaluation': evaluation
            }
            
            return jsonify(result), 200
            
        except json.JSONDecodeError as e:
            print(f"[CHANNEL_SCORE] JSON parsing error: {e}")
            print(f"[CHANNEL_SCORE] AI response: {ai_response}")
            return jsonify({
                'error': 'Failed to parse AI response',
                'raw_response': ai_response
            }), 500
        
    except Exception as e:
        print(f"[CHANNEL_SCORE] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500



@ai_bp.route('/analyze', methods=['POST'])
def analyze_channel():
    """채널 AI 분석 및 성장 조언"""
    try:
        channel_data = request.json
        channel_id = channel_data.get('channel_id')
        channel_name = channel_data.get('name', '알 수 없음')
        
        if not channel_id:
            return jsonify({'error': 'Channel ID not provided'}), 400
        
        print(f"[AI_ANALYZE] Analyzing channel: {channel_id}")
        
        # 채널 정보 가져오기
        channel_url = 'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'snippet,statistics',
            'id': channel_id
        }
        
        channel_info, error = make_youtube_api_request(channel_url, channel_params)
        if error or not channel_info or 'items' not in channel_info or len(channel_info['items']) == 0:
            return jsonify({'error': f'Failed to get channel info: {error}'}), 500
        
        channel = channel_info['items'][0]
        channel_name = channel['snippet']['title']
        channel_description = channel['snippet'].get('description', '')
        subscriber_count = int(channel['statistics'].get('subscriberCount', 0))
        video_count = int(channel['statistics'].get('videoCount', 0))
        total_views = int(channel['statistics'].get('viewCount', 0))
        
        # 최근 영상 가져오기
        videos = get_channel_videos(channel_id, max_results=10)
        
        if not videos:
            return jsonify({'error': 'Failed to get channel videos'}), 500
        
        # 영상 통계 분석
        avg_views = sum(v['views'] for v in videos) / len(videos) if videos else 0
        avg_likes = sum(v['likes'] for v in videos) / len(videos) if videos else 0
        avg_comments = sum(v['comments'] for v in videos) / len(videos) if videos else 0
        
        # 최근 영상 제목
        recent_titles = [v['title'] for v in videos[:5]]
        
        # AI 분석 프롬프트
        prompt = f"""당신은 YouTube 채널 성장 전문 컨설턴트입니다. 다음 채널을 분석하고 구체적인 성장 전략을 제시해주세요.

채널 정보:
- 채널명: {channel_name}
- 채널 설명: {channel_description[:300]}
- 구독자 수: {subscriber_count:,}명
- 총 영상 수: {video_count}개
- 총 조회수: {total_views:,}회
- 평균 조회수 (최근 10개 영상): {avg_views:,.0f}회
- 평균 좋아요: {avg_likes:,.0f}개
- 평균 댓글: {avg_comments:,.0f}개

최근 영상 제목:
{chr(10).join(['- ' + title for title in recent_titles])}

다음 형식으로 분석해주세요:

## 채널 현황 분석

### 강점
- (채널의 강점 3가지)

### 개선이 필요한 부분
- (개선이 필요한 부분 3가지)

## 성장 전략

### 1. 콘텐츠 전략
- (구체적인 콘텐츠 개선 방안)

### 2. 시청자 참여도 향상
- (댓글, 좋아요, 구독 유도 전략)

### 3. SEO 최적화
- (제목, 설명, 태그 최적화 방안)

### 4. 업로드 전략
- (업로드 주기, 시간대 등)

## 단기 목표 (1-3개월)
- (달성 가능한 구체적 목표 3가지)

## 장기 목표 (6-12개월)
- (장기적 성장 목표 3가지)

한국어로 작성하고, 실행 가능한 구체적인 조언을 제공해주세요."""

        # AI 분석 실행
        print("[AI_ANALYZE] Calling Gemini API...")
        ai_response = call_gemini_api(prompt)
        
        if not ai_response:
            return jsonify({'error': 'Failed to get AI analysis'}), 500
        
        return jsonify({'analysis': ai_response}), 200
        
    except Exception as e:
        print(f"[AI_ANALYZE] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/content-ideas', methods=['POST'])
def get_content_ideas():
    """채널 맞춤형 콘텐츠 아이디어 생성"""
    try:
        channel_data = request.json
        channel_id = channel_data.get('channel_id')
        
        if not channel_id:
            return jsonify({'error': 'Channel ID not provided'}), 400
        
        print(f"[CONTENT_IDEAS] Generating ideas for channel: {channel_id}")
        
        # 채널 정보 가져오기
        channel_url = 'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'snippet,statistics',
            'id': channel_id
        }
        
        channel_info, error = make_youtube_api_request(channel_url, channel_params)
        if error or not channel_info or 'items' not in channel_info or len(channel_info['items']) == 0:
            return jsonify({'error': f'Failed to get channel info: {error}'}), 500
        
        channel = channel_info['items'][0]
        channel_name = channel['snippet']['title']
        channel_description = channel['snippet'].get('description', '')
        
        # 최근 영상 가져오기
        videos = get_channel_videos(channel_id, max_results=10)
        
        if not videos:
            return jsonify({'error': 'Failed to get channel videos'}), 500
        
        # 최근 영상 제목
        recent_titles = [v['title'] for v in videos[:10]]
        
        # 인기 영상 (조회수 기준)
        popular_videos = sorted(videos, key=lambda x: x['views'], reverse=True)[:5]
        popular_titles = [v['title'] for v in popular_videos]
        
        # AI 아이디어 생성 프롬프트
        prompt = f"""당신은 YouTube 콘텐츠 기획 전문가입니다. 다음 채널을 위한 창의적이고 실용적인 콘텐츠 아이디어 10개를 제안해주세요.

채널 정보:
- 채널명: {channel_name}
- 채널 설명: {channel_description[:300]}

최근 영상 제목:
{chr(10).join(['- ' + title for title in recent_titles])}

인기 영상 제목:
{chr(10).join(['- ' + title for title in popular_titles])}

다음 형식으로 10개의 콘텐츠 아이디어를 제안해주세요:

## 콘텐츠 아이디어 Top 10

### 1. [아이디어 제목]
**개요:** [영상 내용 설명]
**예상 제목:** "[클릭을 유도하는 제목]"
**타겟 시청자:** [누구를 위한 콘텐츠인지]
**예상 효과:** [조회수, 참여도 등 기대 효과]

### 2. [아이디어 제목]
**개요:** [영상 내용 설명]
**예상 제목:** "[클릭을 유도하는 제목]"
**타겟 시청자:** [누구를 위한 콘텐츠인지]
**예상 효과:** [조회수, 참여도 등 기대 효과]

(3-10번까지 동일한 형식으로)

## 시리즈 기획 제안
- (연속성 있는 콘텐츠 시리즈 아이디어 2-3개)

## 협업 아이디어
- (다른 크리에이터와의 협업 아이디어 2-3개)

한국어로 작성하고, 이 채널의 스타일과 시청자층에 맞는 실행 가능한 아이디어를 제공해주세요."""

        # AI 아이디어 생성 실행
        print("[CONTENT_IDEAS] Calling Gemini API...")
        ai_response = call_gemini_api(prompt)
        
        if not ai_response:
            return jsonify({'error': 'Failed to generate content ideas'}), 500
        
        return jsonify({'ideas': ai_response}), 200
        
    except Exception as e:
        print(f"[CONTENT_IDEAS] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

