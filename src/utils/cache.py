"""
메모리 기반 캐싱 시스템
Redis 없이 간단한 메모리 캐싱 구현
"""

import time
import hashlib
import json
from threading import Lock

class SimpleCache:
    """간단한 메모리 캐싱 클래스"""
    
    def __init__(self):
        self._cache = {}
        self._lock = Lock()
    
    def _generate_key(self, prefix, data):
        """캐시 키 생성"""
        if isinstance(data, dict):
            data_str = json.dumps(data, sort_keys=True)
        else:
            data_str = str(data)
        
        hash_obj = hashlib.md5(data_str.encode())
        return f"{prefix}:{hash_obj.hexdigest()}"
    
    def get(self, key):
        """캐시에서 데이터 가져오기"""
        with self._lock:
            if key in self._cache:
                item = self._cache[key]
                # 만료 시간 확인
                if item['expires_at'] > time.time():
                    return item['data']
                else:
                    # 만료된 항목 삭제
                    del self._cache[key]
            return None
    
    def set(self, key, data, ttl=86400):
        """
        캐시에 데이터 저장
        
        Args:
            key: 캐시 키
            data: 저장할 데이터
            ttl: 유효 시간 (초), 기본 24시간
        """
        with self._lock:
            self._cache[key] = {
                'data': data,
                'expires_at': time.time() + ttl
            }
    
    def delete(self, key):
        """캐시에서 데이터 삭제"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    def clear(self):
        """모든 캐시 삭제"""
        with self._lock:
            self._cache.clear()
    
    def cleanup_expired(self):
        """만료된 캐시 항목 정리"""
        with self._lock:
            current_time = time.time()
            expired_keys = [
                key for key, item in self._cache.items()
                if item['expires_at'] <= current_time
            ]
            for key in expired_keys:
                del self._cache[key]
            return len(expired_keys)
    
    def get_stats(self):
        """캐시 통계 반환"""
        with self._lock:
            total = len(self._cache)
            current_time = time.time()
            expired = sum(
                1 for item in self._cache.values()
                if item['expires_at'] <= current_time
            )
            return {
                'total': total,
                'active': total - expired,
                'expired': expired
            }

# 전역 캐시 인스턴스
cache = SimpleCache()

# 캐시 키 프리픽스
CACHE_PREFIX_CHANNEL = 'channel'
CACHE_PREFIX_VIDEOS = 'videos'
CACHE_PREFIX_AI_ANALYSIS = 'ai_analysis'
CACHE_PREFIX_CONTENT_IDEAS = 'content_ideas'
CACHE_PREFIX_HASHTAGS = 'hashtags'
CACHE_PREFIX_TOPICS = 'topics'

def get_channel_cache_key(channel_id):
    """채널 정보 캐시 키 생성"""
    return cache._generate_key(CACHE_PREFIX_CHANNEL, channel_id)

def get_videos_cache_key(channel_id):
    """채널 동영상 캐시 키 생성"""
    return cache._generate_key(CACHE_PREFIX_VIDEOS, channel_id)

def get_ai_analysis_cache_key(channel_id):
    """AI 분석 캐시 키 생성"""
    return cache._generate_key(CACHE_PREFIX_AI_ANALYSIS, channel_id)

def get_content_ideas_cache_key(channel_id):
    """콘텐츠 아이디어 캐시 키 생성"""
    return cache._generate_key(CACHE_PREFIX_CONTENT_IDEAS, channel_id)

def get_hashtags_cache_key(channel_id):
    """해시태그 추천 캐시 키 생성"""
    return cache._generate_key(CACHE_PREFIX_HASHTAGS, channel_id)

def get_topics_cache_key(channel_id):
    """주제 추천 캐시 키 생성"""
    return cache._generate_key(CACHE_PREFIX_TOPICS, channel_id)

