"""
검색된 채널 정보를 저장하는 데이터베이스 모델
"""

import sqlite3
import os
import re
from datetime import datetime
from threading import Lock

class ChannelDatabase:
    """채널 정보 데이터베이스"""
    
    def __init__(self, db_path='data/channels.db'):
        self.db_path = db_path
        self._lock = Lock()
        self._init_database()
    
    def _init_database(self):
        """데이터베이스 초기화"""
        # 데이터 디렉토리 생성
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 채널 정보 테이블
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS channels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id TEXT UNIQUE NOT NULL,
                    channel_name TEXT,
                    channel_handle TEXT,
                    subscribers INTEGER,
                    video_count INTEGER,
                    view_count INTEGER,
                    description TEXT,
                    email TEXT,
                    channel_url TEXT,
                    thumbnail_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    search_count INTEGER DEFAULT 1
                )
            ''')
            
            # 인덱스 생성
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_channel_id 
                ON channels(channel_id)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_created_at 
                ON channels(created_at DESC)
            ''')
            
            conn.commit()
            conn.close()
    
    def extract_email(self, text):
        """텍스트에서 이메일 주소 추출"""
        if not text:
            return None
        
        # 이메일 정규표현식
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        
        return emails[0] if emails else None
    
    def save_channel(self, channel_data):
        """
        채널 정보 저장 또는 업데이트
        
        Args:
            channel_data: 채널 정보 딕셔너리
        """
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            channel_id = channel_data.get('id')
            channel_name = channel_data.get('title')
            channel_handle = channel_data.get('handle')
            description = channel_data.get('description', '')
            
            stats = channel_data.get('stats', {})
            subscribers = stats.get('subscribers', 0)
            video_count = stats.get('videos', 0)
            view_count = stats.get('views', 0)
            
            # 이메일 추출
            email = self.extract_email(description)
            
            # 채널 URL
            if channel_handle:
                channel_url = f"https://www.youtube.com/{channel_handle}"
            else:
                channel_url = f"https://www.youtube.com/channel/{channel_id}"
            
            # 썸네일 URL
            thumbnail_url = channel_data.get('thumbnail')
            
            # 기존 채널 확인
            cursor.execute('SELECT id, search_count FROM channels WHERE channel_id = ?', (channel_id,))
            existing = cursor.fetchone()
            
            if existing:
                # 업데이트
                cursor.execute('''
                    UPDATE channels SET
                        channel_name = ?,
                        channel_handle = ?,
                        subscribers = ?,
                        video_count = ?,
                        view_count = ?,
                        description = ?,
                        email = ?,
                        channel_url = ?,
                        thumbnail_url = ?,
                        updated_at = CURRENT_TIMESTAMP,
                        search_count = search_count + 1
                    WHERE channel_id = ?
                ''', (
                    channel_name, channel_handle, subscribers, video_count,
                    view_count, description, email, channel_url, thumbnail_url,
                    channel_id
                ))
            else:
                # 새로 삽입
                cursor.execute('''
                    INSERT INTO channels (
                        channel_id, channel_name, channel_handle,
                        subscribers, video_count, view_count,
                        description, email, channel_url, thumbnail_url
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    channel_id, channel_name, channel_handle,
                    subscribers, video_count, view_count,
                    description, email, channel_url, thumbnail_url
                ))
            
            conn.commit()
            conn.close()
    
    def get_all_channels(self, limit=100, offset=0):
        """
        모든 채널 정보 조회
        
        Args:
            limit: 조회할 채널 수
            offset: 시작 위치
        
        Returns:
            list: 채널 정보 리스트
        """
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM channels
                ORDER BY updated_at DESC
                LIMIT ? OFFSET ?
            ''', (limit, offset))
            
            rows = cursor.fetchall()
            channels = [dict(row) for row in rows]
            
            conn.close()
            return channels
    
    def get_channels_with_email(self, limit=100):
        """이메일이 있는 채널만 조회"""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM channels
                WHERE email IS NOT NULL AND email != ''
                ORDER BY updated_at DESC
                LIMIT ?
            ''', (limit,))
            
            rows = cursor.fetchall()
            channels = [dict(row) for row in rows]
            
            conn.close()
            return channels
    
    def search_channels(self, query, limit=50):
        """채널 검색"""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            search_pattern = f'%{query}%'
            cursor.execute('''
                SELECT * FROM channels
                WHERE channel_name LIKE ? OR channel_handle LIKE ? OR email LIKE ?
                ORDER BY search_count DESC, updated_at DESC
                LIMIT ?
            ''', (search_pattern, search_pattern, search_pattern, limit))
            
            rows = cursor.fetchall()
            channels = [dict(row) for row in rows]
            
            conn.close()
            return channels
    
    def get_stats(self):
        """데이터베이스 통계"""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 총 채널 수
            cursor.execute('SELECT COUNT(*) FROM channels')
            total_channels = cursor.fetchone()[0]
            
            # 이메일이 있는 채널 수
            cursor.execute('SELECT COUNT(*) FROM channels WHERE email IS NOT NULL AND email != ""')
            channels_with_email = cursor.fetchone()[0]
            
            # 총 검색 횟수
            cursor.execute('SELECT SUM(search_count) FROM channels')
            total_searches = cursor.fetchone()[0] or 0
            
            # 오늘 추가된 채널 수
            cursor.execute('''
                SELECT COUNT(*) FROM channels 
                WHERE DATE(created_at) = DATE('now')
            ''')
            today_channels = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'total_channels': total_channels,
                'channels_with_email': channels_with_email,
                'total_searches': total_searches,
                'today_channels': today_channels
            }

# 전역 데이터베이스 인스턴스
channel_db = ChannelDatabase()

