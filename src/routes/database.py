"""
채널 데이터베이스 조회 API (관리자 전용)
"""

from flask import Blueprint, jsonify, request
from src.models.channel_database import channel_db
from src.middleware.auth import require_admin

database_bp = Blueprint('database', __name__)

@database_bp.route('/channels', methods=['GET'])
@require_admin
def get_all_channels():
    """모든 채널 조회 (관리자 전용)"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        channels = channel_db.get_all_channels(limit=limit, offset=offset)
        
        return jsonify({
            'channels': channels,
            'count': len(channels)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/channels/with-email', methods=['GET'])
@require_admin
def get_channels_with_email():
    """이메일이 있는 채널만 조회 (관리자 전용)"""
    try:
        limit = request.args.get('limit', 100, type=int)
        
        channels = channel_db.get_channels_with_email(limit=limit)
        
        return jsonify({
            'channels': channels,
            'count': len(channels)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/channels/search', methods=['GET'])
@require_admin
def search_channels():
    """채널 검색 (관리자 전용)"""
    try:
        query = request.args.get('q', '')
        limit = request.args.get('limit', 50, type=int)
        
        if not query:
            return jsonify({'error': 'Query parameter required'}), 400
        
        channels = channel_db.search_channels(query, limit=limit)
        
        return jsonify({
            'channels': channels,
            'count': len(channels)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/channels/stats', methods=['GET'])
@require_admin
def get_database_stats():
    """데이터베이스 통계 (관리자 전용)"""
    try:
        stats = channel_db.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/channels/export', methods=['GET'])
@require_admin
def export_channels():
    """채널 데이터 CSV 내보내기 (관리자 전용)"""
    try:
        import csv
        import io
        from flask import make_response
        
        channels = channel_db.get_all_channels(limit=10000)
        
        # CSV 생성
        output = io.StringIO()
        writer = csv.writer(output)
        
        # 헤더
        writer.writerow([
            'Channel ID', 'Channel Name', 'Handle', 'Email',
            'Subscribers', 'Videos', 'Views', 'Channel URL',
            'Search Count', 'Created At', 'Updated At'
        ])
        
        # 데이터
        for channel in channels:
            writer.writerow([
                channel['channel_id'],
                channel['channel_name'],
                channel['channel_handle'] or '',
                channel['email'] or '',
                channel['subscribers'],
                channel['video_count'],
                channel['view_count'],
                channel['channel_url'],
                channel['search_count'],
                channel['created_at'],
                channel['updated_at']
            ])
        
        # 응답 생성
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = 'attachment; filename=channels.csv'
        
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

