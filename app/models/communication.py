"""
Communication Model
"""

from app import db
from datetime import datetime

class Communication(db.Model):
    __tablename__ = 'communications'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    communication_type = db.Column(db.String(50), nullable=False)  # email, phone, meeting, report
    subject = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    direction = db.Column(db.String(20), nullable=False)  # inbound, outbound
    status = db.Column(db.String(20), default='sent', index=True)  # sent, delivered, read, replied
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Communication {self.subject}>'

