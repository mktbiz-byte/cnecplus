from flask import Blueprint, jsonify, request
import os
import requests
import json

beauty_bp = Blueprint('beauty', __name__)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

def call_gemini(prompt):
    """Gemini API 호출"""
    if not GEMINI_API_KEY:
        return None
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={GEMINI_API_KEY}"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    data = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "temperature": 0.9,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 8192,
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=60)
        response.raise_for_status()
        result = response.json()
        
        if 'candidates' in result and len(result['candidates']) > 0:
            text = result['candidates'][0]['content']['parts'][0]['text']
            return text
        return None
    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        return None


@beauty_bp.route('/script-generator', methods=['POST'])
def generate_script():
    """뷰티 영상 촬영 장면 및 대사 추천"""
    try:
        data = request.json
        video_concept = data.get('concept', '')
        product_name = data.get('product', '')
        video_length = data.get('length', '5-10분')
        
        if not video_concept:
            return jsonify({'error': 'Video concept is required'}), 400
        
        prompt = f"""
당신은 한국 뷰티 유튜버를 위한 영상 제작 전문가입니다.

**영상 컨셉**: {video_concept}
**제품**: {product_name if product_name else '미정'}
**영상 길이**: {video_length}

다음 형식으로 구체적인 촬영 장면 구성과 대사를 추천해주세요:

## 📹 촬영 장면 구성

### 1. 인트로 (0:00-0:30)
- **장면 설명**: [구체적인 촬영 장면]
- **대사**: "[실제 말할 대사]"
- **촬영 팁**: [조명, 각도, 배경 등]

### 2. 후크 (0:30-1:00)
- **장면 설명**: [시청자의 관심을 끄는 장면]
- **대사**: "[후크 멘트]"
- **촬영 팁**: [클로즈업, 제품 강조 등]

### 3. 제품 소개 (1:00-3:00)
- **장면 설명**: [제품 언박싱/소개 장면]
- **대사**: "[제품 설명 대사]"
- **촬영 팁**: [제품 디테일 촬영]

### 4. 발색/사용 테스트 (3:00-6:00)
- **장면 설명**: [실제 사용 장면]
- **대사**: "[사용 후기 대사]"
- **촬영 팁**: [피부 클로즈업, 비포/애프터]

### 5. 솔직 후기 (6:00-8:00)
- **장면 설명**: [장단점 정리]
- **대사**: "[솔직한 의견]"
- **촬영 팁**: [진솔한 표정]

### 6. 아웃트로 (8:00-10:00)
- **장면 설명**: [마무리 장면]
- **대사**: "[구독/좋아요 유도 멘트]"
- **촬영 팁**: [엔딩 포즈]

## 💬 추천 후크 멘트 (Top 5)
1. "[첫 번째 후크 멘트]"
2. "[두 번째 후크 멘트]"
3. "[세 번째 후크 멘트]"
4. "[네 번째 후크 멘트]"
5. "[다섯 번째 후크 멘트]"

## 🎬 촬영 체크리스트
- [ ] [필요한 준비물 1]
- [ ] [필요한 준비물 2]
- [ ] [필요한 준비물 3]

한국 뷰티 유튜버의 톤앤매너를 반영하여 친근하고 솔직한 대사를 작성해주세요.
"""
        
        result = call_gemini(prompt)
        
        if not result:
            return jsonify({'error': 'Failed to generate script'}), 500
        
        return jsonify({
            'script': result,
            'concept': video_concept,
            'product': product_name,
            'length': video_length
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@beauty_bp.route('/korean-beauty-trends', methods=['GET'])
def get_korean_beauty_trends():
    """한국 뷰티 트렌드 분석 (조회수 높은 영상)"""
    try:
        youtube_api_key = os.getenv('YOUTUBE_API_KEY')
        
        if not youtube_api_key:
            return jsonify({'error': 'YouTube API key not configured'}), 500
        
        # 한국 뷰티 카테고리에서 인기 영상 검색
        search_url = "https://www.googleapis.com/youtube/v3/search"
        search_params = {
            'key': youtube_api_key,
            'part': 'snippet',
            'q': '뷰티 화장품 리뷰 올리브영',
            'type': 'video',
            'regionCode': 'KR',
            'relevanceLanguage': 'ko',
            'order': 'viewCount',
            'maxResults': 20,
            'publishedAfter': '2024-01-01T00:00:00Z'  # 최근 1년
        }
        
        search_response = requests.get(search_url, params=search_params, timeout=10)
        search_response.raise_for_status()
        search_data = search_response.json()
        
        video_ids = [item['id']['videoId'] for item in search_data.get('items', [])]
        
        if not video_ids:
            return jsonify({'trends': [], 'analysis': 'No trending videos found'})
        
        # 영상 상세 정보 가져오기
        videos_url = "https://www.googleapis.com/youtube/v3/videos"
        videos_params = {
            'key': youtube_api_key,
            'part': 'snippet,statistics',
            'id': ','.join(video_ids)
        }
        
        videos_response = requests.get(videos_url, params=videos_params, timeout=10)
        videos_response.raise_for_status()
        videos_data = videos_response.json()
        
        trending_videos = []
        for item in videos_data.get('items', []):
            video = {
                'title': item['snippet']['title'],
                'channel': item['snippet']['channelTitle'],
                'views': int(item['statistics'].get('viewCount', 0)),
                'likes': int(item['statistics'].get('likeCount', 0)),
                'comments': int(item['statistics'].get('commentCount', 0)),
                'thumbnail': item['snippet']['thumbnails']['high']['url'],
                'videoId': item['id'],
                'publishedAt': item['snippet']['publishedAt']
            }
            trending_videos.append(video)
        
        # Gemini로 트렌드 분석
        if trending_videos:
            titles = [v['title'] for v in trending_videos[:10]]
            prompt = f"""
다음은 최근 한국에서 조회수가 높은 뷰티 영상들의 제목입니다:

{chr(10).join([f"{i+1}. {title}" for i, title in enumerate(titles)])}

이 제목들을 분석하여 다음을 추출해주세요:

## 🔥 현재 뷰티 트렌드 키워드 (Top 10)
1. [키워드 1] - [설명]
2. [키워드 2] - [설명]
...

## 💄 인기 있는 제품 카테고리
1. [카테고리 1]
2. [카테고리 2]
...

## 📝 효과적인 제목 패턴
1. [패턴 1] - 예: [예시]
2. [패턴 2] - 예: [예시]
...

## 💡 뷰티 크리에이터를 위한 조언
[구체적인 조언 3-5개]
"""
            
            analysis = call_gemini(prompt)
        else:
            analysis = "트렌드 분석을 생성할 수 없습니다."
        
        return jsonify({
            'trends': trending_videos,
            'analysis': analysis,
            'count': len(trending_videos)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@beauty_bp.route('/hook-phrases', methods=['POST'])
def generate_hook_phrases():
    """후크 멘트 생성"""
    try:
        data = request.json
        video_topic = data.get('topic', '')
        product_name = data.get('product', '')
        
        if not video_topic:
            return jsonify({'error': 'Video topic is required'}), 400
        
        prompt = f"""
한국 뷰티 유튜버를 위한 후크 멘트를 생성해주세요.

**영상 주제**: {video_topic}
**제품**: {product_name if product_name else '미정'}

다음 형식으로 10개의 후크 멘트를 추천해주세요:

## 💬 후크 멘트 Top 10

### 1. [멘트 제목]
**대사**: "[실제 말할 멘트]"
**사용 시점**: [언제 사용하면 좋은지]
**효과**: [왜 효과적인지]

### 2. [멘트 제목]
...

한국 뷰티 유튜버의 톤앤매너를 반영하여:
- 친근하고 솔직한 말투
- "여러분", "진짜", "대박", "꿀템" 같은 자연스러운 표현 사용
- 시청자의 호기심을 자극하는 문구
- 클릭을 유도하는 강력한 후크
"""
        
        result = call_gemini(prompt)
        
        if not result:
            return jsonify({'error': 'Failed to generate hook phrases'}), 500
        
        return jsonify({
            'hooks': result,
            'topic': video_topic,
            'product': product_name
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

