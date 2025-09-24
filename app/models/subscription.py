"""
Subscription Plan and Feature Management Models
"""

from app import db
from datetime import datetime

class SubscriptionPlan(db.Model):
    __tablename__ = 'subscription_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=False, default=0.0)
    billing_cycle = db.Column(db.String(20), nullable=False, default='monthly')  # monthly, quarterly, yearly
    is_active = db.Column(db.Boolean, default=True)
    max_clients = db.Column(db.Integer, default=1)
    max_posts_per_month = db.Column(db.Integer, default=10)
    max_seo_audits_per_month = db.Column(db.Integer, default=5)
    max_lead_generation_per_month = db.Column(db.Integer, default=50)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    features = db.relationship('PlanFeature', backref='plan', lazy='dynamic', cascade='all, delete-orphan')
    client_subscriptions = db.relationship('ClientSubscription', backref='subscription_plan', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<SubscriptionPlan {self.name}>'

class Feature(db.Model):
    __tablename__ = 'features'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=False)  # seo, social_media, ads, analytics, automation
    is_core = db.Column(db.Boolean, default=False)  # Core features available to all plans
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    plan_features = db.relationship('PlanFeature', backref='feature', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Feature {self.name}>'

class PlanFeature(db.Model):
    __tablename__ = 'plan_features'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id'), nullable=False)
    feature_id = db.Column(db.Integer, db.ForeignKey('features.id'), nullable=False)
    is_enabled = db.Column(db.Boolean, default=True)
    limit_value = db.Column(db.Integer, nullable=True)  # Usage limit for this feature
    limit_type = db.Column(db.String(20), nullable=True)  # per_month, per_week, per_day, total
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate plan-feature combinations
    __table_args__ = (db.UniqueConstraint('plan_id', 'feature_id', name='unique_plan_feature'),)
    
    def __repr__(self):
        return f'<PlanFeature Plan:{self.plan_id} Feature:{self.feature_id}>'

class ClientSubscription(db.Model):
    __tablename__ = 'client_subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id'), nullable=False)
    status = db.Column(db.String(20), default='active')  # active, suspended, cancelled, expired
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    auto_renew = db.Column(db.Boolean, default=True)
    custom_features = db.Column(db.Text, nullable=True)  # JSON string for custom feature overrides
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<ClientSubscription Client:{self.client_id} Plan:{self.plan_id}>'

class FeatureUsage(db.Model):
    __tablename__ = 'feature_usage'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    feature_id = db.Column(db.Integer, db.ForeignKey('features.id'), nullable=False)
    usage_count = db.Column(db.Integer, default=0)
    usage_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    client = db.relationship('Client', backref='feature_usage')
    feature = db.relationship('Feature', backref='usage_records')
    
    # Unique constraint to prevent duplicate usage records per day
    __table_args__ = (db.UniqueConstraint('client_id', 'feature_id', 'usage_date', name='unique_daily_usage'),)
    
    def __repr__(self):
        return f'<FeatureUsage Client:{self.client_id} Feature:{self.feature_id} Count:{self.usage_count}>'

