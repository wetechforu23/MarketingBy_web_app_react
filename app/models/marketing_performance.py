"""
Marketing Performance Model
"""

from app import db
from datetime import datetime

class MarketingPerformance(db.Model):
    __tablename__ = 'marketing_performance'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=True)
    platform = db.Column(db.String(50), nullable=False)  # facebook, instagram, google_ads, email
    metric_type = db.Column(db.String(50), nullable=False)  # impressions, clicks, engagement, conversions
    metric_value = db.Column(db.Float, nullable=False)
    date_tracked = db.Column(db.Date, nullable=False, index=True)
    cost = db.Column(db.Float, default=0.0)
    revenue_attributed = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<MarketingPerformance {self.platform} - {self.metric_type}: {self.metric_value}>'

