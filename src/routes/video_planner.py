"""
영상 기획안 자동 생성 API
특별 계정 전용 기능
"""

from flask import Blueprint, request, jsonify, session
from functools import wraps
import google.generativeai as genai
import os
import json
from datetime import datetime

video_planner_bp = Blueprint('video_planner', __name__)

# 특별 계정 이메일 리스트 (환경 변수로 관리)
SPECIAL_ACCOUNTS = os.getenv('SPECIAL_ACCOUNTS', 'special1@example.com,special2@example.com').split(',')

def require_special_account(f):
    """
    특별 계정 권한 확인 데코레이터
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_email = session.get('user_email')
        if not user_email:
            return jsonify({
                'error': 'Unauthorized',
                'message': '로그인이 필요합니다.'
            }), 401
        
        if user_email not in SPECIAL_ACCOUNTS:
            return jsonify({
                'error': 'Forbidden',
                'message': '이 기능은 특별 계정만 사용할 수 있습니다.'
            }), 403
        
        return f(*args, **kwargs)
    return decorated_function


def get_gemini_api_key():
    """
    API 키 로드 밸런싱
    """
    try:
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', 'api_keys.json')
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                data = json.load(f)
                keys = data.get('gemini_keys', [])
                if keys:
                    # 간단한 라운드 로빈 방식
                    import random
                    return random.choice(keys)
    except Exception as e:
        print(f"API 키 로드 중 오류: {e}")
    
    # 환경 변수에서 가져오기
    return os.getenv('GEMINI_API_KEY')


@video_planner_bp.route('/check-access', methods=['GET'])
def check_access():
    """
    특별 계정 접근 권한 확인
    """
    user_email = session.get('user_email')
    
    if not user_email:
        return jsonify({
            'hasAccess': False,
            'message': '로그인이 필요합니다.'
        })
    
    has_access = user_email in SPECIAL_ACCOUNTS
    
    return jsonify({
        'hasAccess': has_access,
        'email': user_email if has_access else None,
        'message': '접근 권한이 있습니다.' if has_access else '이 기능은 특별 계정만 사용할 수 있습니다.'
    })


@video_planner_bp.route('/generate-script', methods=['POST'])
@require_special_account
def generate_script():
    """
    영상 대사 자동 생성
    """
    try:
        data = request.json
        topic = data.get('topic', '')
        video_type = data.get('video_type', 'general')  # general, tutorial, review, vlog 등
        duration = data.get('duration', 10)  # 분 단위
        tone = data.get('tone', 'friendly')  # friendly, professional, casual, energetic
        target_audience = data.get('target_audience', '일반 시청자')
        
        if not topic:
            return jsonify({'error': '주제를 입력해주세요.'}), 400
        
        # Gemini API 설정
        api_key = get_gemini_api_key()
        if not api_key:
            return jsonify({'error': 'API 키가 설정되지 않았습니다.'}), 500
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        # 프롬프트 구성
        prompt = f"""
당신은 한국의 전문 유튜브 크리에이터 컨설턴트입니다.
다음 조건에 맞는 유튜브 영상 대사를 작성해주세요.

**영상 정보:**
- 주제: {topic}
- 영상 유형: {video_type}
- 예상 길이: {duration}분
- 톤앤매너: {tone}
- 타겟 시청자: {target_audience}

**작성 가이드:**
1. 시청자의 관심을 끄는 강력한 인트로 (첫 10초)
2. 명확한 구조와 흐름 (도입-전개-결론)
3. 시청자 참여를 유도하는 요소 (질문, 댓글 유도 등)
4. 자연스러운 구어체 표현
5. 적절한 타이밍 표시 (예: [00:00-00:30])

**출력 형식:**
JSON 형식으로 다음과 같이 작성해주세요:
{{
  "title": "영상 제목 제안",
  "hook": "첫 10초 훅 대사",
  "intro": {{
    "timestamp": "00:00-00:30",
    "script": "인트로 대사"
  }},
  "main_content": [
    {{
      "timestamp": "00:30-02:00",
      "section_title": "섹션 제목",
      "script": "메인 대사"
    }}
  ],
  "outro": {{
    "timestamp": "마지막 시간대",
    "script": "아웃트로 대사"
  }},
  "cta": "행동 유도 문구 (좋아요, 구독 등)"
}}
"""
        
        # AI 생성
        response = model.generate_content(prompt)
        result_text = response.text
        
        # JSON 추출 (마크다운 코드 블록 제거)
        if '```json' in result_text:
            result_text = result_text.split('```json')[1].split('```')[0].strip()
        elif '```' in result_text:
            result_text = result_text.split('```')[1].split('```')[0].strip()
        
        script_data = json.loads(result_text)
        
        return jsonify({
            'success': True,
            'script': script_data,
            'generated_at': datetime.now().isoformat()
        })
        
    except json.JSONDecodeError as e:
        return jsonify({
            'error': 'AI 응답 파싱 실패',
            'message': str(e),
            'raw_response': result_text if 'result_text' in locals() else None
        }), 500
    except Exception as e:
        return jsonify({
            'error': '대사 생성 중 오류 발생',
            'message': str(e)
        }), 500


@video_planner_bp.route('/generate-scenes', methods=['POST'])
@require_special_account
def generate_scenes():
    """
    촬영 장면 구성 자동 생성
    """
    try:
        data = request.json
        topic = data.get('topic', '')
        video_type = data.get('video_type', 'general')
        script = data.get('script', None)  # 대사가 있으면 함께 고려
        
        if not topic:
            return jsonify({'error': '주제를 입력해주세요.'}), 400
        
        # Gemini API 설정
        api_key = get_gemini_api_key()
        if not api_key:
            return jsonify({'error': 'API 키가 설정되지 않았습니다.'}), 500
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        # 프롬프트 구성
        script_context = ""
        if script:
            script_context = f"\n\n**참고할 대사:**\n{json.dumps(script, ensure_ascii=False, indent=2)}"
        
        prompt = f"""
당신은 한국의 전문 유튜브 영상 감독입니다.
다음 조건에 맞는 촬영 장면 구성을 작성해주세요.

**영상 정보:**
- 주제: {topic}
- 영상 유형: {video_type}
{script_context}

**작성 가이드:**
1. 각 장면의 촬영 방법 (앵글, 샷 타입)
2. 필요한 소품이나 배경
3. 조명 및 분위기 설정
4. 편집 시 고려사항
5. B-roll 촬영 제안

**출력 형식:**
JSON 형식으로 다음과 같이 작성해주세요:
{{
  "scenes": [
    {{
      "scene_number": 1,
      "timestamp": "00:00-00:30",
      "scene_title": "장면 제목",
      "shot_type": "클로즈업/미디엄샷/풀샷 등",
      "camera_angle": "정면/측면/하이앵글/로우앵글 등",
      "description": "장면 설명",
      "props": ["필요한 소품 리스트"],
      "lighting": "조명 설정",
      "notes": "촬영 시 주의사항"
    }}
  ],
  "b_roll_suggestions": [
    "B-roll 촬영 제안 1",
    "B-roll 촬영 제안 2"
  ],
  "editing_tips": [
    "편집 팁 1",
    "편집 팁 2"
  ]
}}
"""
        
        # AI 생성
        response = model.generate_content(prompt)
        result_text = response.text
        
        # JSON 추출
        if '```json' in result_text:
            result_text = result_text.split('```json')[1].split('```')[0].strip()
        elif '```' in result_text:
            result_text = result_text.split('```')[1].split('```')[0].strip()
        
        scenes_data = json.loads(result_text)
        
        return jsonify({
            'success': True,
            'scenes': scenes_data,
            'generated_at': datetime.now().isoformat()
        })
        
    except json.JSONDecodeError as e:
        return jsonify({
            'error': 'AI 응답 파싱 실패',
            'message': str(e),
            'raw_response': result_text if 'result_text' in locals() else None
        }), 500
    except Exception as e:
        return jsonify({
            'error': '장면 구성 생성 중 오류 발생',
            'message': str(e)
        }), 500


@video_planner_bp.route('/generate-full-plan', methods=['POST'])
@require_special_account
def generate_full_plan():
    """
    완전한 영상 기획안 생성 (대사 + 장면 통합)
    """
    try:
        data = request.json
        topic = data.get('topic', '')
        video_type = data.get('video_type', 'general')
        duration = data.get('duration', 10)
        tone = data.get('tone', 'friendly')
        target_audience = data.get('target_audience', '일반 시청자')
        
        if not topic:
            return jsonify({'error': '주제를 입력해주세요.'}), 400
        
        # Gemini API 설정
        api_key = get_gemini_api_key()
        if not api_key:
            return jsonify({'error': 'API 키가 설정되지 않았습니다.'}), 500
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        # 통합 프롬프트
        prompt = f"""
당신은 한국의 전문 유튜브 크리에이터 컨설턴트이자 영상 감독입니다.
다음 조건에 맞는 완전한 영상 기획안을 작성해주세요.

**영상 정보:**
- 주제: {topic}
- 영상 유형: {video_type}
- 예상 길이: {duration}분
- 톤앤매너: {tone}
- 타겟 시청자: {target_audience}

**포함 내용:**
1. 영상 제목 및 썸네일 아이디어
2. 시간대별 대사 스크립트
3. 각 장면의 촬영 구성
4. 편집 가이드라인
5. SEO 최적화 제안 (태그, 설명)

**출력 형식:**
JSON 형식으로 다음과 같이 작성해주세요:
{{
  "video_info": {{
    "title": "영상 제목",
    "thumbnail_ideas": ["썸네일 아이디어 1", "썸네일 아이디어 2"],
    "estimated_duration": "{duration}분"
  }},
  "script_and_scenes": [
    {{
      "timestamp": "00:00-00:30",
      "section": "인트로",
      "script": "대사 내용",
      "scene": {{
        "shot_type": "클로즈업",
        "camera_angle": "정면",
        "props": ["소품"],
        "lighting": "밝은 조명",
        "notes": "촬영 노트"
      }}
    }}
  ],
  "editing_guide": {{
    "transitions": ["전환 효과 제안"],
    "music_style": "배경음악 스타일",
    "color_grading": "색보정 방향",
    "pacing": "편집 템포 가이드"
  }},
  "seo_optimization": {{
    "tags": ["태그1", "태그2"],
    "description": "영상 설명",
    "keywords": ["키워드1", "키워드2"]
  }},
  "checklist": [
    "촬영 전 체크리스트 항목들"
  ]
}}
"""
        
        # AI 생성
        response = model.generate_content(prompt)
        result_text = response.text
        
        # JSON 추출
        if '```json' in result_text:
            result_text = result_text.split('```json')[1].split('```')[0].strip()
        elif '```' in result_text:
            result_text = result_text.split('```')[1].split('```')[0].strip()
        
        plan_data = json.loads(result_text)
        
        return jsonify({
            'success': True,
            'plan': plan_data,
            'generated_at': datetime.now().isoformat(),
            'user_email': session.get('user_email')
        })
        
    except json.JSONDecodeError as e:
        return jsonify({
            'error': 'AI 응답 파싱 실패',
            'message': str(e),
            'raw_response': result_text if 'result_text' in locals() else None
        }), 500
    except Exception as e:
        return jsonify({
            'error': '기획안 생성 중 오류 발생',
            'message': str(e)
        }), 500


@video_planner_bp.route('/save-plan', methods=['POST'])
@require_special_account
def save_plan():
    """
    생성된 기획안 저장 (선택적 기능)
    """
    try:
        data = request.json
        plan = data.get('plan')
        plan_name = data.get('plan_name', f"plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        
        if not plan:
            return jsonify({'error': '저장할 기획안이 없습니다.'}), 400
        
        # 저장 디렉토리 생성
        save_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'saved_plans')
        os.makedirs(save_dir, exist_ok=True)
        
        # 파일로 저장
        file_path = os.path.join(save_dir, f"{plan_name}.json")
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump({
                'plan': plan,
                'user_email': session.get('user_email'),
                'created_at': datetime.now().isoformat()
            }, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'success': True,
            'message': '기획안이 저장되었습니다.',
            'file_path': file_path
        })
        
    except Exception as e:
        return jsonify({
            'error': '기획안 저장 중 오류 발생',
            'message': str(e)
        }), 500


@video_planner_bp.route('/my-plans', methods=['GET'])
@require_special_account
def get_my_plans():
    """
    내가 저장한 기획안 목록 조회
    """
    try:
        save_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'saved_plans')
        
        if not os.path.exists(save_dir):
            return jsonify({
                'success': True,
                'plans': []
            })
        
        user_email = session.get('user_email')
        plans = []
        
        for filename in os.listdir(save_dir):
            if filename.endswith('.json'):
                file_path = os.path.join(save_dir, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        plan_data = json.load(f)
                        if plan_data.get('user_email') == user_email:
                            plans.append({
                                'name': filename.replace('.json', ''),
                                'created_at': plan_data.get('created_at'),
                                'preview': plan_data.get('plan', {}).get('video_info', {}).get('title', 'No title')
                            })
                except Exception as e:
                    print(f"Error reading plan {filename}: {e}")
                    continue
        
        # 최신순 정렬
        plans.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'plans': plans
        })
        
    except Exception as e:
        return jsonify({
            'error': '기획안 목록 조회 중 오류 발생',
            'message': str(e)
        }), 500

