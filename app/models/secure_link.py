"""
Secure Link Models for Email Campaigns
"""

from app import db
from datetime import datetime, timedelta

class SecureLink(db.Model):
    __tablename__ = 'secure_links'
    
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), nullable=False, unique=True, index=True)
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=False)
    campaign_id = db.Column(db.Integer, db.ForeignKey('email_campaigns.id'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    accessed_at = db.Column(db.DateTime, nullable=True)
    access_count = db.Column(db.Integer, default=0)
    
    # Relationships
    lead = db.relationship('Lead')
    campaign = db.relationship('EmailCampaign')
    
    # Indexes for better performance
    __table_args__ = (
        db.Index('idx_secure_link_token_active', 'token', 'is_active'),
        db.Index('idx_secure_link_lead_campaign', 'lead_id', 'campaign_id'),
        db.Index('idx_secure_link_expires', 'expires_at'),
    )
    
    def is_expired(self):
        """Check if the link is expired"""
        return datetime.utcnow() > self.expires_at
    
    def can_access(self):
        """Check if the link can be accessed"""
        return self.is_active and not self.is_expired()
    
    def record_access(self):
        """Record that the link was accessed"""
        self.accessed_at = datetime.utcnow()
        self.access_count += 1
        db.session.commit()
    
    def __repr__(self):
        return f'<SecureLink {self.token[:8]}...>'

class LinkClick(db.Model):
    __tablename__ = 'link_clicks'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('email_campaigns.id'), nullable=False)
    link_type = db.Column(db.String(50), nullable=False, index=True)  # 'contact', 'website', 'secure_link', etc.
    ip_address = db.Column(db.String(45), nullable=True, index=True)  # IPv6 compatible
    user_agent = db.Column(db.Text, nullable=True)
    clicked_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    campaign = db.relationship('EmailCampaign')
    
    # Indexes for better performance
    __table_args__ = (
        db.Index('idx_link_click_campaign_type', 'campaign_id', 'link_type'),
        db.Index('idx_link_click_campaign_date', 'campaign_id', 'clicked_at'),
        db.Index('idx_link_click_ip_date', 'ip_address', 'clicked_at'),
    )
    
    def __repr__(self):
        return f'<LinkClick {self.link_type} at {self.clicked_at}>'

class UnsubscribeRecord(db.Model):
    __tablename__ = 'unsubscribe_records'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    unsubscribed_at = db.Column(db.DateTime, default=datetime.utcnow)
    reason = db.Column(db.String(255), nullable=True)  # Optional reason for unsubscribing
    
    # Indexes for better performance
    __table_args__ = (
        db.Index('idx_unsubscribe_email', 'email'),
        db.Index('idx_unsubscribe_date', 'unsubscribed_at'),
    )
    
    def __repr__(self):
        return f'<UnsubscribeRecord {self.email}>'
