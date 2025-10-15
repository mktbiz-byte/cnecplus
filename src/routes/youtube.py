import sys
import os

# data_api 경로 추가
data_api_path = '/opt/.manus/.sandbox-runtime'
if os.path.exists(data_api_path) and data_api_path not in sys.path:
    sys.path.append(data_api_path)

from flask import Blueprint, jsonify
import requests
import json

youtube_bp = Blueprint('youtube', __name__)

def get_youtube_api_key():
    """YouTube API 키 가져오기"""
    # API 키 우선순위: 파일 > 환경변수
    api_key = None
    
    # 파일에서 로드
    config_file = os.path.join(os.path.dirname(__file__), '..', 'config', 'api_keys.json')
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                keys = json.load(f)
                api_key = keys.get('youtube_api_key')
        except:
            pass
    
    # 환경변수에서 로드
    if not api_key:
        api_key = os.getenv('YOUTUBE_API_KEY')
    
    return api_key

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
            'part': 'snippet,statistics,brandingSettings,contentDetails',
            'id': channel_id,
            'key': api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if 'items' not in data or len(data['items']) == 0:
            return jsonify({'error': 'Channel not found'}), 404
        
        channel = data['items'][0]
        
        # 데이터 정리
        branding = channel.get('brandingSettings', {})
        channel_branding = branding.get('channel', {})
        image_branding = branding.get('image', {})
        
        result = {
            'id': channel['id'],
            'title': channel['snippet']['title'],
            'description': channel['snippet']['description'],
            'customUrl': channel['snippet'].get('customUrl', ''),
            'publishedAt': channel['snippet']['publishedAt'],
            'thumbnail': channel['snippet']['thumbnails']['high']['url'],
            'bannerImage': image_branding.get('bannerExternalUrl', ''),
            'keywords': channel_branding.get('keywords', ''),
            'country': channel['snippet'].get('country', ''),
            'stats': {
                'subscribers': channel['statistics'].get('subscriberCount', '0'),
                'subscribersText': format_number(int(channel['statistics'].get('subscriberCount', '0'))),
                'videos': int(channel['statistics'].get('videoCount', '0')),
                'views': int(channel['statistics'].get('viewCount', '0'))
            }
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@youtube_bp.route('/channel/<channel_id>/videos', methods=['GET'])
def get_channel_videos(channel_id):
    """채널의 최신 동영상 조회 (YouTube Data API v3)"""
    api_key = get_youtube_api_key()
    
    if not api_key:
        return jsonify({'error': 'YouTube API key not configured'}), 503
    
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
            return jsonify({'error': 'Channel not found'}), 404
        
        uploads_playlist_id = channel_data['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        
        # 2. 플레이리스트에서 최신 동영상 가져오기
        videos_url = 'https://www.googleapis.com/youtube/v3/playlistItems'
        videos_params = {
            'part': 'snippet',
            'playlistId': uploads_playlist_id,
            'maxResults': 20,
            'key': api_key
        }
        
        videos_response = requests.get(videos_url, params=videos_params, timeout=10)
        videos_data = videos_response.json()
        
        # 3. 동영상 ID 수집
        video_ids = []
        for item in videos_data.get('items', []):
            video_ids.append(item['snippet']['resourceId']['videoId'])
        
        # 4. 동영상 상세 정보 가져오기 (조회수, 좋아요 등)
        if video_ids:
            details_url = 'https://www.googleapis.com/youtube/v3/videos'
            details_params = {
                'part': 'statistics,snippet',
                'id': ','.join(video_ids),
                'key': api_key
            }
            
            details_response = requests.get(details_url, params=details_params, timeout=10)
            details_data = details_response.json()
            
            # 데이터 정리
            videos = []
            for video in details_data.get('items', []):
                videos.append({
                    'id': video['id'],
                    'title': video['snippet']['title'],
                    'description': video['snippet']['description'][:200],
                    'thumbnail': video['snippet']['thumbnails']['high']['url'],
                    'publishedAt': video['snippet']['publishedAt'],
                    'stats': {
                        'views': int(video['statistics'].get('viewCount', '0')),
                        'viewsText': format_number(int(video['statistics'].get('viewCount', '0'))),
                        'likes': int(video['statistics'].get('likeCount', '0')),
                        'comments': int(video['statistics'].get('commentCount', '0'))
                    }
                })
            
            return jsonify({'videos': videos})
        
        return jsonify({'videos': []})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@youtube_bp.route('/recommendations/hashtags/<channel_id>', methods=['GET'])
def get_hashtag_recommendations(channel_id):
    """해시태그 추천 (채널 기반)"""
    api_key = get_youtube_api_key()
    
    if not api_key:
        return jsonify({'error': 'YouTube API key not configured'}), 503
    
    try:
        # 채널 정보 가져오기
        channel_url = 'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'snippet,topicDetails',
            'id': channel_id,
            'key': api_key
        }
        
        response = requests.get(channel_url, params=channel_params, timeout=10)
        data = response.json()
        
        if 'items' not in data or len(data['items']) == 0:
            return jsonify({'error': 'Channel not found'}), 404
        
        channel = data['items'][0]
        title = channel['snippet']['title']
        description = channel['snippet']['description']
        
        # 간단한 키워드 추출 (실제로는 NLP 사용 권장)
        keywords = []
        
        # 제목에서 키워드 추출
        title_words = title.split()
        for word in title_words:
            if len(word) > 2:
                keywords.append(f"#{word}")
        
        # 설명에서 키워드 추출 (첫 100자)
        desc_words = description[:100].split()
        for word in desc_words:
            if len(word) > 3 and word not in keywords:
                keywords.append(f"#{word}")
        
        # 일반적인 YouTube 해시태그 추가
        general_tags = ['#YouTube', '#구독', '#좋아요', '#알림설정', '#크리에이터']
        
        return jsonify({
            'hashtags': keywords[:10] + general_tags
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@youtube_bp.route('/recommendations/topics/<channel_id>', methods=['GET'])
def get_topic_recommendations(channel_id):
    """주제 추천"""
    api_key = get_youtube_api_key()
    
    if not api_key:
        return jsonify({'error': 'YouTube API key not configured'}), 503
    
    try:
        # 채널 정보 가져오기
        channel_url = 'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'topicDetails',
            'id': channel_id,
            'key': api_key
        }
        
        response = requests.get(channel_url, params=channel_params, timeout=10)
        data = response.json()
        
        if 'items' not in data or len(data['items']) == 0:
            return jsonify({'error': 'Channel not found'}), 404
        
        topics = []
        if 'topicDetails' in data['items'][0]:
            topic_categories = data['items'][0]['topicDetails'].get('topicCategories', [])
            for topic_url in topic_categories:
                # URL에서 주제 이름 추출
                topic_name = topic_url.split('/')[-1].replace('_', ' ')
                topics.append(topic_name)
        
        return jsonify({'topics': topics if topics else ['일반']})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@youtube_bp.route('/trends', methods=['GET'])
def get_trends():
    """트렌드 동영상 조회 (YouTube Data API v3)"""
    api_key = get_youtube_api_key()
    
    if not api_key:
        return jsonify({'error': 'YouTube API key not configured'}), 503
    
    try:
        url = 'https://www.googleapis.com/youtube/v3/videos'
        params = {
            'part': 'snippet,statistics',
            'chart': 'mostPopular',
            'regionCode': 'KR',
            'maxResults': 20,
            'key': api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        trends = []
        for video in data.get('items', []):
            trends.append({
                'id': video['id'],
                'title': video['snippet']['title'],
                'channelTitle': video['snippet']['channelTitle'],
                'thumbnail': video['snippet']['thumbnails']['high']['url'],
                'publishedAt': video['snippet']['publishedAt'],
                'stats': {
                    'views': int(video['statistics'].get('viewCount', '0')),
                    'viewsText': format_number(int(video['statistics'].get('viewCount', '0'))),
                    'likes': int(video['statistics'].get('likeCount', '0')),
                    'comments': int(video['statistics'].get('commentCount', '0'))
                }
            })
        
        return jsonify({'trends': trends})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def format_number(num):
    """숫자를 한국어 형식으로 포맷"""
    if num >= 100000000:  # 1억 이상
        return f"{num / 100000000:.1f}억"
    elif num >= 10000:  # 1만 이상
        return f"{num / 10000:.1f}만"
    elif num >= 1000:  # 1천 이상
        return f"{num / 1000:.1f}천"
    else:
        return str(num)

