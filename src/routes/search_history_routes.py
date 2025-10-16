"""
검색 기록 관리 라우트
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.search_history import SearchHistory, EmailSearchHistory, db
from middleware.auth import require_admin

search_history_bp = Blueprint('search_history', __name__, url_prefix='/api/search-history')

@search_history_bp.route('/channel', methods=['GET'])
@require_admin
def get_channel_searches():
    """채널 검색 기록 조회 (관리자 전용)"""
    try:
        limit = request.args.get('limit', 50, type=int)
        searches = SearchHistory.query.filter_by(search_type='channel')\
            .order_by(SearchHistory.created_at.desc())\
            .limit(limit).all()
        
        return jsonify({
            'searches': [s.to_dict() for s in searches]
        })
    except Exception as e:
        print(f"Get channel searches error: {e}")
        return jsonify({'error': '검색 기록 조회 실패'}), 500

@search_history_bp.route('/email', methods=['GET'])
@require_admin
def get_email_searches():
    """이메일 검색 기록 조회 (관리자 전용)"""
    try:
        limit = request.args.get('limit', 50, type=int)
        searches = EmailSearchHistory.query\
            .order_by(EmailSearchHistory.created_at.desc())\
            .limit(limit).all()
        
        return jsonify({
            'searches': [s.to_dict() for s in searches]
        })
    except Exception as e:
        print(f"Get email searches error: {e}")
        return jsonify({'error': '이메일 검색 기록 조회 실패'}), 500

@search_history_bp.route('/stats', methods=['GET'])
@require_admin
def get_search_stats():
    """검색 통계 (관리자 전용)"""
    try:
        total_channel_searches = SearchHistory.query.filter_by(search_type='channel').count()
        total_email_searches = EmailSearchHistory.query.count()
        successful_email_searches = EmailSearchHistory.query.filter_by(success=True).count()
        
        return jsonify({
            'total_channel_searches': total_channel_searches,
            'total_email_searches': total_email_searches,
            'successful_email_searches': successful_email_searches,
            'email_success_rate': round(successful_email_searches / total_email_searches * 100, 1) if total_email_searches > 0 else 0
        })
    except Exception as e:
        print(f"Get search stats error: {e}")
        return jsonify({'error': '통계 조회 실패'}), 500

# ============================================================
# 검색 기록 저장 함수 (다른 라우트에서 호출)
# ============================================================

def log_channel_search(query, result_data, ip_address, user_agent):
    """채널 검색 기록 저장"""
    try:
        import json
        history = SearchHistory(
            search_type='channel',
            query=query,
            result_data=json.dumps(result_data) if result_data else None,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.session.add(history)
        db.session.commit()
    except Exception as e:
        print(f"Log channel search error: {e}")
        db.session.rollback()

def log_email_search(channel_url, channel_name, email_found, success, ip_address):
    """이메일 검색 기록 저장"""
    try:
        history = EmailSearchHistory(
            channel_url=channel_url,
            channel_name=channel_name,
            email_found=email_found,
            success=success,
            ip_address=ip_address
        )
        db.session.add(history)
        db.session.commit()
    except Exception as e:
        print(f"Log email search error: {e}")
        db.session.rollback()

