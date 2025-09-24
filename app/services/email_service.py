"""
Email Service for Parameterized Email Drafts
"""

import re
from datetime import datetime
from typing import Dict, List, Optional, Any
from app import db
from app.models.lead import Lead
from app.models.client import Client
from app.models.seo_audit import SEOAudit
from app.models.email_template import EmailTemplate, EmailParameter, EmailCampaign, EmailLog

class EmailParameterService:
    """Service for handling parameterized email templates"""
    
    # Standard parameter patterns
    PARAMETER_PATTERNS = {
        'lead_name': r'\{\{lead_name\}\}',
        'business_name': r'\{\{business_name\}\}',
        'contact_person': r'\{\{contact_person\}\}',
        'contact_email': r'\{\{contact_email\}\}',
        'contact_phone': r'\{\{contact_phone\}\}',
        'contact_title': r'\{\{contact_title\}\}',
        'website_url': r'\{\{website_url\}\}',
        'industry': r'\{\{industry\}\}',
        'address': r'\{\{address\}\}',
        'seo_score': r'\{\{seo_score\}\}',
        'seo_issues': r'\{\{seo_issues\}\}',
        'seo_recommendations': r'\{\{seo_recommendations\}\}',
        'current_date': r'\{\{current_date\}\}',
        'company_name': r'\{\{company_name\}\}',
        'sender_name': r'\{\{sender_name\}\}',
        'sender_email': r'\{\{sender_email\}\}',
    }
    
    @classmethod
    def extract_parameters(cls, text: str) -> List[str]:
        """Extract all parameters from text"""
        parameters = []
        for param_name, pattern in cls.PARAMETER_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                parameters.append(param_name)
        return parameters
    
    @classmethod
    def replace_parameters(cls, text: str, values: Dict[str, Any]) -> str:
        """Replace parameters in text with actual values"""
        result = text
        
        for param_name, pattern in cls.PARAMETER_PATTERNS.items():
            if param_name in values and values[param_name] is not None:
                replacement = str(values[param_name])
                result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
            else:
                # Replace with empty string if value not provided
                result = re.sub(pattern, '', result, flags=re.IGNORECASE)
        
        return result

class EmailDraftService:
    """Service for creating and managing email drafts"""
    
    @classmethod
    def get_lead_data(cls, lead_id: int) -> Dict[str, Any]:
        """Get all relevant data for a lead"""
        lead = Lead.query.get_or_404(lead_id)
        
        # Get latest SEO audit
        latest_seo_audit = SEOAudit.query.filter_by(lead_id=lead_id)\
            .order_by(SEOAudit.created_at.desc()).first()
        
        # Get SEO issues and recommendations
        seo_issues = []
        seo_recommendations = []
        seo_score = 0
        
        if latest_seo_audit:
            seo_score = latest_seo_audit.overall_score or 0
            # Extract issues and recommendations from SEO audit
            if hasattr(latest_seo_audit, 'recommendations') and latest_seo_audit.recommendations:
                recommendations_data = latest_seo_audit.recommendations
                if isinstance(recommendations_data, dict):
                    seo_issues = recommendations_data.get('issues', [])
                    seo_recommendations = recommendations_data.get('recommendations', [])
                elif isinstance(recommendations_data, list):
                    seo_recommendations = recommendations_data
        
        return {
            'lead_name': lead.clinic_name,
            'business_name': lead.clinic_name,
            'contact_person': lead.contact_person or 'Business Owner',
            'contact_email': lead.contact_email or lead.email,
            'contact_phone': lead.contact_phone or lead.phone,
            'contact_title': lead.contact_title or 'Owner',
            'website_url': lead.website_url,
            'industry': lead.industry_category or 'Healthcare',
            'address': lead.address,
            'seo_score': seo_score,
            'seo_issues': ', '.join(seo_issues[:3]) if seo_issues else 'Basic SEO improvements needed',
            'seo_recommendations': ', '.join(seo_recommendations[:3]) if seo_recommendations else 'Website optimization and content improvements',
            'current_date': datetime.now().strftime('%B %d, %Y'),
            'company_name': 'WeTechForU Marketing Solutions',
            'sender_name': 'Marketing Team',
            'sender_email': 'marketing@wetechforu.com',
        }
    
    @classmethod
    def create_draft_from_template(cls, template_id: int, lead_id: int, custom_values: Dict[str, Any] = None) -> Dict[str, Any]:
        """Create an email draft from a template with lead data"""
        template = EmailTemplate.query.get_or_404(template_id)
        lead_data = cls.get_lead_data(lead_id)
        
        # Merge custom values with lead data
        if custom_values:
            lead_data.update(custom_values)
        
        # Replace parameters in subject and body
        subject = EmailParameterService.replace_parameters(template.subject, lead_data)
        body = EmailParameterService.replace_parameters(template.body, lead_data)
        
        return {
            'template_id': template_id,
            'template_name': template.name,
            'lead_id': lead_id,
            'subject': subject,
            'body': body,
            'recipient_email': lead_data.get('contact_email'),
            'recipient_name': lead_data.get('contact_person'),
            'parameters_used': EmailParameterService.extract_parameters(template.subject + ' ' + template.body),
            'parameter_values': lead_data
        }
    
    @classmethod
    def save_draft_campaign(cls, draft_data: Dict[str, Any], user_id: int) -> EmailCampaign:
        """Save email draft as a campaign"""
        campaign = EmailCampaign(
            name=f"Draft: {draft_data['template_name']} - {draft_data['recipient_name']}",
            template_id=draft_data['template_id'],
            lead_id=draft_data['lead_id'],
            status='draft'
        )
        
        db.session.add(campaign)
        db.session.flush()  # Get the ID
        
        # Create email log for the draft
        email_log = EmailLog(
            campaign_id=campaign.id,
            recipient_email=draft_data['recipient_email'],
            recipient_name=draft_data['recipient_name'],
            subject=draft_data['subject'],
            body=draft_data['body'],
            status='draft'
        )
        
        db.session.add(email_log)
        db.session.commit()
        
        return campaign
    
    @classmethod
    def get_default_templates(cls) -> List[Dict[str, Any]]:
        """Get default email templates"""
        return [
            {
                'id': 'seo_report',
                'name': 'SEO Report Email',
                'subject': 'SEO Analysis Report for {{business_name}}',
                'body': '''Dear {{contact_person}},

I hope this email finds you well. I've completed a comprehensive SEO analysis of {{business_name}}'s website ({{website_url}}) and wanted to share the results with you.

**Current SEO Score: {{seo_score}}/100**

**Key Issues Identified:**
{{seo_issues}}

**Recommended Improvements:**
{{seo_recommendations}}

I'd be happy to discuss these findings in more detail and explain how we can help improve your online visibility and attract more patients to your practice.

Would you be available for a brief call this week to discuss these opportunities?

Best regards,
{{sender_name}}
{{company_name}}
{{sender_email}}'''
            },
            {
                'id': 'follow_up',
                'name': 'Follow-up Email',
                'subject': 'Following up on {{business_name}} - Marketing Opportunities',
                'body': '''Hi {{contact_person}},

I wanted to follow up on our previous conversation about marketing opportunities for {{business_name}}.

As a {{industry}} practice, I believe there are several ways we can help you:
- Improve your online presence and SEO
- Generate more qualified leads
- Increase patient appointments
- Enhance your digital marketing strategy

I'd love to schedule a brief 15-minute call to discuss how we can help grow your practice. Are you available for a quick chat this week?

Best regards,
{{sender_name}}
{{company_name}}
{{sender_email}}'''
            },
            {
                'id': 'introduction',
                'name': 'Introduction Email',
                'subject': 'Marketing Solutions for {{business_name}}',
                'body': '''Dear {{contact_person}},

I hope this email finds you well. I came across {{business_name}} and was impressed by your {{industry}} services.

I'm reaching out because I specialize in helping healthcare practices like yours improve their online presence and attract more patients. Many practices in the {{industry}} field are missing out on significant growth opportunities due to outdated or ineffective marketing strategies.

Here's what I can help you with:
- SEO optimization to improve your Google rankings
- Social media marketing to engage with your community
- Online reputation management
- Lead generation and patient acquisition

Would you be interested in a brief, no-obligation consultation to discuss how we can help grow your practice?

I'm available for a 15-minute call this week. Please let me know what time works best for you.

Best regards,
{{sender_name}}
{{company_name}}
{{sender_email}}'''
            }
        ]
    
    @classmethod
    def create_default_templates(cls, user_id: int):
        """Create default email templates in the database"""
        default_templates = cls.get_default_templates()
        
        for template_data in default_templates:
            # Check if template already exists
            existing = EmailTemplate.query.filter_by(name=template_data['name']).first()
            if existing:
                continue
                
            template = EmailTemplate(
                name=template_data['name'],
                subject=template_data['subject'],
                body=template_data['body'],
                template_type=template_data['id'],
                created_by=user_id
            )
            
            db.session.add(template)
            db.session.flush()
            
            # Create parameters for this template
            parameters = EmailParameterService.extract_parameters(
                template_data['subject'] + ' ' + template_data['body']
            )
            
            for param_name in parameters:
                parameter = EmailParameter(
                    template_id=template.id,
                    parameter_name=param_name,
                    parameter_type='lead' if param_name.startswith('lead_') or param_name.startswith('contact_') else 'custom',
                    is_required=True
                )
                db.session.add(parameter)
        
        db.session.commit()
