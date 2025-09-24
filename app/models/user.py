"""
User Model
"""

from app import db, login_manager
from flask_login import UserMixin
from datetime import datetime
import hashlib
import secrets

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='customer', index=True)
    client_website = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
    def set_password(self, password):
        """Set password with fallback hashing"""
        try:
            from werkzeug.security import generate_password_hash
            # Use pbkdf2:sha256 method which is more compatible
            self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')
        except Exception as e:
            # Fallback to pbkdf2_hmac
            salt = secrets.token_hex(16)
            pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
            self.password_hash = salt + pwdhash.hex()
    
    def check_password(self, password):
        """Check password with fallback verification"""
        try:
            from werkzeug.security import check_password_hash
            return check_password_hash(self.password_hash, password)
        except ImportError:
            # Fallback verification
            try:
                salt = self.password_hash[:32]
                stored_hash = self.password_hash[32:]
                pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
                return pwdhash.hex() == stored_hash
            except:
                # Ultimate fallback to simple hash
                return hashlib.sha256(password.encode()).hexdigest() == self.password_hash
    
    def __repr__(self):
        return f'<User {self.username}>'
