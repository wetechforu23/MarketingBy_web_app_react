"""
Client Google Ads Credentials Model
Stores OAuth credentials for each client's Google Ads account
"""

from app import db
from datetime import datetime

class ClientGoogleAds(db.Model):
    __tablename__ = 'client_google_ads'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False, unique=True)
    
    # OAuth credentials
    access_token = db.Column(db.Text, nullable=True)
    refresh_token = db.Column(db.Text, nullable=True)
    token_uri = db.Column(db.String(255), nullable=True)
    client_id_google = db.Column(db.String(255), nullable=True)
    client_secret_google = db.Column(db.String(255), nullable=True)
    scopes = db.Column(db.Text, nullable=True)
    
    # Status and tracking
    is_active = db.Column(db.Boolean, default=True)
    authorized_at = db.Column(db.DateTime, nullable=True)
    authorized_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    revoked_at = db.Column(db.DateTime, nullable=True)
    revoked_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    last_used_at = db.Column(db.DateTime, nullable=True)
    
    # Google Ads account info
    google_ads_customer_id = db.Column(db.String(50), nullable=True)
    google_ads_account_name = db.Column(db.String(255), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = db.relationship('Client', backref='google_ads_credentials')
    authorized_by_user = db.relationship('User', foreign_keys=[authorized_by], backref='authorized_google_ads')
    revoked_by_user = db.relationship('User', foreign_keys=[revoked_by], backref='revoked_google_ads')
    
    def __repr__(self):
        return f'<ClientGoogleAds {self.client.client_name if self.client else self.client_id}>'
    
    def get_credentials(self):
        """Get Google OAuth credentials object"""
        from google.oauth2.credentials import Credentials
        
        if not self.is_active or not self.refresh_token:
            return None
            
        return Credentials(
            token=self.access_token,
            refresh_token=self.refresh_token,
            token_uri=self.token_uri,
            client_id=self.client_id_google,
            client_secret=self.client_secret_google,
            scopes=self.scopes.split(',') if self.scopes else []
        )
    
    def is_authorized(self):
        """Check if client has valid Google Ads authorization"""
        return self.is_active and self.refresh_token is not None
    
    def update_last_used(self):
        """Update last used timestamp"""
        self.last_used_at = datetime.utcnow()
        db.session.commit()
