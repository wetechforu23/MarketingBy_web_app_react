"""
Campaign Model
"""

from app import db
from datetime import datetime

class Campaign(db.Model):
    __tablename__ = 'campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    campaign_type = db.Column(db.String(50), nullable=False)  # seo, social_media, google_ads, email
    platform = db.Column(db.String(50), nullable=True)  # facebook, instagram, google, email
    status = db.Column(db.String(20), default='active', index=True)  # active, paused, completed, cancelled
    budget = db.Column(db.Float, default=0.0)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    target_audience = db.Column(db.Text, nullable=True)
    objectives = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Campaign {self.name}>'

