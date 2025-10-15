import sys
import os

# data_api 경로 추가
data_api_path = '/opt/.manus/.sandbox-runtime'
if os.path.exists(data_api_path) and data_api_path not in sys.path:
    sys.path.append(data_api_path)

from flask import Blueprint, jsonify, request

try:
    from data_api import ApiClient
    HAS_DATA_API = True
except ImportError:
    HAS_DATA_API = False
    print("Warning: data_api not available")

from openai import OpenAI
import json

ai_bp = Blueprint('ai', __name__)

if HAS_DATA_API:
    youtube_client = ApiClient()
else:
    youtube_client = None

# Gemini 2.5 Flash 사용 (OpenAI 호환 API)
openai_client = OpenAI()

@ai_bp.route('/analyze/<channel_id>', methods=['GET'])
def analyze_channel(channel_id):
    """채널 분석 및 AI 기반 성장 전략 제안 (Gemini 2.5 Flash)"""
    if not HAS_DATA_API or youtube_client is None:
        return jsonify({'error': 'YouTube API not available'}), 503
    
    try:
        # 1. 채널 정보 가져오기
        channel_params = {
            'id': channel_id,
            'hl': 'ko'
        }
        channel_response = youtube_client.call_api('Youtube/get_channel_details', query=channel_params)
        
        if not channel_response:
            return jsonify({'error': 'Channel not found'}), 404
        
        # 2. 채널의 최신 비디오 가져오기
        videos_params = {
            'id': channel_id,
            'filter': 'videos_latest',
            'hl': 'ko',
            'gl': 'KR'
        }
        videos_response = youtube_client.call_api('Youtube/get_channel_videos', query=videos_params)
        
        # 3. 데이터 정리
        channel_title = channel_response.get('title', '')
        channel_description = channel_response.get('description', '')
        stats = channel_response.get('stats', {})
        subscribers = stats.get('subscribersText', '0')
        total_videos = stats.get('videos', 0)
        total_views = stats.get('views', 0)
        
        # 비디오 정보 추출
        videos_info = []
        if videos_response:
            for content in videos_response.get('contents', [])[:10]:
                if content.get('type') == 'video':
                    video = content.get('video', {})
                    videos_info.append({
                        'title': video.get('title', ''),
                        'views': video.get('stats', {}).get('views', 0),
                        'publishedTime': video.get('publishedTimeText', '')
                    })
        
        # 4. Gemini에게 분석 요청
        prompt = f"""당신은 한국 YouTube 크리에이터 성장 전문 컨설턴트입니다. 
다음 채널 데이터를 바탕으로 한국 시장에서의 YouTube 성장 전략을 제안해주세요.

**채널 정보:**
- 채널명: {channel_title}
- 구독자: {subscribers}
- 총 동영상 수: {total_videos}
- 총 조회수: {total_views}
- 채널 설명: {channel_description[:200]}

**최근 업로드 영상 (최대 10개):**
{json.dumps(videos_info, ensure_ascii=False, indent=2)}

**분석 요청사항:**
1. 채널 현황 분석 (강점, 약점, 기회, 위협)
2. 구체적인 성장 전략 (단기/중기/장기)
3. 콘텐츠 최적화 방안
4. 트렌드 활용 방법
5. 구독자 대비 조회수 비율 분석

한국 크리에이터를 위한 실용적이고 구체적인 조언을 제공해주세요.
마크다운 형식으로 작성하되, 이모지나 특수문자는 사용하지 마세요."""

        # Gemini 2.5 Flash 호출
        response = openai_client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[
                {"role": "system", "content": "당신은 한국 YouTube 크리에이터 성장 전문 컨설턴트입니다."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.7
        )
        
        analysis = response.choices[0].message.content
        
        return jsonify({
            'analysis': analysis,
            'channelInfo': {
                'title': channel_title,
                'subscribers': subscribers,
                'totalVideos': total_videos,
                'totalViews': total_views
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/content-ideas/<channel_id>', methods=['GET'])
def generate_content_ideas(channel_id):
    """채널 스타일 기반 콘텐츠 아이디어 생성 (Gemini 2.5 Flash)"""
    if not HAS_DATA_API or youtube_client is None:
        return jsonify({'error': 'YouTube API not available'}), 503
    
    try:
        # 채널 정보 가져오기
        channel_params = {
            'id': channel_id,
            'hl': 'ko'
        }
        channel_response = youtube_client.call_api('Youtube/get_channel_details', query=channel_params)
        
        if not channel_response:
            return jsonify({'error': 'Channel not found'}), 404
        
        # 최신 비디오 가져오기
        videos_params = {
            'id': channel_id,
            'filter': 'videos_latest',
            'hl': 'ko',
            'gl': 'KR'
        }
        videos_response = youtube_client.call_api('Youtube/get_channel_videos', query=videos_params)
        
        channel_title = channel_response.get('title', '')
        channel_description = channel_response.get('description', '')
        
        # 최근 비디오 제목 수집
        recent_titles = []
        if videos_response:
            for content in videos_response.get('contents', [])[:15]:
                if content.get('type') == 'video':
                    video = content.get('video', {})
                    recent_titles.append(video.get('title', ''))
        
        # Gemini에게 콘텐츠 아이디어 요청
        prompt = f"""당신은 창의적인 YouTube 콘텐츠 기획자입니다.
다음 채널의 스타일을 분석하여 새로운 콘텐츠 아이디어 10개를 제안해주세요.

**채널 정보:**
- 채널명: {channel_title}
- 채널 설명: {channel_description[:200]}

**최근 업로드 영상 제목:**
{chr(10).join(f"- {title}" for title in recent_titles[:10])}

**요청사항:**
채널 스타일과 조화를 이루며, 한국 시청자들의 문화적 특성과 트렌드를 반영한 실현 가능한 콘텐츠 아이디어 10개를 제안해주세요.

각 아이디어는 다음 형식으로 작성해주세요:
1. **제목**: (매력적인 영상 제목)
   - **설명**: (콘텐츠 내용 설명)
   - **예상 타겟**: (타겟 시청자층)
   - **차별화 포인트**: (다른 콘텐츠와의 차별점)

이모지나 특수문자는 사용하지 마세요."""

        response = openai_client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[
                {"role": "system", "content": "당신은 창의적인 YouTube 콘텐츠 기획자입니다."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2500,
            temperature=0.8
        )
        
        ideas = response.choices[0].message.content
        
        return jsonify({
            'ideas': ideas,
            'channelTitle': channel_title
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/title-optimizer', methods=['POST'])
def optimize_title():
    """영상 제목 최적화 (Gemini 2.5 Flash)"""
    try:
        data = request.get_json()
        original_title = data.get('title', '')
        
        if not original_title:
            return jsonify({'error': 'Title is required'}), 400
        
        prompt = f"""당신은 YouTube SEO 및 클릭률(CTR) 최적화 전문가입니다.
다음 영상 제목을 한국 시청자들의 클릭을 유도할 수 있도록 최적화해주세요.

**원본 제목:**
{original_title}

**요청사항:**
1. 클릭률을 높일 수 있는 매력적인 제목 5개 제안
2. 각 제목은 한국어로 작성
3. SEO를 고려한 키워드 포함
4. 호기심을 자극하되 과장하지 않기
5. 50자 이내로 작성

다음 형식으로 작성해주세요:
1. (제목) - (이유: 왜 이 제목이 효과적인지)
2. (제목) - (이유: 왜 이 제목이 효과적인지)
...

이모지나 특수문자는 사용하지 마세요."""

        response = openai_client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[
                {"role": "system", "content": "당신은 YouTube SEO 및 클릭률 최적화 전문가입니다."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        optimized_titles = response.choices[0].message.content
        
        return jsonify({
            'originalTitle': original_title,
            'optimizedTitles': optimized_titles
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/competitor-analysis', methods=['POST'])
def analyze_competitors():
    """경쟁 채널 분석 (Gemini 2.5 Flash)"""
    if not HAS_DATA_API or youtube_client is None:
        return jsonify({'error': 'YouTube API not available'}), 503
    
    try:
        data = request.get_json()
        my_channel_id = data.get('myChannelId', '')
        competitor_channel_id = data.get('competitorChannelId', '')
        
        if not my_channel_id or not competitor_channel_id:
            return jsonify({'error': 'Both channel IDs are required'}), 400
        
        # 내 채널 정보
        my_channel = youtube_client.call_api('Youtube/get_channel_details', query={'id': my_channel_id, 'hl': 'ko'})
        # 경쟁 채널 정보
        competitor_channel = youtube_client.call_api('Youtube/get_channel_details', query={'id': competitor_channel_id, 'hl': 'ko'})
        
        if not my_channel or not competitor_channel:
            return jsonify({'error': 'One or both channels not found'}), 404
        
        # 데이터 정리
        my_data = {
            'title': my_channel.get('title', ''),
            'subscribers': my_channel.get('stats', {}).get('subscribersText', '0'),
            'videos': my_channel.get('stats', {}).get('videos', 0),
            'views': my_channel.get('stats', {}).get('views', 0)
        }
        
        competitor_data = {
            'title': competitor_channel.get('title', ''),
            'subscribers': competitor_channel.get('stats', {}).get('subscribersText', '0'),
            'videos': competitor_channel.get('stats', {}).get('videos', 0),
            'views': competitor_channel.get('stats', {}).get('views', 0)
        }
        
        prompt = f"""당신은 YouTube 채널 전략 분석 전문가입니다.
다음 두 채널을 비교 분석하여 성장 전략을 제안해주세요.

**내 채널:**
- 채널명: {my_data['title']}
- 구독자: {my_data['subscribers']}
- 동영상 수: {my_data['videos']}
- 총 조회수: {my_data['views']}

**경쟁 채널:**
- 채널명: {competitor_data['title']}
- 구독자: {competitor_data['subscribers']}
- 동영상 수: {competitor_data['videos']}
- 총 조회수: {competitor_data['views']}

**분석 요청:**
1. 두 채널의 주요 차이점
2. 경쟁 채널의 성공 요인
3. 내 채널이 배울 수 있는 점
4. 차별화 전략
5. 구체적인 실행 방안

한국 시장에 맞는 실용적인 조언을 제공해주세요.
이모지나 특수문자는 사용하지 마세요."""

        response = openai_client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[
                {"role": "system", "content": "당신은 YouTube 채널 전략 분석 전문가입니다."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.7
        )
        
        analysis = response.choices[0].message.content
        
        return jsonify({
            'analysis': analysis,
            'myChannel': my_data,
            'competitorChannel': competitor_data
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/thumbnail-analysis', methods=['POST'])
def analyze_thumbnail():
    """썸네일 분석 및 개선 제안 (Gemini 2.5 Flash - 멀티모달)"""
    try:
        data = request.get_json()
        thumbnail_url = data.get('thumbnailUrl', '')
        video_title = data.get('videoTitle', '')
        
        if not thumbnail_url:
            return jsonify({'error': 'Thumbnail URL is required'}), 400
        
        # Gemini는 이미지 분석 가능 (멀티모달)
        prompt = f"""당신은 YouTube 썸네일 디자인 전문가입니다.
다음 썸네일 이미지를 분석하여 개선 방안을 제안해주세요.

**영상 제목:** {video_title}
**썸네일 URL:** {thumbnail_url}

**분석 요청:**
1. 현재 썸네일의 강점과 약점
2. 클릭률을 높이기 위한 개선 방안
3. 색상, 텍스트, 레이아웃 제안
4. 한국 시청자에게 효과적인 디자인 요소
5. 구체적인 실행 가이드

이모지나 특수문자는 사용하지 마세요."""

        # 이미지 URL을 포함한 멀티모달 요청
        response = openai_client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[
                {"role": "system", "content": "당신은 YouTube 썸네일 디자인 전문가입니다."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.7
        )
        
        analysis = response.choices[0].message.content
        
        return jsonify({
            'analysis': analysis,
            'thumbnailUrl': thumbnail_url,
            'videoTitle': video_title
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

