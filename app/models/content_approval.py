"""
Content Approval Model
"""

from app import db
from datetime import datetime, timedelta
import secrets

class ContentApproval(db.Model):
    __tablename__ = 'content_approvals'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    content_type = db.Column(db.String(50), nullable=False)  # post, blog, ad, email
    content_title = db.Column(db.String(255), nullable=False)
    content_body = db.Column(db.Text, nullable=False)
    content_image_url = db.Column(db.String(500), nullable=True)
    platform = db.Column(db.String(50), nullable=True)  # facebook, instagram, google_ads, website
    status = db.Column(db.String(20), default='draft', index=True)  # draft, review, approved, rejected, published, expired
    
    # Quality approval fields
    quality_approved = db.Column(db.Boolean, default=False)
    quality_approved_date = db.Column(db.DateTime, nullable=True)
    quality_approved_by = db.Column(db.String(100), nullable=True)
    
    # Client approval fields
    client_approved = db.Column(db.Boolean, default=False)
    client_approved_date = db.Column(db.DateTime, nullable=True)
    client_approval_requested = db.Column(db.Boolean, default=False)
    client_approval_requested_date = db.Column(db.DateTime, nullable=True)
    
    # Final approval fields
    final_approved = db.Column(db.Boolean, default=False)
    final_approved_date = db.Column(db.DateTime, nullable=True)
    final_approved_by = db.Column(db.String(100), nullable=True)
    
    # Legacy fields for backward compatibility
    approved_at = db.Column(db.DateTime, nullable=True)
    posted_at = db.Column(db.DateTime, nullable=True)
    published_date = db.Column(db.DateTime, nullable=True)
    published_by = db.Column(db.String(100), nullable=True)
    rejected_at = db.Column(db.DateTime, nullable=True)
    rejected_by = db.Column(db.String(100), nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    
    # Approval workflow fields
    approval_token = db.Column(db.String(255), nullable=True, unique=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    scheduled_date = db.Column(db.DateTime, nullable=True)
    keywords = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def generate_approval_token(self):
        """Generate a secure approval token"""
        self.approval_token = secrets.token_urlsafe(32)
        self.expires_at = datetime.utcnow() + timedelta(days=7)
        return self.approval_token
    
    def is_token_valid(self):
        """Check if approval token is still valid"""
        if not self.approval_token or not self.expires_at:
            return False
        return datetime.utcnow() < self.expires_at
    
    def __repr__(self):
        return f'<ContentApproval {self.content_title} - {self.status}>'

