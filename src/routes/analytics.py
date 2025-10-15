from flask import Blueprint, jsonify, request
import requests
import json
import os
from datetime import datetime

analytics_bp = Blueprint('analytics', __name__)

def get_youtube_api_key():
    """YouTube API 키 가져오기"""
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

@analytics_bp.route('/channel/<channel_id>/performance', methods=['GET'])
def analyze_channel_performance(channel_id):
    """채널 성과 분석 - 실용적인 인사이트 제공"""
    api_key = get_youtube_api_key()
    
    if not api_key:
        return jsonify({'error': 'YouTube API key not configured'}), 503
    
    try:
        # 1. 채널 정보 가져오기
        channel_url = 'https://www.googleapis.com/youtube/v3/channels'
        channel_params = {
            'part': 'snippet,statistics,contentDetails',
            'id': channel_id,
            'key': api_key
        }
        
        channel_response = requests.get(channel_url, params=channel_params, timeout=10)
        channel_data = channel_response.json()
        
        if 'items' not in channel_data or len(channel_data['items']) == 0:
            return jsonify({'error': 'Channel not found'}), 404
        
        channel = channel_data['items'][0]
        uploads_playlist_id = channel['contentDetails']['relatedPlaylists']['uploads']
        
        # 2. 최신 동영상 50개 가져오기
        videos_url = 'https://www.googleapis.com/youtube/v3/playlistItems'
        videos_params = {
            'part': 'snippet',
            'playlistId': uploads_playlist_id,
            'maxResults': 50,
            'key': api_key
        }
        
        videos_response = requests.get(videos_url, params=videos_params, timeout=10)
        videos_data = videos_response.json()
        
        # 3. 동영상 ID 수집
        video_ids = []
        for item in videos_data.get('items', []):
            video_ids.append(item['snippet']['resourceId']['videoId'])
        
        # 4. 동영상 상세 정보 가져오기
        videos = []
        if video_ids:
            details_url = 'https://www.googleapis.com/youtube/v3/videos'
            details_params = {
                'part': 'statistics,snippet,contentDetails',
                'id': ','.join(video_ids),
                'key': api_key
            }
            
            details_response = requests.get(details_url, params=details_params, timeout=10)
            details_data = details_response.json()
            
            for video in details_data.get('items', []):
                views = int(video['statistics'].get('viewCount', '0'))
                likes = int(video['statistics'].get('likeCount', '0'))
                comments = int(video['statistics'].get('commentCount', '0'))
                
                videos.append({
                    'id': video['id'],
                    'title': video['snippet']['title'],
                    'publishedAt': video['snippet']['publishedAt'],
                    'views': views,
                    'likes': likes,
                    'comments': comments,
                    'engagement_rate': (likes + comments) / views * 100 if views > 0 else 0,
                    'like_rate': likes / views * 100 if views > 0 else 0
                })
        
        # 5. 성과 분석
        if not videos:
            return jsonify({'error': 'No videos found'}), 404
        
        # 평균 지표 계산
        total_views = sum(v['views'] for v in videos)
        total_likes = sum(v['likes'] for v in videos)
        total_comments = sum(v['comments'] for v in videos)
        avg_views = total_views / len(videos)
        avg_likes = total_likes / len(videos)
        avg_comments = total_comments / len(videos)
        avg_engagement = sum(v['engagement_rate'] for v in videos) / len(videos)
        
        # 인기 영상 Top 5
        top_videos = sorted(videos, key=lambda x: x['views'], reverse=True)[:5]
        
        # 저조한 영상 Bottom 5
        bottom_videos = sorted(videos, key=lambda x: x['views'])[:5]
        
        # 제목 패턴 분석
        title_lengths = [len(v['title']) for v in videos]
        avg_title_length = sum(title_lengths) / len(title_lengths)
        
        # 업로드 주기 분석
        upload_dates = [datetime.fromisoformat(v['publishedAt'].replace('Z', '+00:00')) for v in videos]
        if len(upload_dates) > 1:
            date_diffs = [(upload_dates[i] - upload_dates[i+1]).days for i in range(len(upload_dates)-1)]
            avg_upload_interval = sum(date_diffs) / len(date_diffs)
        else:
            avg_upload_interval = 0
        
        # 구독자 대비 조회수 비율
        subscribers = int(channel['statistics'].get('subscriberCount', '0'))
        views_per_subscriber = avg_views / subscribers if subscribers > 0 else 0
        
        result = {
            'summary': {
                'total_videos_analyzed': len(videos),
                'avg_views': int(avg_views),
                'avg_likes': int(avg_likes),
                'avg_comments': int(avg_comments),
                'avg_engagement_rate': round(avg_engagement, 2),
                'avg_title_length': int(avg_title_length),
                'avg_upload_interval_days': round(avg_upload_interval, 1),
                'views_per_subscriber': round(views_per_subscriber, 2),
                'subscribers': subscribers
            },
            'top_videos': [
                {
                    'title': v['title'],
                    'views': v['views'],
                    'likes': v['likes'],
                    'engagement_rate': round(v['engagement_rate'], 2)
                } for v in top_videos
            ],
            'bottom_videos': [
                {
                    'title': v['title'],
                    'views': v['views'],
                    'likes': v['likes'],
                    'engagement_rate': round(v['engagement_rate'], 2)
                } for v in bottom_videos
            ],
            'insights': {
                'performance_vs_subscribers': 'good' if views_per_subscriber > 0.1 else 'needs_improvement',
                'engagement_level': 'high' if avg_engagement > 5 else 'medium' if avg_engagement > 2 else 'low',
                'upload_consistency': 'consistent' if avg_upload_interval < 7 else 'irregular'
            }
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

