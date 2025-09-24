"""
Email Tracking Models for Comprehensive Email Analytics
"""

from app import db
from datetime import datetime

class EmailDelivery(db.Model):
    """Track email delivery status"""
    __tablename__ = 'email_deliveries'
    
    id = db.Column(db.Integer, primary_key=True)
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=False)
    campaign_id = db.Column(db.Integer, db.ForeignKey('email_campaigns.id'), nullable=False)
    to_email = db.Column(db.String(255), nullable=False, index=True)
    subject = db.Column(db.String(500), nullable=False)
    message_id = db.Column(db.String(255), unique=True, index=True)  # Email message ID
    status = db.Column(db.String(20), default='sent', index=True)  # sent, delivered, bounced, failed
    sent_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    delivered_at = db.Column(db.DateTime, nullable=True)
    bounced_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    
    # Relationships
    lead = db.relationship('Lead', backref='email_deliveries')
    campaign = db.relationship('EmailCampaign', backref='email_deliveries')
    
    def __repr__(self):
        return f'<EmailDelivery {self.to_email} - {self.status}>'

class EmailOpen(db.Model):
    """Track email opens"""
    __tablename__ = 'email_opens'
    
    id = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey('email_deliveries.id'), nullable=False)
    opened_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(255), nullable=True)
    
    # Relationships
    delivery = db.relationship('EmailDelivery', backref='opens')
    
    def __repr__(self):
        return f'<EmailOpen {self.delivery_id} - {self.opened_at}>'

class EmailClick(db.Model):
    """Track email clicks"""
    __tablename__ = 'email_clicks'
    
    id = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey('email_deliveries.id'), nullable=False)
    clicked_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    link_url = db.Column(db.Text, nullable=False)
    link_text = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(255), nullable=True)
    
    # Relationships
    delivery = db.relationship('EmailDelivery', backref='clicks')
    
    def __repr__(self):
        return f'<EmailClick {self.delivery_id} - {self.link_url}>'

class SecureLinkAccess(db.Model):
    """Track secure link access"""
    __tablename__ = 'secure_link_accesses'
    
    id = db.Column(db.Integer, primary_key=True)
    secure_link_id = db.Column(db.Integer, db.ForeignKey('secure_links.id'), nullable=False)
    accessed_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(255), nullable=True)
    otp_verified = db.Column(db.Boolean, default=False)
    otp_verified_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    secure_link = db.relationship('SecureLink', backref='accesses')
    
    def __repr__(self):
        return f'<SecureLinkAccess {self.secure_link_id} - {self.accessed_at}>'

class EmailEngagement(db.Model):
    """Aggregated email engagement metrics"""
    __tablename__ = 'email_engagement'
    
    id = db.Column(db.Integer, primary_key=True)
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=False)
    campaign_id = db.Column(db.Integer, db.ForeignKey('email_campaigns.id'), nullable=False)
    delivery_id = db.Column(db.Integer, db.ForeignKey('email_deliveries.id'), nullable=False)
    
    # Engagement metrics
    is_delivered = db.Column(db.Boolean, default=False)
    is_opened = db.Column(db.Boolean, default=False)
    open_count = db.Column(db.Integer, default=0)
    is_clicked = db.Column(db.Boolean, default=False)
    click_count = db.Column(db.Integer, default=0)
    is_secure_link_accessed = db.Column(db.Boolean, default=False)
    is_otp_verified = db.Column(db.Boolean, default=False)
    
    # Timestamps
    first_opened_at = db.Column(db.DateTime, nullable=True)
    last_opened_at = db.Column(db.DateTime, nullable=True)
    first_clicked_at = db.Column(db.DateTime, nullable=True)
    last_clicked_at = db.Column(db.DateTime, nullable=True)
    secure_link_accessed_at = db.Column(db.DateTime, nullable=True)
    otp_verified_at = db.Column(db.DateTime, nullable=True)
    
    # Calculated metrics
    time_to_open = db.Column(db.Integer, nullable=True)  # seconds from sent to first open
    time_to_click = db.Column(db.Integer, nullable=True)  # seconds from sent to first click
    time_to_secure_access = db.Column(db.Integer, nullable=True)  # seconds from sent to secure access
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    lead = db.relationship('Lead', backref='email_engagement')
    campaign = db.relationship('EmailCampaign', backref='email_engagement')
    delivery = db.relationship('EmailDelivery', backref='engagement')
    
    def __repr__(self):
        return f'<EmailEngagement {self.lead_id} - {self.campaign_id}>'
