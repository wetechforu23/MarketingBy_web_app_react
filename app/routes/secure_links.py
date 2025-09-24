"""
Secure Link Routes for Email Campaigns
"""

from flask import Blueprint, render_template, request, redirect, url_for, jsonify, abort
from flask_login import login_required
from datetime import datetime, timedelta
from app import db
from app.models.secure_link import SecureLink, LinkClick, UnsubscribeRecord
from app.models.lead import Lead
from app.models.email_template import EmailCampaign, EmailLog
import jwt
import os
import re

secure_links_bp = Blueprint('secure_links', __name__)

@secure_links_bp.route('/track/<token>')
def track_link(token):
    """Endpoint for tracking secure link clicks and displaying content."""
    secure_link = SecureLink.query.filter_by(token=token).first()

    if not secure_link:
        return render_template('secure_link_expired.html', message="This link is invalid or does not exist."), 404

    # Log the click
    click = LinkClick(
        secure_link_id=secure_link.id,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string
    )
    db.session.add(click)
    db.session.commit()

    if secure_link.is_expired():
        return render_template('secure_link_expired.html', message="This link has expired."), 410

    # Decode token to get original URL and other data
    try:
        payload = jwt.decode(secure_link.token, os.getenv('SECRET_KEY', 'super-secret-key'), algorithms=['HS256'])
        original_url = payload.get('original_url')
        lead_id = payload.get('lead_id')
        campaign_id = payload.get('campaign_id')

        if not original_url:
            return render_template('secure_link_expired.html', message="Secure link content not found."), 404

        # If the original URL is an internal SEO report, render it with lead data
        if 'seo-report' in original_url and lead_id:
            lead = Lead.query.get(lead_id)
            if not lead:
                return render_template('secure_link_expired.html', message="Associated lead not found."), 404
            
            # Get the latest SEO audit for the lead
            from app.models.seo_audit import SEOAudit
            seo_audit = SEOAudit.query.filter_by(lead_id=lead.id).order_by(SEOAudit.created_at.desc()).first()
            
            if seo_audit:
                # Render the SEO report template with lead and audit data
                return render_template('secure_link_content.html', 
                                    lead=lead, 
                                    seo_audit=seo_audit, 
                                    secure_link=secure_link,
                                    full_report_access=False)  # Default to blurred
            else:
                return render_template('secure_link_expired.html', message="Associated SEO report not found."), 404
        else:
            # For external links, redirect directly
            return redirect(original_url)

    except jwt.ExpiredSignatureError:
        return render_template('secure_link_expired.html', message="This link has expired."), 410
    except jwt.InvalidTokenError:
        return render_template('secure_link_expired.html', message="This link is invalid or has been tampered with."), 400
    except Exception as e:
        return render_template('secure_link_expired.html', message="An unexpected error occurred."), 500

@secure_links_bp.route('/unsubscribe/<token>')
def unsubscribe(token):
    """Endpoint for handling unsubscribe requests."""
    try:
        # For now, we'll use a simple approach - just add the email to unsubscribe list
        # In a real system, you'd want to verify the token more robustly
        
        # Get email from request parameters or form
        email = request.args.get('email') or request.form.get('email')
        
        if not email:
            return render_template('unsubscribe_form.html', token=token)
        
        # Add to unsubscribe list
        unsubscribe_record = UnsubscribeRecord(email=email)
        db.session.add(unsubscribe_record)
        db.session.commit()
        
        return render_template('unsubscribe_success.html', email=email)
        
    except Exception as e:
        return render_template('unsubscribe_error.html', error=str(e))

@secure_links_bp.route('/secure-link/<token>/extend', methods=['POST'])
def extend_secure_link(token):
    """Extend a secure link for another 7 days"""
    try:
        secure_link = SecureLink.query.filter_by(token=token).first()
        
        if not secure_link:
            return jsonify({
                'success': False,
                'message': 'Link not found'
            }), 404
        
        # Extend the link by 7 days
        secure_link.expires_at = datetime.utcnow() + timedelta(days=7)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Link extended successfully',
            'expires_at': secure_link.expires_at.isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@secure_links_bp.route('/secure-link/<token>/stats')
@login_required
def link_stats(token):
    """Get statistics for a secure link (admin only)"""
    try:
        secure_link = SecureLink.query.filter_by(token=token).first()
        
        if not secure_link:
            return jsonify({
                'success': False,
                'message': 'Link not found'
            }), 404
        
        # Get click statistics
        clicks = LinkClick.query.filter_by(secure_link_id=secure_link.id).all()
        
        stats = {
            'total_clicks': len(clicks),
            'unique_ips': len(set(click.ip_address for click in clicks if click.ip_address)),
            'created_at': secure_link.created_at.isoformat(),
            'expires_at': secure_link.expires_at.isoformat(),
            'is_expired': secure_link.is_expired(),
            'clicks': [
                {
                    'clicked_at': click.clicked_at.isoformat(),
                    'ip_address': click.ip_address,
                    'user_agent': click.user_agent
                }
                for click in clicks
            ]
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500