#!/usr/bin/env python3
"""
API 키 로드 및 로테이션 관리
"""
import os
import json
import requests
from itertools import cycle

class ApiKeyManager:
    """API 키를 관리하고 로테이션하는 싱글톤 클래스"""
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ApiKeyManager, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        # 초기화가 여러 번 실행되는 것을 방지
        if hasattr(self, 'initialized'):
            return
        self.initialized = True
        
        self.gemini_keys = []
        self.gemini_key_iterator = None
        self.youtube_keys = []
        self.youtube_key_iterator = None
        self._load_keys()

    def _load_keys(self):
        """설정 파일과 환경 변수에서 API 키 로드"""
        print("\n" + "="*60)
        print("🔄 Loading API keys from environment variables...")
        print("="*60)
        # 설정 파일 경로
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'api_keys.json')
        
        # 1. 파일에서 키 로드
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    keys = json.load(f)
                    gemini_data = keys.get('gemini_api_keys') or keys.get('gemini_api_key')
                    if isinstance(gemini_data, list):
                        self.gemini_keys.extend(gemini_data)
                    elif gemini_data:
                        self.gemini_keys.append(gemini_data)
                    
                    # youtube_api_keys (리스트) 또는 youtube_api_key (단일) 지원
                    youtube_data = keys.get('youtube_api_keys') or keys.get('youtube_api_key')
                    if isinstance(youtube_data, list):
                        self.youtube_keys.extend(youtube_data)
                    elif youtube_data:
                        self.youtube_keys.append(youtube_data)
            except Exception as e:
                print(f"❌ Error loading API keys from file: {e}")

        # 2. 환경 변수에서 키 로드 (파일 설정보다 우선)
        # Gemini API 키 로드 (GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...)
        for i in range(100):  # GEMINI_API_KEY_0 ~ GEMINI_API_KEY_99 까지 지원
            key_name = f'GEMINI_API_KEY_{i}' if i > 0 else 'GEMINI_API_KEY'
            gemini_key = os.getenv(key_name)
            if gemini_key and gemini_key not in self.gemini_keys:
                self.gemini_keys.append(gemini_key)
                print(f"  - Loaded {key_name}: ...{gemini_key[-4:]}")
        
        # 여러 YouTube 키 로드 (쉰표로 구분)
        youtube_env_keys = os.getenv('YOUTUBE_API_KEYS')
        if youtube_env_keys:
            # 기존 키를 덮어쓰지 않고, 새로운 키만 추가
            new_keys = [key.strip() for key in youtube_env_keys.split(',') if key.strip() not in self.youtube_keys]
            self.youtube_keys.extend(new_keys)
        
        # 단일 YouTube 키 환경 변수 지원 (YOUTUBE_API_KEY, YOUTUBE_API_KEY_1, YOUTUBE_API_KEY_2, ...)
        for i in range(100):  # YOUTUBE_API_KEY_0 ~ YOUTUBE_API_KEY_99 까지 지원
            key_name = f'YOUTUBE_API_KEY_{i}' if i > 0 else 'YOUTUBE_API_KEY'
            youtube_key = os.getenv(key_name)
            if youtube_key and youtube_key not in self.youtube_keys:
                self.youtube_keys.append(youtube_key)
                print(f"  - Loaded {key_name}: ...{youtube_key[-4:]}")

        # 중복 제거
        self.youtube_keys = list(dict.fromkeys(self.youtube_keys))

        # Gemini 키 중복 제거 (순서 유지)
        seen = set()
        unique_gemini = []
        for key in self.gemini_keys:
            if key not in seen:
                seen.add(key)
                unique_gemini.append(key)
        self.gemini_keys = unique_gemini

        if self.gemini_keys:
            print(f"\n✅ Gemini API: Loaded {len(self.gemini_keys)} key(s)")
            print(f"   - Using FIRST key only (paid plan): ...{self.gemini_keys[0][-8:]}")
            self.gemini_key_iterator = cycle(self.gemini_keys)
        else:
            print("\n⚠️ Gemini API: No keys loaded!")

        # YouTube 키 중복 제거 (순서 유지)
        seen = set()
        unique_youtube = []
        for key in self.youtube_keys:
            if key not in seen:
                seen.add(key)
                unique_youtube.append(key)
        self.youtube_keys = unique_youtube

        if self.youtube_keys:
            print(f"\n✅ YouTube API: Loaded {len(self.youtube_keys)} key(s)")
            for i, key in enumerate(self.youtube_keys):
                print(f"   [{i+1}] ...{key[-8:]}")
            self.youtube_key_iterator = cycle(self.youtube_keys)
        else:
            print("\n⚠️ YouTube API: No keys loaded!")
        print("="*60 + "\n")

    def get_next_gemini_key(self):
        """Gemini API 키 반환 (유료 플랜이므로 첫 번째 키만 사용)"""
        if not self.gemini_keys:
            return None
        # 유료 플랜이므로 항상 첫 번째 키만 사용
        key = self.gemini_keys[0]
        return key

    def get_gemini_key(self):
        """Gemini API 키 반환 (호환성을 위해 유지)"""
        return self.get_next_gemini_key()

    def get_next_youtube_key(self):
        """다음 YouTube API 키를 순환하며 반환"""
        if not self.youtube_key_iterator:
            return None
        try:
            key = next(self.youtube_key_iterator)
            print(f"🔑 Using YouTube API key ending with: ...{key[-4:]}")
            return key
        except StopIteration:
            return None

# 싱글톤 인스턴스 생성
api_key_manager = ApiKeyManager()

def get_gemini_api_key():
    """Gemini API 키 반환 (로테이션 적용)"""
    return api_key_manager.get_next_gemini_key()

def get_youtube_api_key():
    # 이 함수는 이제 다음 키를 가져오는 역할
    return api_key_manager.get_next_youtube_key()

def make_youtube_api_request(url, params, timeout=10):
    """
    YouTube API 요청을 보내고 할당량 초과 시 키를 자동으로 로테이션합니다.
    """
    # 시도 횟수는 보유한 키의 개수만큼으로 제한
    max_retries = len(api_key_manager.youtube_keys)
    if max_retries == 0:
        return None, "No YouTube API keys are available."

    for i in range(max_retries):
        api_key = get_youtube_api_key()
        if not api_key:
            return None, "Failed to get a YouTube API key."

        params['key'] = api_key
        
        try:
            response = requests.get(url, params=params, timeout=timeout)
            data = response.json()

            # 할당량 초과 오류 감지
            if response.status_code == 403 and 'quotaExceeded' in response.text:
                print(f"- Quota exceeded for key ending in ...{api_key[-4:]}. Rotating... ({i + 1}/{max_retries}) ")
                continue  # 다음 키로 재시도
            
            # 다른 HTTP 오류 발생 시 예외 발생
            response.raise_for_status()
            
            return data, None  # 성공

        except requests.exceptions.RequestException as e:
            print(f"API request error: {e}")
            # 네트워크 오류 시에도 키 로테이션 시도
            continue
            
    # 모든 키가 할당량 초과
    return None, "QUOTA_EXCEEDED: 모든 YouTube API 키의 할당량이 초과되었습니다. 잠시 후 다시 시도하면 다른 API 키로 접속됩니다."

