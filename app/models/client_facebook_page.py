"""
Client Facebook Page Model
Stores Facebook page information for each client
"""

from app import db
from datetime import datetime

class ClientFacebookPage(db.Model):
    """Model for storing client Facebook page information"""
    
    __tablename__ = 'client_facebook_pages'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    page_id = db.Column(db.String(255), nullable=False, unique=True)
    page_name = db.Column(db.String(255), nullable=False)
    access_token = db.Column(db.Text, nullable=False)
    permissions = db.Column(db.ARRAY(db.String), default=[])
    is_active = db.Column(db.Boolean, default=True)
    compliance_level = db.Column(db.String(50), default='standard')  # standard, healthcare, medical
    last_sync = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    client = db.relationship('Client', backref=db.backref('facebook_pages', lazy=True))
    
    def __repr__(self):
        return f'<ClientFacebookPage {self.page_name} for {self.client.client_name}>'
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'client_id': self.client_id,
            'page_id': self.page_id,
            'page_name': self.page_name,
            'permissions': self.permissions,
            'is_active': self.is_active,
            'compliance_level': self.compliance_level,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def get_active_pages_for_client(cls, client_id):
        """Get all active Facebook pages for a client"""
        return cls.query.filter_by(client_id=client_id, is_active=True).all()
    
    @classmethod
    def get_page_by_page_id(cls, page_id):
        """Get Facebook page by page ID"""
        return cls.query.filter_by(page_id=page_id, is_active=True).first()
    
    def update_token(self, new_token):
        """Update the access token"""
        self.access_token = new_token
        self.updated_at = datetime.utcnow()
        db.session.commit()
    
    def deactivate(self):
        """Deactivate the Facebook page"""
        self.is_active = False
        self.updated_at = datetime.utcnow()
        db.session.commit()
    
    def activate(self):
        """Activate the Facebook page"""
        self.is_active = True
        self.updated_at = datetime.utcnow()
        db.session.commit()
