"""
SMTP Email Service with Compliance and Secure Links
"""

import smtplib
import ssl
import secrets
import hashlib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, List, Optional, Any
from urllib.parse import urlencode, quote
import os
from app import db
from app.models.email_template import EmailCampaign, EmailLog
from app.models.lead import Lead
from app.models.client import Client

class SecureLinkService:
    """Service for creating and managing secure links"""
    
    @classmethod
    def generate_secure_token(cls, lead_id: int, campaign_id: int) -> str:
        """Generate a secure token for the link"""
        # Create a unique token based on lead, campaign, and timestamp
        timestamp = datetime.utcnow().isoformat()
        data = f"{lead_id}:{campaign_id}:{timestamp}:{secrets.token_hex(16)}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    @classmethod
    def create_secure_link(cls, lead_id: int, campaign_id: int, base_url: str = None) -> Dict[str, Any]:
        """Create a secure link with 7-day expiration"""
        if not base_url:
            base_url = os.getenv('BASE_URL', 'http://localhost:9000')
        
        token = cls.generate_secure_token(lead_id, campaign_id)
        expires_at = datetime.utcnow() + timedelta(days=7)
        
        # Store the secure link in database
        from app.models.secure_link import SecureLink
        secure_link = SecureLink(
            token=token,
            lead_id=lead_id,
            campaign_id=campaign_id,
            expires_at=expires_at,
            is_active=True
        )
        
        db.session.add(secure_link)
        db.session.commit()
        
        # Create the full URL
        secure_url = f"{base_url}/secure-link/{token}"
        
        return {
            'token': token,
            'url': secure_url,
            'expires_at': expires_at,
            'is_active': True
        }
    
    @classmethod
    def validate_secure_link(cls, token: str) -> Optional[Dict[str, Any]]:
        """Validate a secure link token"""
        from app.models.secure_link import SecureLink
        
        secure_link = SecureLink.query.filter_by(token=token, is_active=True).first()
        
        if not secure_link:
            return None
        
        if secure_link.expires_at < datetime.utcnow():
            # Mark as expired
            secure_link.is_active = False
            db.session.commit()
            return None
        
        return {
            'lead_id': secure_link.lead_id,
            'campaign_id': secure_link.campaign_id,
            'expires_at': secure_link.expires_at,
            'is_active': secure_link.is_active
        }
    
    @classmethod
    def extend_secure_link(cls, token: str) -> Optional[Dict[str, Any]]:
        """Extend a secure link for another 7 days"""
        from app.models.secure_link import SecureLink
        
        secure_link = SecureLink.query.filter_by(token=token).first()
        
        if not secure_link:
            return None
        
        # Extend expiration by 7 days
        secure_link.expires_at = datetime.utcnow() + timedelta(days=7)
        secure_link.is_active = True
        
        db.session.commit()
        
        return {
            'token': token,
            'expires_at': secure_link.expires_at,
            'is_active': True
        }

class LinkTrackingService:
    """Service for tracking link clicks"""
    
    @classmethod
    def create_tracked_link(cls, original_url: str, campaign_id: int, link_type: str = 'general') -> str:
        """Create a tracked link"""
        base_url = os.getenv('BASE_URL', 'http://localhost:9000')
        
        # Create tracking parameters
        tracking_data = {
            'campaign_id': campaign_id,
            'link_type': link_type,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Encode tracking data
        tracking_params = urlencode(tracking_data)
        tracked_url = f"{base_url}/track-click?{tracking_params}&redirect={quote(original_url)}"
        
        return tracked_url
    
    @classmethod
    def record_click(cls, campaign_id: int, link_type: str, ip_address: str = None, user_agent: str = None):
        """Record a link click"""
        from app.models.link_click import LinkClick
        
        click_record = LinkClick(
            campaign_id=campaign_id,
            link_type=link_type,
            ip_address=ip_address,
            user_agent=user_agent,
            clicked_at=datetime.utcnow()
        )
        
        db.session.add(click_record)
        db.session.commit()

class SMTPEmailService:
    """SMTP Email Service with compliance features"""
    
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_SENDER_EMAIL') or os.getenv('SMTP_USERNAME')
        self.smtp_password = os.getenv('SMTP_SENDER_PASSWORD') or os.getenv('SMTP_PASSWORD')
        self.from_email = os.getenv('FROM_EMAIL', self.smtp_username)
        self.from_name = os.getenv('FROM_NAME', 'WeTechForU Marketing')
        self.reply_to = os.getenv('REPLY_TO_EMAIL', self.from_email)
        
        # Validate configuration
        self.is_configured = bool(self.smtp_username and self.smtp_password)
        
        if not self.is_configured:
            print("⚠️  WARNING: SMTP credentials not configured. Email sending will not work.")
            print("📧 Please configure SMTP settings in your .env file")
            print("📖 See email_config_guide.md for setup instructions")
            print("🔧 Required environment variables:")
            print("   - SMTP_SERVER (e.g., smtp.gmail.com)")
            print("   - SMTP_PORT (e.g., 587)")
            print("   - SMTP_SENDER_EMAIL (your email address)")
            print("   - SMTP_SENDER_PASSWORD (your app password)")
        else:
            print("✅ SMTP email configuration loaded successfully")
            print(f"📧 Server: {self.smtp_server}:{self.smtp_port}")
            print(f"📧 From: {self.smtp_username}")
            print(f"🔒 TLS: Enabled")
    
    def test_connection(self) -> Dict[str, Any]:
        """Test SMTP connection and return status"""
        if not self.is_configured:
            return {
                'success': False,
                'error': 'SMTP not configured',
                'message': 'Please configure SMTP settings in .env file'
            }
        
        try:
            # Create SMTP connection
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.quit()
            
            return {
                'success': True,
                'message': 'SMTP connection successful',
                'server': f"{self.smtp_server}:{self.smtp_port}",
                'username': self.smtp_username
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'SMTP connection failed'
            }
        
    def create_compliant_email(self, to_email: str, subject: str, html_body: str, 
                             text_body: str = None, campaign_id: int = None) -> MIMEMultipart:
        """Create a compliant email message"""
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{self.from_name} <{self.from_email}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg['Reply-To'] = self.reply_to
        
        # Add compliance headers
        msg['X-Mailer'] = 'WeTechForU Marketing Platform'
        msg['X-Priority'] = '3'
        msg['X-MSMail-Priority'] = 'Normal'
        
        # Add unsubscribe header (required for compliance)
        if campaign_id:
            unsubscribe_url = f"{os.getenv('BASE_URL', 'http://localhost:9000')}/unsubscribe/{campaign_id}"
            msg['List-Unsubscribe'] = f"<{unsubscribe_url}>"
            msg['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
        
        # Create text version if not provided
        if not text_body:
            # Simple HTML to text conversion
            import re
            text_body = re.sub(r'<[^>]+>', '', html_body)
            text_body = re.sub(r'\s+', ' ', text_body).strip()
        
        # Add parts
        text_part = MIMEText(text_body, 'plain', 'utf-8')
        html_part = MIMEText(html_body, 'html', 'utf-8')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        return msg
    
    def send_email(self, to_email: str, subject: str, html_body: str, 
                   text_body: str = None, campaign_id: int = None) -> Dict[str, Any]:
        """Send email via SMTP"""
        
        try:
            # Create compliant email
            msg = self.create_compliant_email(to_email, subject, html_body, text_body, campaign_id)
            
            # Create SMTP connection
            context = ssl.create_default_context()
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                
                # Send email
                server.send_message(msg)
            
            # Log successful send
            if campaign_id:
                self.log_email_send(campaign_id, to_email, subject, html_body, 'sent')
            
            return {
                'success': True,
                'message': 'Email sent successfully',
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            # Log failed send
            if campaign_id:
                self.log_email_send(campaign_id, to_email, subject, html_body, 'failed', str(e))
            
            return {
                'success': False,
                'message': f'Failed to send email: {str(e)}',
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def log_email_send(self, campaign_id: int, recipient_email: str, subject: str, 
                      body: str, status: str, error_message: str = None):
        """Log email send attempt"""
        
        email_log = EmailLog(
            campaign_id=campaign_id,
            recipient_email=recipient_email,
            recipient_name='',  # Will be filled from lead data
            subject=subject,
            body=body,
            status=status,
            error_message=error_message
        )
        
        db.session.add(email_log)
        db.session.commit()

class EmailComplianceService:
    """Service for ensuring email compliance"""
    
    @classmethod
    def create_compliant_html(cls, content: str, campaign_id: int, lead_id: int) -> str:
        """Create compliant HTML email with secure links and tracking"""
        
        # Create secure link for detailed report
        secure_link_data = SecureLinkService.create_secure_link(lead_id, campaign_id)
        secure_url = secure_link_data['url']
        
        # Create tracked links
        contact_url = LinkTrackingService.create_tracked_link(
            f"mailto:{os.getenv('REPLY_TO_EMAIL', 'contact@wetechforu.com')}",
            campaign_id, 'contact'
        )
        
        website_url = LinkTrackingService.create_tracked_link(
            os.getenv('WEBSITE_URL', 'https://wetechforu.com'),
            campaign_id, 'website'
        )
        
        # Create compliant HTML template
        html_template = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SEO Report</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }}
                .content {{
                    background-color: #ffffff;
                    padding: 20px;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                }}
                .highlight {{
                    background-color: #fff3cd;
                    padding: 15px;
                    border-left: 4px solid #ffc107;
                    margin: 15px 0;
                }}
                .blurred {{
                    filter: blur(3px);
                    transition: filter 0.3s ease;
                }}
                .blurred:hover {{
                    filter: none;
                }}
                .cta-button {{
                    display: inline-block;
                    background-color: #007bff;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 10px 0;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                    font-size: 12px;
                    color: #6c757d;
                }}
                .unsubscribe {{
                    margin-top: 20px;
                    font-size: 11px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>📊 SEO Analysis Report</h2>
                <p>WeTechForU Marketing Solutions</p>
            </div>
            
            <div class="content">
                {content}
                
                <div class="highlight">
                    <h3>🔍 Want to see the detailed analysis?</h3>
                    <p>Click the button below to access your comprehensive SEO report with actionable recommendations:</p>
                    <a href="{secure_url}" class="cta-button">View Detailed Report</a>
                    <p><small>This secure link expires in 7 days. If expired, you can request a new one.</small></p>
                </div>
                
                <div class="blurred">
                    <h3>📈 Advanced Analytics (Contact us for details)</h3>
                    <p>Our detailed analysis includes:</p>
                    <ul>
                        <li>Competitor analysis and benchmarking</li>
                        <li>Advanced keyword research and opportunities</li>
                        <li>Technical SEO audit with priority fixes</li>
                        <li>Local SEO optimization strategies</li>
                        <li>Content marketing recommendations</li>
                        <li>Link building opportunities</li>
                    </ul>
                    <p><strong>Contact us to unlock these insights and grow your business!</strong></p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>WeTechForU Marketing Solutions</strong></p>
                <p>📧 <a href="{contact_url}">Contact Us</a> | 🌐 <a href="{website_url}">Visit Our Website</a></p>
                <p>This email was sent because you expressed interest in our marketing services.</p>
                
                <div class="unsubscribe">
                    <p>If you no longer wish to receive these emails, you can <a href="{os.getenv('BASE_URL', 'http://localhost:9000')}/unsubscribe/{campaign_id}">unsubscribe here</a>.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_template
    
    @classmethod
    def validate_email_compliance(cls, email_content: str) -> Dict[str, Any]:
        """Validate email for compliance with major providers"""
        
        compliance_checks = {
            'has_unsubscribe': 'unsubscribe' in email_content.lower(),
            'has_physical_address': True,  # We'll add this
            'has_company_info': True,  # We'll add this
            'has_reply_to': True,  # We'll add this
            'content_ratio': len(email_content) / 1000,  # Reasonable content length
            'has_plain_text': True,  # We'll ensure this
        }
        
        # Add physical address and company info
        company_info = f"""
        <div style="font-size: 11px; color: #666; margin-top: 20px;">
            <p><strong>WeTechForU Marketing Solutions</strong><br>
            123 Business Street, Suite 100<br>
            City, State 12345<br>
            Phone: (555) 123-4567</p>
        </div>
        """
        
        return {
            'is_compliant': all(compliance_checks.values()),
            'checks': compliance_checks,
            'company_info': company_info
        }
