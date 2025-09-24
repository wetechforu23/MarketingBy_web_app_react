"""
Email Tracking Routes for Opens, Clicks, and Analytics
"""

from flask import Blueprint, request, redirect, url_for, jsonify, render_template
from app import db
from app.models.email_tracking import EmailDelivery, EmailEngagement
from app.services.email_tracking_service import EmailTrackingService
from datetime import datetime
import urllib.parse

email_tracking_bp = Blueprint('email_tracking', __name__)

@email_tracking_bp.route('/track/email-open/<int:delivery_id>')
def track_email_open(delivery_id):
    """Track email open with 1x1 pixel"""
    
    # Get client IP and user agent
    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
    user_agent = request.headers.get('User-Agent')
    
    # Record the open
    tracking_service = EmailTrackingService()
    tracking_service.record_email_open(delivery_id, ip_address, user_agent)
    
    # Return 1x1 transparent pixel
    pixel_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82'
    
    from flask import Response
    return Response(pixel_data, mimetype='image/png')

@email_tracking_bp.route('/track/email-click/<int:delivery_id>')
def track_email_click(delivery_id):
    """Track email click and redirect to original URL"""
    
    # Get parameters
    original_url = request.args.get('url', '')
    link_text = request.args.get('text', '')
    
    if not original_url:
        return redirect(url_for('admin.admin_dashboard'))
    
    # Get client IP and user agent
    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
    user_agent = request.headers.get('User-Agent')
    
    # Record the click
    tracking_service = EmailTrackingService()
    tracking_service.record_email_click(delivery_id, original_url, link_text, ip_address, user_agent)
    
    # Redirect to original URL
    return redirect(original_url)

@email_tracking_bp.route('/admin/email-analytics')
def email_analytics():
    """Email analytics dashboard"""
    
    # Get all email deliveries with engagement data
    deliveries = db.session.query(EmailDelivery).join(EmailEngagement).all()
    
    # Calculate overall metrics
    total_emails = len(deliveries)
    total_opens = sum(len(delivery.opens) for delivery in deliveries)
    total_clicks = sum(len(delivery.clicks) for delivery in deliveries)
    
    # Get recent deliveries
    recent_deliveries = EmailDelivery.query.order_by(EmailDelivery.sent_at.desc()).limit(10).all()
    
    return render_template('admin/email_analytics.html',
                         deliveries=deliveries,
                         recent_deliveries=recent_deliveries,
                         total_emails=total_emails,
                         total_opens=total_opens,
                         total_clicks=total_clicks)

@email_tracking_bp.route('/admin/email-analytics/<int:delivery_id>')
def email_delivery_details(delivery_id):
    """Detailed view of specific email delivery"""
    
    tracking_service = EmailTrackingService()
    details = tracking_service.get_detailed_engagement(delivery_id)
    
    if not details:
        return redirect(url_for('email_tracking.email_analytics'))
    
    return render_template('admin/email_delivery_details.html', **details)

@email_tracking_bp.route('/admin/lead-engagement/<int:lead_id>')
def lead_engagement(lead_id):
    """Lead engagement analytics"""
    
    tracking_service = EmailTrackingService()
    summary = tracking_service.get_engagement_summary(lead_id)
    
    return render_template('admin/lead_engagement.html',
                         lead_id=lead_id,
                         summary=summary)

@email_tracking_bp.route('/api/email-stats')
def email_stats_api():
    """API endpoint for email statistics"""
    
    # Get basic stats
    total_deliveries = EmailDelivery.query.count()
    total_opens = db.session.query(EmailEngagement).filter_by(is_opened=True).count()
    total_clicks = db.session.query(EmailEngagement).filter_by(is_clicked=True).count()
    total_secure_access = db.session.query(EmailEngagement).filter_by(is_secure_link_accessed=True).count()
    total_otp_verified = db.session.query(EmailEngagement).filter_by(is_otp_verified=True).count()
    
    # Calculate rates
    open_rate = (total_opens / total_deliveries * 100) if total_deliveries > 0 else 0
    click_rate = (total_clicks / total_deliveries * 100) if total_deliveries > 0 else 0
    conversion_rate = (total_otp_verified / total_deliveries * 100) if total_deliveries > 0 else 0
    
    return jsonify({
        'total_deliveries': total_deliveries,
        'total_opens': total_opens,
        'total_clicks': total_clicks,
        'total_secure_access': total_secure_access,
        'total_otp_verified': total_otp_verified,
        'open_rate': round(open_rate, 2),
        'click_rate': round(click_rate, 2),
        'conversion_rate': round(conversion_rate, 2)
    })

@email_tracking_bp.route('/api/lead-engagement/<int:lead_id>')
def lead_engagement_api(lead_id):
    """API endpoint for lead engagement data"""
    
    tracking_service = EmailTrackingService()
    summary = tracking_service.get_engagement_summary(lead_id)
    
    return jsonify(summary)
