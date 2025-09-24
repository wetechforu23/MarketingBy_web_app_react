"""
Advanced SEO Email Service with OTP Security and Professional Design
ALWAYS SENDS TO TEST EMAIL: viral.tarpara@hotmail.com
"""

import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app import db
from app.models.lead import Lead
from app.models.seo_audit import SEOAudit
from app.models.secure_link import SecureLink
from app.services.azure_email_service import AzureEmailService
from app.services.email_tracking_service import EmailTrackingService

class AdvancedSEOEmailService:
    """Advanced SEO Email Service with OTP security and professional design"""
    
    def __init__(self):
        self.azure_service = AzureEmailService()
        self.tracking_service = EmailTrackingService()
        self.base_url = os.getenv('BASE_URL', 'http://localhost:9001')
        # ALWAYS USE TEST EMAIL FOR NOW
        self.test_email = 'viral.tarpara@hotmail.com'
    
    def generate_otp_token(self, lead_id: int) -> str:
        """Generate secure OTP token for detailed report access"""
        # Create a secure random token
        token = secrets.token_urlsafe(32)
        
        # Store in database with expiration (using existing model structure)
        secure_link = SecureLink(
            token=token,
            lead_id=lead_id,
            campaign_id=1,  # SEO Reports campaign ID
            expires_at=datetime.utcnow() + timedelta(days=7),
            created_at=datetime.utcnow()
        )
        
        db.session.add(secure_link)
        db.session.commit()
        
        return token
    
    def get_advanced_seo_data(self, lead: Lead, seo_audit: SEOAudit) -> Dict[str, Any]:
        """Generate advanced SEO data including traffic and competitor analysis"""
        
        # Mock advanced SEO data (in real implementation, this would come from APIs)
        website_traffic = {
            'monthly_visitors': 15420,
            'organic_traffic': 8930,
            'direct_traffic': 4210,
            'referral_traffic': 2280,
            'traffic_growth': '+23.5%',
            'bounce_rate': '42.3%',
            'avg_session_duration': '2m 34s',
            'pages_per_session': 3.2
        }
        
        competitor_analysis = {
            'competitors': [
                {'name': 'Dallas Primary Care', 'traffic': 28400, 'domain_authority': 65},
                {'name': 'Metro Health Clinic', 'traffic': 19200, 'domain_authority': 58},
                {'name': 'Central Medical Group', 'traffic': 16800, 'domain_authority': 52}
            ],
            'market_position': '4th out of 12 competitors',
            'opportunity_score': 78
        }
        
        ai_seo_insights = {
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
        
        return {
            'website_traffic': website_traffic,
            'competitor_analysis': competitor_analysis,
            'ai_seo_insights': ai_seo_insights
        }
    
    def create_professional_email_template(self, lead: Lead, seo_audit: SEOAudit, 
                                         advanced_data: Dict[str, Any], otp_token: str, 
                                         delivery_id: int = None) -> str:
        """Create professional, attractive email template"""
        
        # Create tracking URLs
        if delivery_id:
            secure_report_url = self.tracking_service.create_click_tracking_url(
                delivery_id, f"{self.base_url}/secure-report/{otp_token}", "Access Detailed Report"
            )
            schedule_url = self.tracking_service.create_click_tracking_url(
                delivery_id, f"{self.base_url}/schedule-consultation/{lead.id}", "Schedule Free Consultation"
            )
        else:
            secure_report_url = f"{self.base_url}/secure-report/{otp_token}"
            schedule_url = f"{self.base_url}/schedule-consultation/{lead.id}"
        
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Advanced SEO Report - {lead.clinic_name}</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    background-color: #f8f9fa;
                }}
                .email-container {{
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
                    color: white;
                    padding: 40px 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }}
                .header p {{
                    margin: 10px 0 0 0;
                    opacity: 0.9;
                    font-size: 16px;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                .greeting {{
                    font-size: 18px;
                    margin-bottom: 30px;
                    color: #2c3e50;
                }}
                .score-card {{
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    border-radius: 12px;
                    padding: 25px;
                    margin: 25px 0;
                    border-left: 5px solid #0078d4;
                }}
                .score-grid {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 20px;
                    margin: 20px 0;
                }}
                .score-item {{
                    text-align: center;
                    padding: 15px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }}
                .score-value {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #0078d4;
                }}
                .score-label {{
                    font-size: 12px;
                    color: #666;
                    margin-top: 5px;
                }}
                .traffic-section {{
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 25px;
                    margin: 25px 0;
                }}
                .competitor-section {{
                    background: #fff3cd;
                    border-radius: 12px;
                    padding: 25px;
                    margin: 25px 0;
                    border-left: 5px solid #ffc107;
                }}
                .ai-insights {{
                    background: #d1ecf1;
                    border-radius: 12px;
                    padding: 25px;
                    margin: 25px 0;
                    border-left: 5px solid #17a2b8;
                }}
                .cta-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin: 10px 5px;
                    transition: transform 0.2s;
                }}
                .cta-button:hover {{
                    transform: translateY(-2px);
                }}
                .cta-button.secondary {{
                    background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
                }}
                .footer {{
                    background: #2c3e50;
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .footer p {{
                    margin: 5px 0;
                    font-size: 14px;
                }}
                .highlight {{
                    background: #fff3cd;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: 600;
                }}
                .metric {{
                    font-size: 20px;
                    font-weight: bold;
                    color: #28a745;
                }}
                .warning {{
                    color: #dc3545;
                }}
                .success {{
                    color: #28a745;
                }}
                .test-notice {{
                    background: #e7f3ff;
                    border: 2px solid #0078d4;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                    text-align: center;
                }}
                .test-notice strong {{
                    color: #0078d4;
                }}
                @media (max-width: 600px) {{
                    .score-grid {{
                        grid-template-columns: repeat(2, 1fr);
                    }}
                    .content {{
                        padding: 20px 15px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>🏥 WeTechForU Healthcare Marketing</h1>
                    <p>Advanced SEO Analysis & Digital Marketing Report</p>
                </div>
                
                <div class="content">
                    <!-- TEST EMAIL NOTICE -->
                    <div class="test-notice">
                        <strong>🧪 TEST EMAIL</strong><br>
                        This is a test email sent to viral.tarpara@hotmail.com<br>
                        <em>Original recipient: {lead.clinic_name} ({lead.email or 'No email on file'})</em>
                    </div>
                    
                    <div class="greeting">
                        <strong>Dear {lead.clinic_name} Team,</strong>
                    </div>
                    
                    <p>We're excited to share your comprehensive <strong>Advanced SEO Analysis Report</strong>! Our AI-powered analysis reveals significant opportunities to enhance your online presence and attract more patients.</p>
                    
                    <!-- Overall Performance Score -->
                    <div class="score-card">
                        <h2 style="margin-top: 0; color: #0078d4;">📊 Overall Performance Score</h2>
                        <div class="score-grid">
                            <div class="score-item">
                                <div class="score-value">{seo_audit.overall_score}/100</div>
                                <div class="score-label">Overall SEO</div>
                            </div>
                            <div class="score-item">
                                <div class="score-value">{seo_audit.page_speed_score}/100</div>
                                <div class="score-label">Page Speed</div>
                            </div>
                            <div class="score-item">
                                <div class="score-value">{seo_audit.mobile_friendly_score}/100</div>
                                <div class="score-label">Mobile Friendly</div>
                            </div>
                            <div class="score-item">
                                <div class="score-value">{seo_audit.seo_score}/100</div>
                                <div class="score-label">SEO Score</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Website Traffic Analysis -->
                    <div class="traffic-section">
                        <h2 style="margin-top: 0; color: #2c3e50;">📈 Website Traffic Analysis</h2>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                            <div>
                                <div class="metric">{advanced_data['website_traffic']['monthly_visitors']:,}</div>
                                <div>Monthly Visitors</div>
                            </div>
                            <div>
                                <div class="metric success">{advanced_data['website_traffic']['traffic_growth']}</div>
                                <div>Traffic Growth</div>
                            </div>
                            <div>
                                <div class="metric">{advanced_data['website_traffic']['organic_traffic']:,}</div>
                                <div>Organic Traffic</div>
                            </div>
                            <div>
                                <div class="metric">{advanced_data['website_traffic']['avg_session_duration']}</div>
                                <div>Avg. Session Duration</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Competitor Analysis -->
                    <div class="competitor-section">
                        <h2 style="margin-top: 0; color: #856404;">🏆 Competitor Analysis</h2>
                        <p><strong>Market Position:</strong> <span class="highlight">{advanced_data['competitor_analysis']['market_position']}</span></p>
                        <p><strong>Opportunity Score:</strong> <span class="metric">{advanced_data['competitor_analysis']['opportunity_score']}/100</span></p>
                        
                        <h3>Top Competitors:</h3>
                        <ul>
                            {''.join([f'<li><strong>{comp["name"]}</strong> - {comp["traffic"]:,} monthly visitors (DA: {comp["domain_authority"]})</li>' for comp in advanced_data['competitor_analysis']['competitors']])}
                        </ul>
                    </div>
                    
                    <!-- AI SEO Insights -->
                    <div class="ai-insights">
                        <h2 style="margin-top: 0; color: #0c5460;">🤖 AI-Powered SEO Insights</h2>
                        
                        <h3>Content Opportunities:</h3>
                        <ul>
                            {''.join([f'<li>{insight}</li>' for insight in advanced_data['ai_seo_insights']['content_gaps']])}
                        </ul>
                        
                        <h3>Technical Improvements:</h3>
                        <ul>
                            {''.join([f'<li>{improvement}</li>' for improvement in advanced_data['ai_seo_insights']['technical_improvements']])}
                        </ul>
                    </div>
                    
                    <!-- Call to Action -->
                    <div style="text-align: center; margin: 40px 0;">
                        <h2 style="color: #2c3e50;">🚀 Ready to Transform Your Online Presence?</h2>
                        <p>Get your <strong>detailed SEO report</strong> with actionable strategies and implementation roadmap.</p>
                        
                        <a href="{secure_report_url}" class="cta-button">
                            🔐 Access Detailed Report
                        </a>
                        
                        <a href="{schedule_url}" class="cta-button secondary">
                            📅 Schedule Free Consultation
                        </a>
                    </div>
                    
                    <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin: 30px 0;">
                        <h3 style="margin-top: 0; color: #495057;">🔒 Secure Access</h3>
                        <p>Your detailed report is protected with secure access. Click the button above to receive your one-time access code via email.</p>
                    </div>
                    
                    <p>Our healthcare marketing experts are ready to help you implement these strategies and grow your patient base.</p>
                    
                    <p>Best regards,<br>
                    <strong>WeTechForU Healthcare Marketing Team</strong><br>
                    <em>Your Partner in Digital Healthcare Growth</em></p>
                </div>
                
                <div class="footer">
                    <p><strong>WeTechForU Healthcare Marketing</strong></p>
                    <p>📧 healthcare@wetechforu.com | 🌐 wetechforu.com</p>
                    <p>🏥 Specializing in Healthcare Digital Marketing & SEO</p>
                    <p style="font-size: 12px; opacity: 0.8;">
                        This email was sent from WeTechForU Healthcare Marketing Platform<br>
                        Powered by: wetechforu | © 2025 All rights reserved
                    </p>
                </div>
            </div>
            
            <!-- Email Tracking Pixel -->
            {f'<img src="{self.tracking_service.create_tracking_pixel(delivery_id)}" width="1" height="1" style="display:none;" alt="">' if delivery_id else ''}
        </body>
        </html>
        """
    
    def send_advanced_seo_email(self, lead_id: int) -> Dict[str, Any]:
        """Send advanced SEO email with OTP security - ALWAYS TO TEST EMAIL"""
        try:
            # Get lead and SEO audit
            lead = Lead.query.get(lead_id)
            if not lead:
                return {'success': False, 'message': 'Lead not found'}
            
            seo_audit = SEOAudit.query.filter_by(lead_id=lead_id).order_by(SEOAudit.created_at.desc()).first()
            if not seo_audit:
                return {'success': False, 'message': 'SEO audit not found'}
            
            # Generate OTP token
            otp_token = self.generate_otp_token(lead_id)
            
            # Record email delivery for tracking - ALWAYS USE TEST EMAIL
            delivery = self.tracking_service.record_email_delivery(
                lead_id=lead_id,
                campaign_id=1,  # SEO Reports campaign
                to_email=self.test_email,  # Always use test email
                subject=f"🚀 Advanced SEO Report for {lead.clinic_name} - {datetime.now().strftime('%B %Y')}"
            )
            
            # Get advanced SEO data
            advanced_data = self.get_advanced_seo_data(lead, seo_audit)
            
            # Create professional email template with tracking
            html_body = self.create_professional_email_template(lead, seo_audit, advanced_data, otp_token, delivery.id)
            
            # Send email via Graph API - ALWAYS TO TEST EMAIL
            subject = f"🚀 Advanced SEO Report for {lead.clinic_name} - {datetime.now().strftime('%B %Y')}"
            
            result = self.azure_service.send_email_via_graph_api(
                to_email=self.test_email,  # Always use test email
                subject=subject,
                html_body=html_body,
                campaign_id=1  # SEO Reports campaign
            )
            
            if result.get('success'):
                # Update lead status
                lead.status = 'contacted'
                lead.notes = f"Advanced SEO report sent with OTP access on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (TEST EMAIL: {self.test_email})"
                db.session.commit()
                
                return {
                    'success': True,
                    'message': f'Advanced SEO email sent successfully to TEST EMAIL: {self.test_email}',
                    'otp_token': otp_token,
                    'secure_url': f"{self.base_url}/secure-report/{otp_token}",
                    'test_email': self.test_email,
                    'original_recipient': lead.clinic_name
                }
            else:
                return result
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Failed to send advanced SEO email: {str(e)}'
            }
