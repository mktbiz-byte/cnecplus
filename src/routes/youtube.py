import sys
sys.path.append('/opt/.manus/.sandbox-runtime')

from flask import Blueprint, jsonify, request
from data_api import ApiClient
from collections import Counter
import re

youtube_bp = Blueprint('youtube', __name__)
client = ApiClient()

@youtube_bp.route('/channel/<channel_id>', methods=['GET'])
def get_channel_info(channel_id):
    """채널 상세 정보 조회"""
    try:
        query_params = {
            'id': channel_id,
            'hl': 'ko'
        }
        
        response = client.call_api('Youtube/get_channel_details', query=query_params)
        
        if not response:
            return jsonify({'error': 'Channel not found'}), 404
        
        # 필요한 정보만 추출
        channel_data = {
            'channelId': response.get('channelId'),
            'title': response.get('title'),
            'description': response.get('description'),
            'customUrl': response.get('customUrl'),
            'handle': response.get('handle'),
            'country': response.get('country'),
            'joinedDate': response.get('joinedDate'),
            'stats': response.get('stats', {}),
            'avatar': response.get('avatar', []),
            'banner': response.get('banner', []),
            'badges': response.get('badges', []),
            'keywords': response.get('keywords', [])
        }
        
        return jsonify(channel_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@youtube_bp.route('/channel/<channel_id>/videos', methods=['GET'])
def get_channel_videos(channel_id):
    """채널의 비디오 목록 조회"""
    try:
        filter_type = request.args.get('filter', 'videos_latest')
        cursor = request.args.get('cursor', None)
        
        query_params = {
            'id': channel_id,
            'filter': filter_type,
            'hl': 'ko',
            'gl': 'KR'
        }
        
        if cursor:
            query_params['cursor'] = cursor
        
        response = client.call_api('Youtube/get_channel_videos', query=query_params)
        
        if not response:
            return jsonify({'error': 'Videos not found'}), 404
        
        # 비디오 정보 추출 및 정리
        videos = []
        for content in response.get('contents', []):
            if content.get('type') == 'video':
                video = content.get('video', {})
                videos.append({
                    'videoId': video.get('videoId'),
                    'title': video.get('title'),
                    'publishedTimeText': video.get('publishedTimeText'),
                    'lengthSeconds': video.get('lengthSeconds'),
                    'viewCount': video.get('stats', {}).get('views', 0),
                    'thumbnails': video.get('thumbnails', []),
                    'isLiveNow': video.get('isLiveNow', False),
                    'badges': video.get('badges', [])
                })
        
        return jsonify({
            'videos': videos,
            'cursorNext': response.get('cursorNext', '')
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@youtube_bp.route('/search', methods=['GET'])
def search_videos():
    """비디오 검색"""
    try:
        query = request.args.get('q', '')
        cursor = request.args.get('cursor', None)
        
        if not query:
            return jsonify({'error': 'Query parameter is required'}), 400
        
        query_params = {
            'q': query,
            'hl': 'ko',
            'gl': 'KR'
        }
        
        if cursor:
            query_params['cursor'] = cursor
        
        response = client.call_api('Youtube/search', query=query_params)
        
        if not response:
            return jsonify({'error': 'Search failed'}), 404
        
        # 검색 결과 정리
        results = []
        for content in response.get('contents', []):
            result_type = content.get('type')
            
            if result_type == 'video':
                video = content.get('video', {})
                results.append({
                    'type': 'video',
                    'videoId': video.get('videoId'),
                    'title': video.get('title'),
                    'channelTitle': video.get('channelTitle'),
                    'publishedTimeText': video.get('publishedTimeText'),
                    'viewCountText': video.get('viewCountText'),
                    'lengthText': video.get('lengthText'),
                    'thumbnails': video.get('thumbnails', []),
                    'description': video.get('descriptionSnippet', '')
                })
            elif result_type == 'channel':
                channel = content.get('channel', {})
                results.append({
                    'type': 'channel',
                    'channelId': channel.get('channelId'),
                    'title': channel.get('title'),
                    'subscriberCountText': channel.get('subscriberCountText'),
                    'videoCountText': channel.get('videoCountText'),
                    'thumbnails': channel.get('thumbnails', []),
                    'description': channel.get('descriptionSnippet', '')
                })
        
        return jsonify({
            'results': results,
            'estimatedResults': response.get('estimatedResults', 0),
            'cursorNext': response.get('cursorNext', '')
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@youtube_bp.route('/recommendations/hashtags/<channel_id>', methods=['GET'])
def recommend_hashtags(channel_id):
    """채널 기반 해시태그 추천"""
    try:
        # 채널의 최신 비디오 가져오기
        query_params = {
            'id': channel_id,
            'filter': 'videos_latest',
            'hl': 'ko',
            'gl': 'KR'
        }
        
        response = client.call_api('Youtube/get_channel_videos', query=query_params)
        
        if not response:
            return jsonify({'error': 'Channel not found'}), 404
        
        # 비디오 제목에서 키워드 추출
        all_words = []
        for content in response.get('contents', [])[:10]:  # 최신 10개 비디오
            if content.get('type') == 'video':
                video = content.get('video', {})
                title = video.get('title', '')
                
                # 한글, 영문, 숫자만 추출 (특수문자 제거)
                words = re.findall(r'[가-힣a-zA-Z0-9]+', title)
                all_words.extend([w for w in words if len(w) > 1])
        
        # 빈도수 계산
        word_freq = Counter(all_words)
        
        # 상위 20개 키워드 추출
        top_keywords = [word for word, count in word_freq.most_common(20)]
        
        # 해시태그 형식으로 변환
        hashtags = [f"#{word}" for word in top_keywords]
        
        return jsonify({
            'hashtags': hashtags,
            'keywords': top_keywords
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@youtube_bp.route('/recommendations/topics/<channel_id>', methods=['GET'])
def recommend_topics(channel_id):
    """채널 기반 주제 추천"""
    try:
        # 채널 정보 가져오기
        channel_params = {
            'id': channel_id,
            'hl': 'ko'
        }
        
        channel_response = client.call_api('Youtube/get_channel_details', query=channel_params)
        
        if not channel_response:
            return jsonify({'error': 'Channel not found'}), 404
        
        # 채널의 키워드 추출
        keywords = channel_response.get('keywords', [])
        
        # 키워드가 없으면 채널 제목과 설명에서 추출
        if not keywords:
            title = channel_response.get('title', '')
            description = channel_response.get('description', '')
            combined_text = f"{title} {description}"
            keywords = re.findall(r'[가-힣a-zA-Z0-9]+', combined_text)
            keywords = [k for k in keywords if len(k) > 2][:5]
        
        # 각 키워드로 인기 비디오 검색
        recommended_topics = []
        
        for keyword in keywords[:3]:  # 상위 3개 키워드만 사용
            search_params = {
                'q': keyword,
                'hl': 'ko',
                'gl': 'KR'
            }
            
            search_response = client.call_api('Youtube/search', query=search_params)
            
            if search_response:
                for content in search_response.get('contents', [])[:3]:  # 각 키워드당 3개
                    if content.get('type') == 'video':
                        video = content.get('video', {})
                        recommended_topics.append({
                            'keyword': keyword,
                            'videoId': video.get('videoId'),
                            'title': video.get('title'),
                            'channelTitle': video.get('channelTitle'),
                            'viewCountText': video.get('viewCountText'),
                            'thumbnails': video.get('thumbnails', [])
                        })
        
        return jsonify({
            'topics': recommended_topics,
            'baseKeywords': keywords[:3]
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@youtube_bp.route('/trends', methods=['GET'])
def get_trending():
    """트렌드 비디오 조회 (검색 기반)"""
    try:
        # 인기 키워드로 검색 (한국 기준)
        trending_keywords = ['인기', '트렌드', '화제', 'viral', 'trending']
        
        all_trending = []
        
        for keyword in trending_keywords[:2]:  # 2개 키워드만 사용
            search_params = {
                'q': keyword,
                'hl': 'ko',
                'gl': 'KR'
            }
            
            search_response = client.call_api('Youtube/search', query=search_params)
            
            if search_response:
                for content in search_response.get('contents', [])[:5]:
                    if content.get('type') == 'video':
                        video = content.get('video', {})
                        
                        # 조회수 텍스트에서 숫자 추출
                        view_text = video.get('viewCountText', '0')
                        view_count = 0
                        
                        # 조회수 파싱 (예: "1.2M views" -> 1200000)
                        if 'M' in view_text or '백만' in view_text:
                            view_count = 1000000
                        elif 'K' in view_text or '천' in view_text:
                            view_count = 1000
                        
                        all_trending.append({
                            'videoId': video.get('videoId'),
                            'title': video.get('title'),
                            'channelTitle': video.get('channelTitle'),
                            'publishedTimeText': video.get('publishedTimeText'),
                            'viewCountText': view_text,
                            'viewCount': view_count,
                            'thumbnails': video.get('thumbnails', []),
                            'lengthText': video.get('lengthText')
                        })
        
        # 조회수 기준으로 정렬
        all_trending.sort(key=lambda x: x['viewCount'], reverse=True)
        
        return jsonify({
            'trending': all_trending[:10]  # 상위 10개만 반환
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

