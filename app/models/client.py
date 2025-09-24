"""
Client Model
"""

from app import db
from datetime import datetime

class Client(db.Model):
    __tablename__ = 'clients'
    
    id = db.Column(db.Integer, primary_key=True)
    client_name = db.Column(db.String(255), nullable=False, index=True)
    website = db.Column(db.String(255), nullable=False, unique=True, index=True)
    email = db.Column(db.String(120), nullable=False, unique=True, index=True)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    city = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(50), nullable=True)
    zip_code = db.Column(db.String(20), nullable=True)
    contact_name = db.Column(db.String(255), nullable=True)
    specialties = db.Column(db.Text, nullable=True)
    monthly_retainer = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    seo_audits = db.relationship('SEOAudit', backref='client', lazy='dynamic', cascade='all, delete-orphan')
    campaigns = db.relationship('Campaign', backref='client', lazy='dynamic', cascade='all, delete-orphan')
    communications = db.relationship('Communication', backref='client', lazy='dynamic', cascade='all, delete-orphan')
    content_approvals = db.relationship('ContentApproval', backref='client', lazy='dynamic', cascade='all, delete-orphan')
    marketing_performance = db.relationship('MarketingPerformance', backref='client', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Client {self.client_name}>'
