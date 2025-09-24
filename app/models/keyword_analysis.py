"""
Keyword Analysis Models
"""

from app import db
from datetime import datetime

class KeywordAnalysis(db.Model):
    __tablename__ = 'keyword_analysis'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    keyword = db.Column(db.String(255), nullable=False, index=True)
    search_volume = db.Column(db.Integer, default=0)
    competition_level = db.Column(db.String(20), default='medium')  # low, medium, high
    current_ranking = db.Column(db.Integer, nullable=True)
    target_ranking = db.Column(db.Integer, default=1)
    difficulty_score = db.Column(db.Float, default=0.0)
    cpc = db.Column(db.Float, default=0.0)  # Cost per click
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<KeywordAnalysis {self.keyword}>'

class CompetitorAnalysis(db.Model):
    __tablename__ = 'competitor_analysis'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    competitor_domain = db.Column(db.String(255), nullable=False, index=True)
    competitor_name = db.Column(db.String(255), nullable=True)
    domain_authority = db.Column(db.Integer, default=0)
    backlinks_count = db.Column(db.Integer, default=0)
    organic_traffic = db.Column(db.Integer, default=0)
    top_keywords = db.Column(db.Text, nullable=True)  # JSON string
    analysis_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<CompetitorAnalysis {self.competitor_domain}>'

class KeywordRecommendation(db.Model):
    __tablename__ = 'keyword_recommendations'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    keyword = db.Column(db.String(255), nullable=False, index=True)
    recommendation_type = db.Column(db.String(50), nullable=False)  # primary, competitor, long_tail, local, facebook, google_ads, content
    priority = db.Column(db.String(20), default='medium')  # high, medium, low
    estimated_traffic = db.Column(db.Integer, default=0)
    estimated_difficulty = db.Column(db.Float, default=0.0)
    suggested_action = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<KeywordRecommendation {self.keyword} - {self.recommendation_type}>'

class KeywordCampaign(db.Model):
    __tablename__ = 'keyword_campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    campaign_name = db.Column(db.String(255), nullable=False)
    target_keywords = db.Column(db.Text, nullable=False)  # JSON string
    campaign_type = db.Column(db.String(50), nullable=False)  # seo, content, local
    status = db.Column(db.String(20), default='active', index=True)  # active, paused, completed
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    budget = db.Column(db.Float, default=0.0)
    current_rankings = db.Column(db.Text, nullable=True)  # JSON string
    target_rankings = db.Column(db.Text, nullable=True)  # JSON string
    progress_percentage = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<KeywordCampaign {self.campaign_name}>'

class BacklinkCampaign(db.Model):
    __tablename__ = 'backlink_campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    target_url = db.Column(db.String(500), nullable=False)
    anchor_text = db.Column(db.String(255), nullable=True)
    target_domain = db.Column(db.String(255), nullable=False)
    domain_authority = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='pending', index=True)  # pending, contacted, secured, rejected, expired
    outreach_date = db.Column(db.DateTime, nullable=True)
    response_date = db.Column(db.DateTime, nullable=True)
    cost = db.Column(db.Float, default=0.0)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<BacklinkCampaign {self.target_domain}>'

class GoogleAdsCampaign(db.Model):
    __tablename__ = 'google_ads_campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    campaign_name = db.Column(db.String(255), nullable=False)
    ad_group_name = db.Column(db.String(255), nullable=True)
    keywords = db.Column(db.Text, nullable=False)  # JSON string
    ad_copy = db.Column(db.Text, nullable=True)
    landing_page = db.Column(db.String(500), nullable=True)
    daily_budget = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='active', index=True)  # active, paused, completed
    impressions = db.Column(db.Integer, default=0)
    clicks = db.Column(db.Integer, default=0)
    conversions = db.Column(db.Integer, default=0)
    cost = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<GoogleAdsCampaign {self.campaign_name}>'

class ClientAcquisition(db.Model):
    __tablename__ = 'client_acquisition'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    acquisition_source = db.Column(db.String(100), nullable=False)  # referral, google_ads, facebook, seo, cold_outreach
    acquisition_date = db.Column(db.Date, nullable=False)
    acquisition_cost = db.Column(db.Float, default=0.0)
    lifetime_value = db.Column(db.Float, default=0.0)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ClientAcquisition {self.acquisition_source}>'

