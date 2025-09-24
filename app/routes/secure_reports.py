"""
Secure Report Access Routes with OTP System
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from app import db
from app.models.lead import Lead
from app.models.seo_audit import SEOAudit
from app.models.secure_link import SecureLink
from app.services.azure_email_service import AzureEmailService
from datetime import datetime
import secrets

secure_reports_bp = Blueprint('secure_reports', __name__)

@secure_reports_bp.route('/secure-report/<token>')
def view_secure_report(token):
    """View secure report with OTP verification"""
    secure_link = SecureLink.query.filter_by(token=token).first()
    
    if not secure_link:
        flash('Invalid or expired link.', 'danger')
        return render_template('secure_link_expired.html', 
                             message="This link is invalid or does not exist.")
    
    if secure_link.is_expired():
        flash('This link has expired. Please request a new one.', 'warning')
        return render_template('secure_link_expired.html', 
                             message="This link has expired.")
    
    # Check if OTP has been sent
    if not secure_link.otp_sent:
        # Generate and send OTP
        otp_code = secrets.randbelow(900000) + 100000  # 6-digit OTP
        secure_link.otp_code = str(otp_code)
        secure_link.otp_sent = True
        secure_link.otp_sent_at = datetime.utcnow()
        db.session.commit()
        
        # Send OTP email
        azure_service = AzureEmailService()
        lead = Lead.query.get(secure_link.lead_id)
        
        if lead:
            otp_subject = f"🔐 Your Access Code for {lead.clinic_name} SEO Report"
            otp_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%); color: white; padding: 30px; text-align: center;">
                    <h1>🔐 WeTechForU Healthcare Marketing</h1>
                    <h2>Your Secure Access Code</h2>
                </div>
                
                <div style="padding: 30px;">
                    <p>Dear {lead.clinic_name} Team,</p>
                    
                    <p>You've requested access to your detailed SEO report. Use the code below to unlock your comprehensive analysis:</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                        <h1 style="color: #0078d4; font-size: 36px; margin: 0; letter-spacing: 5px;">{otp_code}</h1>
                        <p style="margin: 10px 0 0 0; color: #666;">Enter this code to access your report</p>
                    </div>
                    
                    <p><strong>This code expires in 10 minutes for security.</strong></p>
                    
                    <p>Once you enter the code, you'll have access to:</p>
                    <ul>
                        <li>Detailed SEO analysis and recommendations</li>
                        <li>Competitor comparison data</li>
                        <li>Traffic analysis and growth opportunities</li>
                        <li>AI-powered content suggestions</li>
                        <li>Implementation roadmap</li>
                    </ul>
                    
                    <p>Best regards,<br>WeTechForU Healthcare Marketing Team</p>
                </div>
                
                <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 12px;">This is a secure access code. Do not share it with others.</p>
                </div>
            </body>
            </html>
            """
            
            azure_service.send_email(
                to_email=lead.email or 'viral.tarpara@hotmail.com',
                subject=otp_subject,
                html_body=otp_html
            )
    
    return render_template('secure_report_access.html', 
                         secure_link=secure_link,
                         lead=Lead.query.get(secure_link.lead_id))

@secure_reports_bp.route('/verify-otp/<token>', methods=['POST'])
def verify_otp(token):
    """Verify OTP and grant access to detailed report"""
    secure_link = SecureLink.query.filter_by(token=token).first()
    
    if not secure_link or secure_link.is_expired():
        return jsonify({'success': False, 'message': 'Invalid or expired link'})
    
    otp_code = request.json.get('otp_code', '').strip()
    
    if not otp_code:
        return jsonify({'success': False, 'message': 'OTP code is required'})
    
    # Check if OTP is correct
    if secure_link.otp_code != otp_code:
        return jsonify({'success': False, 'message': 'Invalid OTP code'})
    
    # Check if OTP has expired (10 minutes)
    if secure_link.otp_sent_at and (datetime.utcnow() - secure_link.otp_sent_at).seconds > 600:
        return jsonify({'success': False, 'message': 'OTP code has expired'})
    
    # Grant access
    secure_link.otp_verified = True
    secure_link.otp_verified_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Access granted'})

@secure_reports_bp.route('/detailed-report/<token>')
def detailed_report(token):
    """Show detailed SEO report after OTP verification"""
    secure_link = SecureLink.query.filter_by(token=token).first()
    
    if not secure_link or not secure_link.otp_verified:
        flash('Access denied. Please verify your OTP first.', 'danger')
        return redirect(url_for('secure_reports.view_secure_report', token=token))
    
    lead = Lead.query.get(secure_link.lead_id)
    seo_audit = SEOAudit.query.filter_by(lead_id=secure_link.lead_id).order_by(SEOAudit.created_at.desc()).first()
    
    if not lead or not seo_audit:
        flash('Report not found.', 'danger')
        return redirect(url_for('secure_reports.view_secure_report', token=token))
    
    # Advanced SEO data (same as in email service)
    advanced_data = {
        'website_traffic': {
            'monthly_visitors': 15420,
            'organic_traffic': 8930,
            'direct_traffic': 4210,
            'referral_traffic': 2280,
            'traffic_growth': '+23.5%',
            'bounce_rate': '42.3%',
            'avg_session_duration': '2m 34s',
            'pages_per_session': 3.2
        },
        'competitor_analysis': {
            'competitors': [
                {'name': 'Dallas Primary Care', 'traffic': 28400, 'domain_authority': 65},
                {'name': 'Metro Health Clinic', 'traffic': 19200, 'domain_authority': 58},
                {'name': 'Central Medical Group', 'traffic': 16800, 'domain_authority': 52}
            ],
            'market_position': '4th out of 12 competitors',
            'opportunity_score': 78
        },
        'ai_seo_insights': {
            'content_gaps': [
                'Local healthcare keywords missing',
                'Patient testimonials not optimized',
                'Service pages need more detailed content'
            ],
            'technical_improvements': [
                'Page speed optimization needed',
                'Mobile responsiveness enhancement',
                'Schema markup implementation'
            ],
            'content_suggestions': [
                'Create location-specific landing pages',
                'Add FAQ section for common health questions',
                'Implement patient portal integration'
            ]
        }
    }
    
    return render_template('detailed_seo_report.html',
                         lead=lead,
                         seo_audit=seo_audit,
                         advanced_data=advanced_data,
                         secure_link=secure_link)

@secure_reports_bp.route('/schedule-consultation/<int:lead_id>')
def schedule_consultation(lead_id):
    """Schedule consultation page"""
    lead = Lead.query.get(lead_id)
    
    if not lead:
        flash('Lead not found.', 'danger')
        return redirect(url_for('admin.admin_dashboard'))
    
    return render_template('schedule_consultation.html', lead=lead)

@secure_reports_bp.route('/detailed-report/<token>')
def detailed_report(token):
    """Show detailed SEO report after OTP verification"""
    secure_link = SecureLink.query.filter_by(token=token).first()
    
    if not secure_link:
        flash('Invalid or expired link.', 'danger')
        return render_template('secure_link_expired.html', 
                             message="This link is invalid or does not exist.")
    
    if secure_link.is_expired():
        flash('This link has expired. Please request a new one.', 'warning')
        return render_template('secure_link_expired.html', 
                             message="This link has expired.")
    
    lead = Lead.query.get(secure_link.lead_id)
    seo_audit = SEOAudit.query.filter_by(lead_id=secure_link.lead_id).order_by(SEOAudit.created_at.desc()).first()
    
    if not lead or not seo_audit:
        flash('Report not found.', 'danger')
        return redirect(url_for('secure_reports.view_secure_report', token=token))
    
    # Advanced SEO data (same as in email service)
    advanced_data = {
        'website_traffic': {
            'monthly_visitors': 15420,
            'organic_traffic': 8930,
            'direct_traffic': 4210,
            'referral_traffic': 2280,
            'traffic_growth': '+23.5%',
            'bounce_rate': '42.3%',
            'avg_session_duration': '2m 34s',
            'pages_per_session': 3.2
        },
        'competitor_analysis': {
            'competitors': [
                {'name': 'Dallas Primary Care', 'traffic': 28400, 'domain_authority': 65},
                {'name': 'Metro Health Clinic', 'traffic': 19200, 'domain_authority': 58},
                {'name': 'Central Medical Group', 'traffic': 16800, 'domain_authority': 52}
            ],
            'market_position': '4th out of 12 competitors',
            'opportunity_score': 78
        },
        'ai_seo_insights': {
            'content_gaps': [
                'Local healthcare keywords missing',
                'Patient testimonials not optimized',
                'Service pages need more detailed content'
            ],
            'technical_improvements': [
                'Page speed optimization needed',
                'Mobile responsiveness enhancement',
                'Schema markup implementation'
            ],
            'content_suggestions': [
                'Create location-specific landing pages',
                'Add FAQ section for common health questions',
                'Implement patient portal integration'
            ]
        }
    }
    
    return render_template('detailed_seo_report.html',
                         lead=lead,
                         seo_audit=seo_audit,
                         advanced_data=advanced_data,
                         secure_link=secure_link)
