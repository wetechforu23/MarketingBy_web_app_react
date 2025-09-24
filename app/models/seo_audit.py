"""
SEO Audit Model
"""

from app import db
from datetime import datetime

class SEOAudit(db.Model):
    __tablename__ = 'seo_audits'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=True)
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=True)
    website_url = db.Column(db.String(255), nullable=False)
    overall_score = db.Column(db.Integer, nullable=False)
    page_speed_score = db.Column(db.Integer, nullable=True)
    mobile_friendly_score = db.Column(db.Integer, nullable=True)
    seo_score = db.Column(db.Integer, nullable=True)
    accessibility_score = db.Column(db.Integer, nullable=True)
    best_practices_score = db.Column(db.Integer, nullable=True)
    issues_found = db.Column(db.Text, nullable=True)
    recommendations = db.Column(db.Text, nullable=True)
    audit_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<SEOAudit {self.website_url} - Score: {self.overall_score}>'

