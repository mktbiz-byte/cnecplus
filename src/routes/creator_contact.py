"""
크리에이터 연락처 검색 API (공개)
"""

from flask import Blueprint, jsonify, request
import requests
import re
import os
from bs4 import BeautifulSoup
from src.utils.api_key_manager import make_youtube_api_request

creator_contact_bp = Blueprint('creator_contact', __name__)




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


def get_channel_info(channel_input):
    """
    채널 정보 가져오기 (API 키 로테이션 적용)
    channel_input: 채널 ID, 핸들(@), 채널명, 또는 URL
    """
    try:
        channel_id_to_fetch = None

        # URL에서 채널 ID 또는 핸들 추출
        if 'youtube.com' in channel_input:
            if '/channel/' in channel_input:
                channel_id_to_fetch = channel_input.split('/channel/')[1].split('/')[0].split('?')[0]
            elif '/@' in channel_input:
                handle = channel_input.split('/@')[1].split('/')[0].split('?')[0]
                channel_input = '@' + handle
        
        # 채널 ID로 직접 조회 (UC로 시작하는 24자리)
        if channel_input.startswith('UC') and len(channel_input) == 24:
            channel_id_to_fetch = channel_input

        if channel_id_to_fetch:
            url = 'https://www.googleapis.com/youtube/v3/channels'
            params = {
                'part': 'snippet,statistics,brandingSettings',
                'id': channel_id_to_fetch
            }
            data, error = make_youtube_api_request(url, params)
            if data and 'items' in data and len(data['items']) > 0:
                return data['items'][0], None
            return None, error or "Channel not found with the given ID."

        # 핸들(@) 또는 채널명으로 검색
        search_url = 'https://www.googleapis.com/youtube/v3/search'
        search_params = {
            'part': 'snippet',
            'q': channel_input,
            'type': 'channel',
            'maxResults': 1
        }
        
        search_data, error = make_youtube_api_request(search_url, search_params)
        
        if error:
            return None, error

        if not search_data or 'items' not in search_data or len(search_data['items']) == 0:
            return None, "Channel not found by search."
        
        channel_id = search_data["items"][0]["snippet"]["channelId"]
        
        # 채널 상세 정보 가져오기
        url = 'https://www.googleapis.com/youtube/v3/channels'
        params = {
            'part': 'snippet,statistics,brandingSettings',
            'id': channel_id
        }
        data, error = make_youtube_api_request(url, params)
        if data and 'items' in data and len(data['items']) > 0:
            return data['items'][0], None
        return None, error or "Channel details not found after search."
        
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
    채널 정보 페이지에서 이메일 스크래핑 (개선된 버전)
    """
    try:
        # YouTube 채널 정보 페이지 URL
        url = f'https://www.youtube.com/channel/{channel_id}/about'
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code != 200:
            print(f"Failed to fetch channel page: HTTP {response.status_code}")
            return None
        
        html_content = response.text
        
        # 1. 일반 이메일 패턴 찾기
        email = extract_email_from_text(html_content)
        if email:
            print(f"Found email in HTML: {email}")
            return email
        
        # 2. BeautifulSoup으로 더 정교하게 파싱
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 채널 설명 텍스트 찾기
        description_elements = soup.find_all(['div', 'span', 'p'], class_=lambda x: x and ('description' in x.lower() or 'about' in x.lower()))
        for elem in description_elements:
            text = elem.get_text()
            email = extract_email_from_text(text)
            if email:
                print(f"Found email in description element: {email}")
                return email
        
        # 3. JSON-LD 데이터에서 찾기
        scripts = soup.find_all('script', type='application/ld+json')
        for script in scripts:
            try:
                import json
                data = json.loads(script.string)
                if isinstance(data, dict):
                    # 재귀적으로 이메일 찾기
                    email = find_email_in_dict(data)
                    if email:
                        print(f"Found email in JSON-LD: {email}")
                        return email
            except:
                continue
        
        # 4. ytInitialData에서 찾기 (YouTube의 내부 데이터)
        yt_data_match = re.search(r'var ytInitialData = ({.*?});', html_content)
        if yt_data_match:
            try:
                import json
                yt_data = json.loads(yt_data_match.group(1))
                email = find_email_in_dict(yt_data)
                if email:
                    print(f"Found email in ytInitialData: {email}")
                    return email
            except:
                pass
        
        print("No email found in channel page")
        return None
        
    except Exception as e:
        print(f"Error scraping channel page: {e}")
        return None

def find_email_in_dict(data, depth=0, max_depth=10):
    """
    중첩된 dictionary에서 재귀적으로 이메일 찾기
    """
    if depth > max_depth:
        return None
    
    if isinstance(data, dict):
        for key, value in data.items():
            # 키 이름에 'email'이 포함되어 있으면 확인
            if 'email' in key.lower() and isinstance(value, str):
                email = extract_email_from_text(value)
                if email:
                    return email
            # 값이 문자열이면 이메일 패턴 찾기
            if isinstance(value, str):
                email = extract_email_from_text(value)
                if email:
                    return email
            # 재귀 탐색
            elif isinstance(value, (dict, list)):
                email = find_email_in_dict(value, depth + 1, max_depth)
                if email:
                    return email
    elif isinstance(data, list):
        for item in data:
            email = find_email_in_dict(item, depth + 1, max_depth)
            if email:
                return email
    
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
        
        # 채널 정보 가져오기
        channel_info, error = get_channel_info(channel_input)
        
        if error:
            return jsonify({'error': '채널 정보 조회에 실패했습니다.', 'details': error}), 500

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

