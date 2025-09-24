"""
Email Template Models
"""

from app import db
from datetime import datetime

class EmailTemplate(db.Model):
    __tablename__ = 'email_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    subject = db.Column(db.String(500), nullable=False)
    body = db.Column(db.Text, nullable=False)
    template_type = db.Column(db.String(50), nullable=False, index=True)  # seo_report, follow_up, introduction, custom
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='email_templates')
    email_campaigns = db.relationship('EmailCampaign', backref='template', lazy='dynamic')
    
    def __repr__(self):
        return f'<EmailTemplate {self.name}>'

class EmailCampaign(db.Model):
    __tablename__ = 'email_campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    template_id = db.Column(db.Integer, db.ForeignKey('email_templates.id'), nullable=False)
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=True)
    status = db.Column(db.String(20), default='draft', index=True)  # draft, sent, delivered, opened, clicked, replied
    sent_at = db.Column(db.DateTime, nullable=True)
    opened_at = db.Column(db.DateTime, nullable=True)
    clicked_at = db.Column(db.DateTime, nullable=True)
    replied_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - using fully qualified paths to avoid conflicts
    lead = db.relationship('app.models.lead.Lead', backref='email_campaigns')
    client = db.relationship('app.models.client.Client', backref='email_campaigns')
    
    def __repr__(self):
        return f'<EmailCampaign {self.name}>'

class EmailParameter(db.Model):
    __tablename__ = 'email_parameters'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('email_templates.id'), nullable=False)
    parameter_name = db.Column(db.String(100), nullable=False, index=True)  # {{lead_name}}, {{business_name}}, etc.
    parameter_type = db.Column(db.String(50), nullable=False)  # lead, client, seo_report, custom
    default_value = db.Column(db.String(500), nullable=True)
    is_required = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    template = db.relationship('EmailTemplate', backref='parameters')
    
    def __repr__(self):
        return f'<EmailParameter {self.parameter_name}>'

class EmailLog(db.Model):
    __tablename__ = 'email_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('email_campaigns.id'), nullable=False)
    recipient_email = db.Column(db.String(120), nullable=False, index=True)
    recipient_name = db.Column(db.String(255), nullable=True)
    subject = db.Column(db.String(500), nullable=False)
    body = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='sent', index=True)  # sent, delivered, opened, clicked, replied, bounced, failed
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    delivered_at = db.Column(db.DateTime, nullable=True)
    opened_at = db.Column(db.DateTime, nullable=True)
    clicked_at = db.Column(db.DateTime, nullable=True)
    replied_at = db.Column(db.DateTime, nullable=True)
    bounced_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    
    # Relationships
    campaign = db.relationship('EmailCampaign', backref='logs')
    
    def __repr__(self):
        return f'<EmailLog {self.recipient_email}>'
