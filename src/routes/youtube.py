import sys
import os
import random

# data_api 경로 추가
data_api_path = '/opt/.manus/.sandbox-runtime'
if os.path.exists(data_api_path) and data_api_path not in sys.path:
    sys.path.append(data_api_path)

from flask import Blueprint, jsonify
import requests
from src.utils.cache import cache, get_channel_cache_key, get_videos_cache_key
from src.models.channel_database import channel_db

youtube_bp = Blueprint('youtube', __name__)

# API 키 로드 밸런싱을 위한 전역 변수
_api_key_index = 0
_api_keys_cache = None

def get_youtube_api_keys():
    """
    환경변수에서 YouTube API 키 목록 가져오기
    
    환경변수 형식:
    - YOUTUBE_API_KEY: 단일 키
    - YOUTUBE_API_KEY_1, YOUTUBE_API_KEY_2, ...: 여러 키
    
    Returns:
        list: API 키 리스트
    """
    global _api_keys_cache
    
    # 캐시된 키가 있으면 반환
    if _api_keys_cache is not None:
        return _api_keys_cache
    
    api_keys = []
    
    # 단일 키 확인
    single_key = os.getenv('YOUTUBE_API_KEY')
    if single_key:
        api_keys.append(single_key)
    
    # 여러 키 확인 (YOUTUBE_API_KEY_1, YOUTUBE_API_KEY_2, ...)
    index = 1
    while True:
        key = os.getenv(f'YOUTUBE_API_KEY_{index}')
        if not key:
            break
        api_keys.append(key)
        index += 1
    
    # 중복 제거
    api_keys = list(set(api_keys))
    
    # 캐시 저장
    _api_keys_cache = api_keys if api_keys else None
    
    return _api_keys_cache

def get_youtube_api_key():
    """
    YouTube API 키 가져오기 - 로드 밸런싱
    
    여러 키가 있으면 라운드 로빈 방식으로 순환
    
    Returns:
        str: API 키
    """
    global _api_key_index
    
    api_keys = get_youtube_api_keys()
    
    if not api_keys:
        return None
    
    # 단일 키면 바로 반환
    if len(api_keys) == 1:
        return api_keys[0]
    
    # 여러 키면 라운드 로빈
    key = api_keys[_api_key_index % len(api_keys)]
    _api_key_index += 1
    
    return key

def resolve_channel_id(input_str, api_key):
    """핸들(@) 또는 채널명을 채널 ID로 변환"""
    # 이미 채널 ID 형식이면 그대로 반환
    if input_str.startswith('UC') and len(input_str) == 24:
        return input_str
    
    # @ 제거
    if input_str.startswith('@'):
        input_str = input_str[1:]
    
    # YouTube Data API v3의 search 엔드포인트 사용
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

@youtube_bp.route('/channel/<channel_id>', methods=['GET'])
def get_channel(channel_id):
    """채널 정보 조회 (YouTube Data API v3)"""
    api_key = get_youtube_api_key()
    
    if not api_key:
        return jsonify({'error': 'YouTube API key not configured'}), 503
    
    # 핸들(@) 또는 채널명을 채널 ID로 변환
    resolved_id = resolve_channel_id(channel_id, api_key)
    if not resolved_id:
        return jsonify({'error': 'Channel not found'}), 404
    
    channel_id = resolved_id
    
    try:
        # YouTube Data API v3 호출
        url = 'https://www.googleapis.com/youtube/v3/channels'
        params = {
            'part': 'snippet,statistics,brandingSettings',
            'id': channel_id,
            'key': api_key
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch channel data'}), response.status_code
        
        data = response.json()
        
        if not data.get('items'):
            return jsonify({'error': 'Channel not found'}), 404
        
        channel = data['items'][0]
        
        # 구독자 수를 한국어 형식으로 변환
        def format_subscribers(count):
            count = int(count)
            if count >= 10000:
                return f"{count/10000:.1f}만"
            elif count >= 1000:
                return f"{count/1000:.1f}천"
            else:
                return str(count)
        
        # 핸들 추출
        handle = channel['snippet'].get('customUrl', '')
        if handle and not handle.startswith('@'):
            handle = '@' + handle
        
        # 응답 데이터 구성
        result = {
            'handle': handle,
            'id': channel['id'],
            'title': channel['snippet']['title'],
            'description': channel['snippet']['description'],
            'customUrl': channel['snippet'].get('customUrl', ''),
            'publishedAt': channel['snippet']['publishedAt'],
            'thumbnail': channel['snippet']['thumbnails']['high']['url'],
            'country': channel['snippet'].get('country', ''),
            'stats': {
                'subscribers': channel['statistics'].get('subscriberCount', '0'),
                'subscribersText': format_subscribers(channel['statistics'].get('subscriberCount', '0')),
                'views': int(channel['statistics'].get('viewCount', 0)),
                'videos': int(channel['statistics'].get('videoCount', 0))
            }
        }
        
        # 배너 이미지 추가 (있는 경우)
        if 'brandingSettings' in channel and 'image' in channel['brandingSettings']:
            result['bannerImage'] = channel['brandingSettings']['image'].get('bannerExternalUrl', '')
        
        # 키워드 추가 (있는 경우)
        if 'brandingSettings' in channel and 'channel' in channel['brandingSettings']:
            result['keywords'] = channel['brandingSettings']['channel'].get('keywords', '')
        
        # 데이터베이스에 저장
        try:
            channel_db.save_channel(result)
        except Exception as e:
            print(f"Failed to save channel to database: {e}")
        
        # 캐시에 저장 (24시간)
        cache_key = get_channel_cache_key(channel_id)
        cache.set(cache_key, result, ttl=86400)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@youtube_bp.route('/channel/<channel_id>/videos', methods=['GET'])
def get_channel_videos(channel_id):
    """채널의 최신 동영상 조회"""
    api_key = get_youtube_api_key()
    
    if not api_key:
        return jsonify({'error': 'YouTube API key not configured'}), 503
    
    # 핸들(@) 또는 채널명을 채널 ID로 변환
    resolved_id = resolve_channel_id(channel_id, api_key)
    if not resolved_id:
        return jsonify({'error': 'Channel not found'}), 404
    
    channel_id = resolved_id
    
    try:
        # YouTube Data API v3 호출 - 최신 동영상 50개
        url = 'https://www.googleapis.com/youtube/v3/search'
        params = {
            'part': 'snippet',
            'channelId': channel_id,
            'order': 'date',
            'type': 'video',
            'maxResults': 50,
            'key': api_key
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch videos'}), response.status_code
        
        data = response.json()
        
        # 비디오 ID 목록 추출
        video_ids = [item['id']['videoId'] for item in data.get('items', [])]
        
        # 비디오 통계 정보 가져오기 (조회수, 좋아요, 댓글 수)
        stats_map = {}
        if video_ids:
            # 한 번에 최대 50개까지 조회 가능
            stats_url = 'https://www.googleapis.com/youtube/v3/videos'
            stats_params = {
                'part': 'statistics',
                'id': ','.join(video_ids),
                'key': api_key
            }
            stats_response = requests.get(stats_url, params=stats_params)
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                for video in stats_data.get('items', []):
                    video_id = video['id']
                    stats = video.get('statistics', {})
                    stats_map[video_id] = {
                        'viewCount': int(stats.get('viewCount', 0)),
                        'likeCount': int(stats.get('likeCount', 0)),
                        'commentCount': int(stats.get('commentCount', 0))
                    }
        
        videos = []
        for item in data.get('items', []):
            video_id = item['id']['videoId']
            video_stats = stats_map.get(video_id, {
                'viewCount': 0,
                'likeCount': 0,
                'commentCount': 0
            })
            
            view_count = video_stats['viewCount']
            like_count = video_stats['likeCount']
            comment_count = video_stats['commentCount']
            
            # 텍스트 형식 변환
            def format_count(count):
                if count >= 1000000:
                    return f"{count/1000000:.1f}M"
                elif count >= 1000:
                    return f"{count/1000:.1f}K"
                return str(count)
            
            videos.append({
                'id': video_id,
                'title': item['snippet']['title'],
                'description': item['snippet']['description'],
                'publishedAt': item['snippet']['publishedAt'],
                'thumbnail': item['snippet']['thumbnails']['high']['url'],
                'thumbnails': [{'url': item['snippet']['thumbnails']['high']['url']}],
                'channelTitle': item['snippet']['channelTitle'],
                'viewCount': view_count,
                'likeCount': like_count,
                'commentCount': comment_count,
                'viewCountText': f"{format_count(view_count)} 조회",
                'likeCountText': format_count(like_count),
                'commentCountText': format_count(comment_count)
            })
        
        return jsonify({'videos': videos})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@youtube_bp.route('/recommendations/hashtags/<channel_id>', methods=['GET'])
def get_hashtag_recommendations(channel_id):
    """채널 기반 해시태그 추천 (Gemini AI 활용)"""
    api_key = get_youtube_api_key()
    
    if not api_key:
        return jsonify({'error': 'YouTube API key not configured'}), 503
    
    # 핸들(@) 또는 채널명을 채널 ID로 변환
    resolved_id = resolve_channel_id(channel_id, api_key)
    if not resolved_id:
        return jsonify({'error': 'Channel not found'}), 404
    
    try:
        # 채널 정보 가져오기
        channel_url = f'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'snippet,statistics',
            'id': resolved_id,
            'key': api_key
        }
        channel_response = requests.get(channel_url, params=channel_params)
        
        if channel_response.status_code != 200:
            return jsonify({'error': 'Failed to fetch channel info'}), channel_response.status_code
        
        channel_data = channel_response.json()
        if not channel_data.get('items'):
            return jsonify({'error': 'Channel not found'}), 404
        
        channel_info = channel_data['items'][0]
        channel_title = channel_info['snippet']['title']
        channel_description = channel_info['snippet']['description']
        
        # 최근 동영상 제목 가져오기 (해시태그 분석용)
        videos_url = 'https://www.googleapis.com/youtube/v3/search'
        videos_params = {
            'part': 'snippet',
            'channelId': resolved_id,
            'order': 'date',
            'type': 'video',
            'maxResults': 10,
            'key': api_key
        }
        videos_response = requests.get(videos_url, params=videos_params)
        
        recent_titles = []
        if videos_response.status_code == 200:
            videos_data = videos_response.json()
            recent_titles = [item['snippet']['title'] for item in videos_data.get('items', [])[:10]]
        
        # Gemini AI로 해시태그 추천
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        if not gemini_api_key:
            # Fallback: 기본 해시태그
            hashtags = [
                '#YouTube', '#콘텐츠', '#크리에이터', '#영상제작',
                '#브이로그', '#일상', '#리뷰', '#팁'
            ]
            return jsonify({'hashtags': hashtags, 'ai_generated': False})
        
        # Gemini API 호출
        gemini_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={gemini_api_key}'
        
        prompt = f"""다음 유튜브 채널을 분석하여 효과적인 해시태그 20개를 추천해주세요.

채널명: {channel_title}
채널 설명: {channel_description[:500]}
최근 영상 제목:
{chr(10).join(['- ' + title for title in recent_titles[:5]])}

요구사항:
1. 채널의 주제와 콘텐츠 스타일에 맞는 해시태그
2. 한국어 해시태그 위주로 추천
3. 트렌디하고 검색량이 많은 해시태그 포함
4. 일반적인 해시태그(#YouTube, #구독, #좋아요 등)와 특화된 해시태그 혼합
5. 각 해시태그는 # 기호로 시작
6. 해시태그만 나열하고, 설명은 제외

출력 형식: #해시태그1 #해시태그2 #해시태그3 ..."""
        
        gemini_payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 500
            }
        }
        
        gemini_response = requests.post(gemini_url, json=gemini_payload, timeout=30)
        
        if gemini_response.status_code == 200:
            gemini_data = gemini_response.json()
            if 'candidates' in gemini_data and len(gemini_data['candidates']) > 0:
                ai_text = gemini_data['candidates'][0]['content']['parts'][0]['text']
                
                # 해시태그 추출
                import re
                hashtags = re.findall(r'#[\w가-힣]+', ai_text)
                
                if hashtags:
                    return jsonify({
                        'hashtags': hashtags[:20],  # 최대 20개
                        'ai_generated': True
                    })
        
        # AI 실패시 기본 해시태그
        hashtags = [
            '#YouTube', '#콘텐츠', '#크리에이터', '#영상제작',
            '#브이로그', '#일상', '#리뷰', '#팁'
        ]
        return jsonify({'hashtags': hashtags, 'ai_generated': False})
    
    except Exception as e:
        print(f"Error in hashtag recommendations: {e}")
        # 에러 발생시 기본 해시태그
        hashtags = [
            '#YouTube', '#콘텐츠', '#크리에이터', '#영상제작',
            '#브이로그', '#일상', '#리뷰', '#팁'
        ]
        return jsonify({'hashtags': hashtags, 'ai_generated': False})

@youtube_bp.route('/recommendations/topics/<channel_id>', methods=['GET'])
def get_topic_recommendations(channel_id):
    """채널 기반 주제 추천"""
    api_key = get_youtube_api_key()
    
    if not api_key:
        return jsonify({'error': 'YouTube API key not configured'}), 503
    
    # 핸들(@) 또는 채널명을 채널 ID로 변환
    resolved_id = resolve_channel_id(channel_id, api_key)
    if not resolved_id:
        return jsonify({'error': 'Channel not found'}), 404
    
    try:
        # 임시 주제 (실제로는 AI 분석 필요)
        topics = [
            '일상 브이로그', '제품 리뷰', '튜토리얼', 'Q&A',
            '챌린지', '여행', '음식', '게임'
        ]
        
        return jsonify({'topics': topics})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@youtube_bp.route('/trends', methods=['GET'])
def get_trends():
    """YouTube 트렌드 조회"""
    api_key = get_youtube_api_key()
    
    if not api_key:
        return jsonify({'error': 'YouTube API key not configured'}), 503
    
    try:
        # YouTube Data API v3 호출 - 인기 동영상
        url = 'https://www.googleapis.com/youtube/v3/videos'
        params = {
            'part': 'snippet,statistics',
            'chart': 'mostPopular',
            'regionCode': 'KR',
            'maxResults': 10,
            'key': api_key
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch trends'}), response.status_code
        
        data = response.json()
        
        # 텍스트 형식 변환 함수
        def format_count(count):
            if count >= 1000000:
                return f"{count/1000000:.1f}M"
            elif count >= 1000:
                return f"{count/1000:.1f}K"
            return str(count)
        
        trends = []
        for item in data.get('items', []):
            view_count = int(item['statistics'].get('viewCount', 0))
            like_count = int(item['statistics'].get('likeCount', 0))
            comment_count = int(item['statistics'].get('commentCount', 0))
            
            trends.append({
                'id': item['id'],
                'title': item['snippet']['title'],
                'channelTitle': item['snippet']['channelTitle'],
                'thumbnail': item['snippet']['thumbnails']['high']['url'],
                'thumbnails': [{'url': item['snippet']['thumbnails']['high']['url']}],
                'views': view_count,
                'likes': like_count,
                'comments': comment_count,
                'viewCountText': f"{format_count(view_count)} 조회",
                'likeCountText': format_count(like_count),
                'commentCountText': format_count(comment_count)
            })
        
        return jsonify({'trends': trends})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

