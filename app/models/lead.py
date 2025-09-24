"""
Lead Models
"""

from app import db
from datetime import datetime

class Lead(db.Model):
    __tablename__ = 'leads'
    
    id = db.Column(db.Integer, primary_key=True)
    clinic_name = db.Column(db.String(255), nullable=False, index=True)
    website_url = db.Column(db.String(255), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='new', index=True)  # new, contacted, qualified, converted, closed, cancelled
    notes = db.Column(db.Text, nullable=True)
    industry_category = db.Column(db.String(100), nullable=True, index=True)
    industry_subcategory = db.Column(db.String(100), nullable=True, index=True)
    services = db.Column(db.Text, nullable=True)
    lead_source = db.Column(db.String(50), nullable=True, index=True)  # google_maps, yelp, healthgrades, manual
    search_keyword = db.Column(db.String(100), nullable=True, index=True)
    
    # Contact Information
    contact_person = db.Column(db.String(255), nullable=True)
    contact_email = db.Column(db.String(120), nullable=True)
    contact_phone = db.Column(db.String(20), nullable=True)
    contact_title = db.Column(db.String(100), nullable=True)
    
    # Conversion tracking
    converted_to_client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    seo_audits = db.relationship('SEOAudit', backref='lead', lazy='dynamic', cascade='all, delete-orphan')
    
    # Indexes for better performance
    __table_args__ = (
        db.Index('idx_lead_status_created', 'status', 'created_at'),
        db.Index('idx_lead_industry_status', 'industry_category', 'status'),
        db.Index('idx_lead_source_created', 'lead_source', 'created_at'),
        db.Index('idx_lead_contact_email', 'contact_email'),
        db.Index('idx_lead_website', 'website_url'),
    )
    
    @property
    def business_name(self):
        """Backward compatibility property"""
        return self.clinic_name
    
    def __repr__(self):
        return f'<Lead {self.clinic_name}>'

class IndustryCategory(db.Model):
    __tablename__ = 'industry_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True, index=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    subcategories = db.relationship('IndustrySubcategory', backref='category', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<IndustryCategory {self.name}>'

class IndustrySubcategory(db.Model):
    __tablename__ = 'industry_subcategories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey('industry_categories.id'), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    keywords = db.relationship('SearchKeyword', backref='subcategory', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<IndustrySubcategory {self.name}>'

class SearchKeyword(db.Model):
    __tablename__ = 'search_keywords'
    
    id = db.Column(db.Integer, primary_key=True)
    keyword = db.Column(db.String(100), nullable=False, index=True)
    subcategory_id = db.Column(db.Integer, db.ForeignKey('industry_subcategories.id'), nullable=False)
    search_volume = db.Column(db.Integer, default=0)
    competition_level = db.Column(db.String(20), default='medium')  # low, medium, high
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<SearchKeyword {self.keyword}>'

