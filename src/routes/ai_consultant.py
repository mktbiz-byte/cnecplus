import sys
sys.path.append('/opt/.manus/.sandbox-runtime')

from flask import Blueprint, jsonify, request
from data_api import ApiClient
from openai import OpenAI
import os

ai_bp = Blueprint('ai', __name__)
client = ApiClient()
openai_client = OpenAI()

@ai_bp.route('/analyze/<channel_id>', methods=['GET'])
def analyze_channel(channel_id):
    """채널 분석 및 AI 기반 성장 전략 제안"""
    try:
        # 1. 채널 정보 가져오기
        channel_params = {
            'id': channel_id,
            'hl': 'ko'
        }
        channel_response = client.call_api('Youtube/get_channel_details', query=channel_params)
        
        if not channel_response:
            return jsonify({'error': 'Channel not found'}), 404
        
        # 2. 채널의 최신 비디오 가져오기
        videos_params = {
            'id': channel_id,
            'filter': 'videos_latest',
            'hl': 'ko',
            'gl': 'KR'
        }
        videos_response = client.call_api('Youtube/get_channel_videos', query=videos_params)
        
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
                        'published': video.get('publishedTimeText', '')
                    })
        
        # 4. AI 프롬프트 구성
        prompt = f"""
당신은 한국 YouTube 크리에이터를 위한 전문 성장 컨설턴트입니다.
다음 채널 데이터를 분석하고, 구체적이고 실행 가능한 성장 전략을 제안해주세요.

**채널 정보:**
- 채널명: {channel_title}
- 구독자 수: {subscribers}
- 총 동영상 수: {total_videos}
- 총 조회수: {total_views:,}
- 채널 설명: {channel_description[:200]}

**최근 업로드 동영상 (최대 10개):**
{chr(10).join([f"- {v['title']} (조회수: {v['views']:,}, 업로드: {v['published']})" for v in videos_info[:10]])}

다음 항목들을 포함하여 **한국어로** 상세한 분석과 조언을 제공해주세요:

1. **채널 현황 분석**
   - 채널의 강점과 약점
   - 콘텐츠 일관성 평가
   - 구독자 대비 조회수 비율 분석

2. **콘텐츠 전략 제안**
   - 어떤 유형의 콘텐츠를 만들어야 하는지
   - 업로드 빈도 및 타이밍 최적화
   - 썸네일 및 제목 개선 방향

3. **성장 로드맵**
   - 단기 목표 (1-3개월)
   - 중기 목표 (3-6개월)
   - 장기 목표 (6-12개월)

4. **실행 가능한 액션 아이템**
   - 즉시 실행할 수 있는 구체적인 행동 5가지
   - 우선순위 순으로 제시

5. **트렌드 활용 전략**
   - 현재 한국 YouTube 트렌드 고려
   - 채널에 적합한 트렌드 활용 방법

**응답 형식:**
- 전문적이면서도 친근한 톤
- 구체적인 숫자와 예시 포함
- 실행 가능한 조언 중심
- 한국 시장 특성 반영
"""

        # 5. OpenAI API 호출
        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 한국 YouTube 크리에이터를 위한 전문 성장 컨설턴트입니다. 데이터 기반의 구체적이고 실행 가능한 조언을 제공합니다."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        ai_advice = response.choices[0].message.content
        
        return jsonify({
            'channel': {
                'title': channel_title,
                'subscribers': subscribers,
                'totalVideos': total_videos,
                'totalViews': total_views
            },
            'advice': ai_advice,
            'recentVideos': videos_info[:5]
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/content-ideas/<channel_id>', methods=['GET'])
def generate_content_ideas(channel_id):
    """채널 기반 콘텐츠 아이디어 생성"""
    try:
        # 채널 정보 가져오기
        channel_params = {
            'id': channel_id,
            'hl': 'ko'
        }
        channel_response = client.call_api('Youtube/get_channel_details', query=channel_params)
        
        if not channel_response:
            return jsonify({'error': 'Channel not found'}), 404
        
        # 최신 비디오 가져오기
        videos_params = {
            'id': channel_id,
            'filter': 'videos_latest',
            'hl': 'ko',
            'gl': 'KR'
        }
        videos_response = client.call_api('Youtube/get_channel_videos', query=videos_params)
        
        # 비디오 제목 수집
        video_titles = []
        if videos_response:
            for content in videos_response.get('contents', [])[:10]:
                if content.get('type') == 'video':
                    video = content.get('video', {})
                    video_titles.append(video.get('title', ''))
        
        channel_title = channel_response.get('title', '')
        channel_description = channel_response.get('description', '')
        
        # AI 프롬프트
        prompt = f"""
채널명: {channel_title}
채널 설명: {channel_description[:200]}

최근 업로드 영상 제목:
{chr(10).join([f"- {title}" for title in video_titles[:10]])}

위 채널의 콘텐츠 패턴을 분석하고, **한국 시청자들에게 인기를 끌 수 있는 새로운 콘텐츠 아이디어 10개**를 제안해주세요.

각 아이디어는 다음 형식으로 제공해주세요:
1. **제목**: [매력적인 제목]
   - **설명**: [콘텐츠 개요 1-2문장]
   - **예상 타겟**: [어떤 시청자층]
   - **차별화 포인트**: [왜 이 콘텐츠가 효과적인지]

**조건:**
- 채널의 기존 콘텐츠 스타일과 일관성 유지
- 한국 YouTube 트렌드 반영
- 실행 가능성 고려
- 다양한 포맷 제안 (브이로그, 튜토리얼, 챌린지, 리뷰 등)
"""

        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 한국 YouTube 콘텐츠 기획 전문가입니다. 트렌드를 파악하고 창의적인 아이디어를 제안합니다."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.8,
            max_tokens=1500
        )
        
        content_ideas = response.choices[0].message.content
        
        return jsonify({
            'channelTitle': channel_title,
            'ideas': content_ideas
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/title-optimizer', methods=['POST'])
def optimize_title():
    """영상 제목 최적화 제안"""
    try:
        data = request.get_json()
        original_title = data.get('title', '')
        video_description = data.get('description', '')
        target_audience = data.get('target', '일반 시청자')
        
        if not original_title:
            return jsonify({'error': 'Title is required'}), 400
        
        prompt = f"""
원본 제목: {original_title}
영상 설명: {video_description}
타겟 시청자: {target_audience}

위 정보를 바탕으로 **한국 YouTube에서 클릭률(CTR)을 높일 수 있는 제목 5개**를 제안해주세요.

각 제목은 다음 조건을 만족해야 합니다:
- 호기심 유발
- 검색 최적화 (SEO)
- 명확한 가치 제안
- 한국어 특성 반영 (이모지, 숫자, 키워드 활용)
- 50자 이내

각 제목마다 다음 정보를 포함해주세요:
1. **제목**: [최적화된 제목]
   - **전략**: [이 제목이 효과적인 이유]
   - **예상 CTR**: [상/중/하]
   - **타겟 키워드**: [주요 검색 키워드]
"""

        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 YouTube 제목 최적화 전문가입니다. 클릭률을 높이는 매력적인 제목을 만듭니다."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        optimized_titles = response.choices[0].message.content
        
        return jsonify({
            'originalTitle': original_title,
            'suggestions': optimized_titles
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/competitor-analysis', methods=['POST'])
def analyze_competitors():
    """경쟁 채널 분석"""
    try:
        data = request.get_json()
        my_channel_id = data.get('myChannelId', '')
        competitor_ids = data.get('competitorIds', [])
        
        if not my_channel_id or not competitor_ids:
            return jsonify({'error': 'Channel IDs are required'}), 400
        
        # 내 채널 정보
        my_channel = client.call_api('Youtube/get_channel_details', query={'id': my_channel_id, 'hl': 'ko'})
        
        # 경쟁 채널 정보
        competitors_data = []
        for comp_id in competitor_ids[:3]:  # 최대 3개
            comp_channel = client.call_api('Youtube/get_channel_details', query={'id': comp_id, 'hl': 'ko'})
            if comp_channel:
                competitors_data.append({
                    'title': comp_channel.get('title', ''),
                    'subscribers': comp_channel.get('stats', {}).get('subscribersText', '0'),
                    'videos': comp_channel.get('stats', {}).get('videos', 0),
                    'description': comp_channel.get('description', '')[:150]
                })
        
        prompt = f"""
**내 채널:**
- 채널명: {my_channel.get('title', '')}
- 구독자: {my_channel.get('stats', {}).get('subscribersText', '0')}
- 총 동영상: {my_channel.get('stats', {}).get('videos', 0)}

**경쟁 채널:**
{chr(10).join([f"- {c['title']} (구독자: {c['subscribers']}, 동영상: {c['videos']})" for c in competitors_data])}

위 데이터를 분석하여 다음을 제공해주세요:

1. **경쟁 우위 분석**
   - 내 채널의 강점
   - 경쟁 채널 대비 부족한 점

2. **벤치마킹 포인트**
   - 경쟁 채널에서 배울 점
   - 차별화 전략

3. **실행 계획**
   - 경쟁력 강화를 위한 구체적인 액션 아이템

**한국어로 작성해주세요.**
"""

        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 YouTube 경쟁 분석 전문가입니다."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        analysis = response.choices[0].message.content
        
        return jsonify({
            'myChannel': my_channel.get('title', ''),
            'competitors': [c['title'] for c in competitors_data],
            'analysis': analysis
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

