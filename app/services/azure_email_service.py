"""
Azure App Registration Email Service
Supports Microsoft 365 business email with Azure app authentication
"""

import smtplib
import ssl
import secrets
import hashlib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional, Any
import os
import requests
import json
from app import db
from app.models.email_template import EmailCampaign, EmailLog
from app.models.lead import Lead
from app.models.client import Client

class AzureEmailService:
    """Azure App Registration Email Service for Microsoft 365"""
    
    def __init__(self):
        # Azure App Registration credentials
        self.client_id = os.getenv('AZURE_CLIENT_ID')
        self.client_secret = os.getenv('AZURE_CLIENT_SECRET')
        self.tenant_id = os.getenv('AZURE_TENANT_ID')
        
        # Email configuration
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp-mail.outlook.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.sender_email = os.getenv('SMTP_SENDER_EMAIL')
        self.from_name = os.getenv('FROM_NAME', 'WeTechForU Marketing')
        self.reply_to = os.getenv('REPLY_TO_EMAIL', self.sender_email)
        
        # Email alias configuration
        self.display_email = os.getenv('COMPANY_EMAIL', self.sender_email)  # What customers see
        self.actual_sender = self.sender_email  # What we actually send from
        self.reply_to_email = os.getenv('REPLY_TO_EMAIL', self.sender_email)  # Where replies go
        
        # Healthcare-specific configuration
        self.company_name = os.getenv('COMPANY_NAME', 'WeTechForU Healthcare Marketing')
        self.from_name = os.getenv('FROM_NAME', 'WeTechForU Healthcare Team')
        
        # Validate configuration
        self.is_configured = bool(
            self.client_id and 
            self.client_secret and 
            self.tenant_id and 
            self.sender_email
        )
        
        if not self.is_configured:
            print("⚠️  WARNING: Azure email credentials not configured!")
            print("📧 Please configure Azure app registration in your .env file")
            print("🔧 Required environment variables:")
            print("   - AZURE_CLIENT_ID (from Azure app registration)")
            print("   - AZURE_CLIENT_SECRET (from Azure app registration)")
            print("   - AZURE_TENANT_ID (your organization tenant ID)")
            print("   - SMTP_SENDER_EMAIL (your business email)")
        else:
            print("✅ Azure email configuration loaded successfully")
            print(f"📧 Server: {self.smtp_server}:{self.smtp_port}")
            print(f"📧 From: {self.sender_email}")
            print(f"🔒 Azure App: {self.client_id}")
    
    def get_access_token(self) -> Optional[str]:
        """Get access token from Azure using client credentials flow"""
        if not self.is_configured:
            return None
        
        try:
            # Microsoft Graph API token endpoint
            token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
            
            # Token request data
            token_data = {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'scope': 'https://graph.microsoft.com/.default',
                'grant_type': 'client_credentials'
            }
            
            # Request token
            response = requests.post(token_url, data=token_data)
            response.raise_for_status()
            
            token_response = response.json()
            access_token = token_response.get('access_token')
            
            if access_token:
                print("✅ Azure access token obtained successfully")
                return access_token
            else:
                print("❌ Failed to get access token from Azure")
                return None
                
        except Exception as e:
            print(f"❌ Error getting Azure access token: {e}")
            return None
    
    def test_connection(self) -> Dict[str, Any]:
        """Test Azure email connection"""
        if not self.is_configured:
            return {
                'success': False,
                'error': 'Azure credentials not configured',
                'message': 'Please configure Azure app registration in .env file'
            }
        
        try:
            # Test 1: Get access token
            access_token = self.get_access_token()
            if not access_token:
                return {
                    'success': False,
                    'error': 'Failed to get Azure access token',
                    'message': 'Check your Azure app registration credentials'
                }
            
            # Test 2: Test SMTP connection
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            
            # For Azure app authentication, we might need to use the access token
            # or configure the app to allow SMTP authentication
            server.quit()
            
            return {
                'success': True,
                'message': 'Azure email connection successful',
                'server': f"{self.smtp_server}:{self.smtp_port}",
                'sender': self.sender_email,
                'azure_app': self.client_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Azure email connection failed'
            }
    
    def create_compliant_email(self, to_email: str, subject: str, html_body: str, 
                             text_body: str = None, campaign_id: int = None) -> MIMEMultipart:
        """Create a compliant email message for Azure with alias support"""
        
        # Create message
        msg = MIMEMultipart('alternative')
        
        # Use display email (alias) for what customers see
        msg['From'] = f"{self.from_name} <{self.display_email}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Set reply-to to your actual email for responses
        msg['Reply-To'] = self.reply_to_email
        
        # Add return-path for delivery issues
        msg['Return-Path'] = self.actual_sender
        
        # Healthcare-specific headers
        msg['X-Healthcare-Platform'] = 'WeTechForU Healthcare Marketing'
        msg['X-Service-Type'] = 'Healthcare Marketing Automation'
        
        # Add Azure-specific headers
        msg['X-Mailer'] = 'WeTechForU Marketing Platform (Azure)'
        msg['X-Priority'] = '3'
        msg['X-MSMail-Priority'] = 'Normal'
        msg['X-Azure-App'] = self.client_id
        
        # Add unsubscribe header (required for compliance)
        if campaign_id:
            unsubscribe_url = f"{os.getenv('BASE_URL', 'http://localhost:9000')}/unsubscribe/{campaign_id}"
            msg['List-Unsubscribe'] = f"<{unsubscribe_url}>"
            msg['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
        
        # Create text version if not provided
        if not text_body:
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
        """Send email via Azure SMTP"""
        
        try:
            # Create compliant email
            msg = self.create_compliant_email(to_email, subject, html_body, text_body, campaign_id)
            
            # Create SMTP connection
            context = ssl.create_default_context()
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                
                # For Azure app authentication, you might need to:
                # 1. Use the access token as password
                # 2. Or configure the app to allow SMTP authentication
                # 3. Or use Microsoft Graph API to send emails
                
                # Option 1: Try with access token (if supported)
                access_token = self.get_access_token()
                if access_token:
                    try:
                        # Some Azure configurations allow using access token as password
                        # Use actual sender email for authentication
                        server.login(self.actual_sender, access_token)
                    except:
                        # Fallback to regular password if configured
                        password = os.getenv('SMTP_SENDER_PASSWORD')
                        if password:
                            server.login(self.actual_sender, password)
                        else:
                            raise Exception("No authentication method available")
                else:
                    # Use regular password
                    password = os.getenv('SMTP_SENDER_PASSWORD')
                    if not password:
                        raise Exception("No password configured for SMTP authentication")
                    # Use actual sender email for authentication
                    server.login(self.actual_sender, password)
                
                # Send email
                server.send_message(msg)
            
            # Log successful send
            if campaign_id:
                self.log_email_send(campaign_id, to_email, subject, html_body, 'sent')
            
            return {
                'success': True,
                'message': 'Email sent successfully via Azure',
                'timestamp': datetime.utcnow().isoformat(),
                'method': 'azure_smtp'
            }
            
        except Exception as e:
            # Log failed send
            if campaign_id:
                self.log_email_send(campaign_id, to_email, subject, html_body, 'failed', str(e))
            
            return {
                'success': False,
                'message': f'Failed to send email via Azure: {str(e)}',
                'timestamp': datetime.utcnow().isoformat(),
                'method': 'azure_smtp'
            }
    
    def send_email_via_graph_api(self, to_email: str, subject: str, html_body: str, 
                                text_body: str = None, campaign_id: int = None) -> Dict[str, Any]:
        """Send email via Microsoft Graph API (alternative method)"""
        
        try:
            # Get access token
            access_token = self.get_access_token()
            if not access_token:
                return {
                    'success': False,
                    'message': 'Failed to get Azure access token'
                }
            
            # Microsoft Graph API endpoint
            graph_url = f"https://graph.microsoft.com/v1.0/users/{self.sender_email}/sendMail"
            
            # Create email message
            email_data = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": "HTML",
                        "content": html_body
                    },
                    "toRecipients": [
                        {
                            "emailAddress": {
                                "address": to_email
                            }
                        }
                    ],
                    "from": {
                        "emailAddress": {
                            "address": self.sender_email
                        }
                    }
                }
            }
            
            # Add text body if provided
            if text_body:
                email_data["message"]["body"]["content"] = f"<html><body>{html_body}</body></html>"
            
            # Send email via Graph API
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(graph_url, headers=headers, json=email_data)
            response.raise_for_status()
            
            # Log successful send
            if campaign_id:
                self.log_email_send(campaign_id, to_email, subject, html_body, 'sent')
            
            return {
                'success': True,
                'message': 'Email sent successfully via Microsoft Graph API',
                'timestamp': datetime.utcnow().isoformat(),
                'method': 'graph_api'
            }
            
        except Exception as e:
            # Log failed send
            if campaign_id:
                self.log_email_send(campaign_id, to_email, subject, html_body, 'failed', str(e))
            
            return {
                'success': False,
                'message': f'Failed to send email via Graph API: {str(e)}',
                'timestamp': datetime.utcnow().isoformat(),
                'method': 'graph_api'
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

class AzureEmailComplianceService:
    """Azure-specific email compliance service"""
    
    @classmethod
    def create_azure_compliant_html(cls, content: str, campaign_id: int, lead_id: int) -> str:
        """Create Azure-compliant HTML email"""
        
        # Create secure link for detailed report
        from app.services.email_smtp_service import SecureLinkService
        secure_link_data = SecureLinkService.create_secure_link(lead_id, campaign_id)
        secure_url = secure_link_data['url']
        
        # Azure-compliant HTML template
        html_template = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SEO Report - WeTechForU</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }}
                .header {{
                    background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                }}
                .content {{
                    background-color: #ffffff;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                .highlight {{
                    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                    padding: 20px;
                    border-left: 4px solid #ffc107;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .cta-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 15px 0;
                    font-weight: bold;
                    transition: transform 0.2s ease;
                }}
                .cta-button:hover {{
                    transform: translateY(-2px);
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e9ecef;
                    font-size: 12px;
                    color: #6c757d;
                    text-align: center;
                }}
                .azure-badge {{
                    background-color: #0078d4;
                    color: white;
                    padding: 5px 10px;
                    border-radius: 3px;
                    font-size: 10px;
                    margin-left: 10px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>📊 SEO Analysis Report</h2>
                <p>WeTechForU Marketing Solutions <span class="azure-badge">Azure</span></p>
            </div>
            
            <div class="content">
                {content}
                
                <div class="highlight">
                    <h3>🔍 Access Your Detailed Analysis</h3>
                    <p>Click the button below to view your comprehensive SEO report with actionable recommendations:</p>
                    <a href="{secure_url}" class="cta-button">View Detailed Report</a>
                    <p><small>This secure link expires in 7 days. Powered by Microsoft Azure.</small></p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>WeTechForU Marketing Solutions</strong></p>
                <p>📧 Contact Us | 🌐 Visit Our Website</p>
                <p>This email was sent via Microsoft Azure. If you no longer wish to receive these emails, you can <a href="{os.getenv('BASE_URL', 'http://localhost:9000')}/unsubscribe/{campaign_id}">unsubscribe here</a>.</p>
            </div>
        </body>
        </html>
        """
        
        return html_template
