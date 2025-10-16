"""
크리에이터 연락처 검색 API (공개)
"""

from flask import Blueprint, jsonify, request
import requests
import re
import os
import json
from bs4 import BeautifulSoup

creator_contact_bp = Blueprint('creator_contact', __name__)

def get_youtube_api_key():
    """YouTube API 키 가져오기"""
    # 환경 변수에서 먼저 확인
    api_key = os.getenv('YOUTUBE_API_KEY')
    if api_key:
        return api_key
    
    # config 파일에서 확인
    config_file = os.path.join(os.path.dirname(__file__), '..', 'config', 'api_keys.json')
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                keys = json.load(f)
                return keys.get('youtube_api_key')
        except:
            pass
    
    return None


def extract_email_from_text(text):
    """텍스트에서 이메일 추출"""
    if not text:
        return None
    
    # 이메일 정규식
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    
    if emails:
        # 일반적인 스팸 이메일 제외
        spam_patterns = ['noreply', 'no-reply', 'donotreply']
        valid_emails = [e for e in emails if not any(spam in e.lower() for spam in spam_patterns)]
        if valid_emails:
            return valid_emails[0]
    
    return None


def get_channel_info(channel_input, api_key):
    """
    채널 정보 가져오기
    channel_input: 채널 ID, 핸들(@), 채널명, 또는 URL
    """
    try:
        # URL에서 채널 ID 또는 핸들 추출
        if 'youtube.com' in channel_input:
            if '/channel/' in channel_input:
                channel_id = channel_input.split('/channel/')[1].split('/')[0].split('?')[0]
            elif '/@' in channel_input:
                handle = channel_input.split('/@')[1].split('/')[0].split('?')[0]
                channel_input = '@' + handle
            else:
                return None
        
        # 채널 ID로 직접 조회 (UC로 시작하는 24자리)
        if channel_input.startswith('UC') and len(channel_input) == 24:
            url = 'https://www.googleapis.com/youtube/v3/channels'
            params = {
                'part': 'snippet,statistics,brandingSettings',
                'id': channel_input,
                'key': api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if 'items' in data and len(data['items']) > 0:
                return data['items'][0]
        
        # 핸들(@) 또는 채널명으로 검색
        search_url = 'https://www.googleapis.com/youtube/v3/search'
        search_params = {
            'part': 'snippet',
            'q': channel_input,
            'type': 'channel',
            'maxResults': 1,
            'key': api_key
        }
        
        search_response = requests.get(search_url, params=search_params, timeout=10)
        search_data = search_response.json()
        
        if 'items' not in search_data or len(search_data['items']) == 0:
            return None
        
        channel_id = search_data['items'][0]['snippet']['channelId']
        
        # 채널 상세 정보 가져오기
        url = 'https://www.googleapis.com/youtube/v3/channels'
        params = {
            'part': 'snippet,statistics,brandingSettings',
            'id': channel_id,
            'key': api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if 'items' in data and len(data['items']) > 0:
            return data['items'][0]
        
        return None
        
    except Exception as e:
        print(f"Error getting channel info: {e}")
        return None


def scrape_channel_about_page(channel_id):
    """
    채널 정보 페이지에서 이메일 스크래핑 (YouTube 공개 정보만)
    """
    try:
        # YouTube 채널 정보 페이지 URL
        url = f'https://www.youtube.com/channel/{channel_id}/about'
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return None
        
        # 페이지에서 이메일 찾기
        email = extract_email_from_text(response.text)
        
        return email
        
    except Exception as e:
        print(f"Error scraping channel page: {e}")
        return None


@creator_contact_bp.route('/search', methods=['POST'])
def search_creator_contact():
    """
    크리에이터 연락처 검색 (공개 API)
    """
    try:
        data = request.json
        channel_input = data.get('channel', '').strip()
        
        if not channel_input:
            return jsonify({'error': '채널 정보를 입력해주세요.'}), 400
        
        # YouTube API 키 확인
        api_key = get_youtube_api_key()
        if not api_key:
            return jsonify({'error': 'YouTube API 키가 설정되지 않았습니다.'}), 503
        
        # 채널 정보 가져오기
        channel_info = get_channel_info(channel_input, api_key)
        
        if not channel_info:
            return jsonify({'error': '채널을 찾을 수 없습니다.'}), 404
        
        # 기본 정보 추출
        channel_id = channel_info['id']
        channel_title = channel_info['snippet']['title']
        channel_description = channel_info['snippet']['description']
        channel_custom_url = channel_info['snippet'].get('customUrl', '')
        
        # 통계 정보
        stats = channel_info.get('statistics', {})
        subscribers = stats.get('subscriberCount', 'N/A')
        video_count = stats.get('videoCount', 'N/A')
        view_count = stats.get('viewCount', 'N/A')
        
        # 이메일 찾기
        email = None
        
        # 1. 채널 설명에서 이메일 찾기
        email = extract_email_from_text(channel_description)
        
        # 2. 브랜딩 설정에서 이메일 찾기
        if not email and 'brandingSettings' in channel_info:
            branding = channel_info['brandingSettings']
            if 'channel' in branding:
                email = extract_email_from_text(branding['channel'].get('unsubscribedTrailer', ''))
        
        # 3. 채널 정보 페이지 스크래핑 (공개 정보만)
        if not email:
            email = scrape_channel_about_page(channel_id)
        
        # 결과 반환
        result = {
            'channel_id': channel_id,
            'channel_title': channel_title,
            'channel_url': f'https://www.youtube.com/channel/{channel_id}',
            'custom_url': f'https://www.youtube.com/{channel_custom_url}' if channel_custom_url else None,
            'email': email,
            'email_found': email is not None,
            'statistics': {
                'subscribers': subscribers,
                'videos': video_count,
                'views': view_count
            },
            'description_preview': channel_description[:200] + '...' if len(channel_description) > 200 else channel_description
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': '검색 중 오류가 발생했습니다.',
            'message': str(e)
        }), 500


@creator_contact_bp.route('/batch-search', methods=['POST'])
def batch_search_contacts():
    """
    여러 크리에이터 연락처 일괄 검색
    """
    try:
        data = request.json
        channels = data.get('channels', [])
        
        if not channels or not isinstance(channels, list):
            return jsonify({'error': '채널 목록을 입력해주세요.'}), 400
        
        if len(channels) > 10:
            return jsonify({'error': '한 번에 최대 10개까지 검색 가능합니다.'}), 400
        
        # YouTube API 키 확인
        api_key = get_youtube_api_key()
        if not api_key:
            return jsonify({'error': 'YouTube API 키가 설정되지 않았습니다.'}), 503
        
        results = []
        
        for channel_input in channels:
            try:
                channel_info = get_channel_info(channel_input.strip(), api_key)
                
                if not channel_info:
                    results.append({
                        'input': channel_input,
                        'success': False,
                        'error': '채널을 찾을 수 없습니다.'
                    })
                    continue
                
                channel_id = channel_info['id']
                channel_title = channel_info['snippet']['title']
                channel_description = channel_info['snippet']['description']
                
                # 이메일 찾기
                email = extract_email_from_text(channel_description)
                if not email:
                    email = scrape_channel_about_page(channel_id)
                
                results.append({
                    'input': channel_input,
                    'success': True,
                    'channel_id': channel_id,
                    'channel_title': channel_title,
                    'email': email,
                    'email_found': email is not None
                })
                
            except Exception as e:
                results.append({
                    'input': channel_input,
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({
            'results': results,
            'total': len(channels),
            'found': sum(1 for r in results if r.get('email_found', False))
        })
        
    except Exception as e:
        return jsonify({
            'error': '일괄 검색 중 오류가 발생했습니다.',
            'message': str(e)
        }), 500


@creator_contact_bp.route('/validate-email', methods=['POST'])
def validate_email():
    """
    이메일 주소 유효성 검증
    """
    try:
        data = request.json
        email = data.get('email', '').strip()
        
        if not email:
            return jsonify({'error': '이메일을 입력해주세요.'}), 400
        
        # 기본 형식 검증
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        is_valid = bool(re.match(email_pattern, email))
        
        # 스팸 이메일 체크
        spam_patterns = ['noreply', 'no-reply', 'donotreply']
        is_spam = any(spam in email.lower() for spam in spam_patterns)
        
        return jsonify({
            'email': email,
            'is_valid': is_valid,
            'is_spam': is_spam,
            'is_usable': is_valid and not is_spam
        })
        
    except Exception as e:
        return jsonify({
            'error': '검증 중 오류가 발생했습니다.',
            'message': str(e)
        }), 500

