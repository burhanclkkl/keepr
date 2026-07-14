from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.database import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=True)
    theme_mode = db.Column(db.String(20), default='light', nullable=False)
    theme_color = db.Column(db.String(30), default='emerald', nullable=False)
    view_layout = db.Column(db.String(20), default='grid', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Verification (OTP) Fields
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_code_hash = db.Column(db.String(64), nullable=True)
    verification_code_expires_at = db.Column(db.DateTime, nullable=True)
    verification_last_sent_at = db.Column(db.DateTime, nullable=True)
    verification_attempts = db.Column(db.Integer, default=0, nullable=False)
    verification_locked_until = db.Column(db.DateTime, nullable=True)
    
    # KVKK Audit Fields
    kvkk_accepted = db.Column(db.Boolean, default=False, nullable=False)
    kvkk_accepted_at = db.Column(db.DateTime, nullable=True)
    kvkk_version = db.Column(db.String(20), default='2026-07', nullable=True)
    
    # Pro Subscription Fields
    is_pro = db.Column(db.Boolean, default=False, nullable=False)
    subscription_type = db.Column(db.String(30), default='free', nullable=False)
    subscription_source = db.Column(db.String(30), default='none', nullable=False)
    pro_since = db.Column(db.DateTime, nullable=True)
    pro_expires_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    keeps = db.relationship('Keep', backref='owner', lazy=True, cascade="all, delete-orphan")
    categories = db.relationship('Category', backref='owner', lazy=True, cascade="all, delete-orphan")
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'theme_mode': self.theme_mode,
            'theme_color': self.theme_color,
            'view_layout': self.view_layout,
            'created_at': self.created_at.isoformat(),
            'is_verified': self.is_verified,
            'kvkk_accepted': self.kvkk_accepted,
            'is_pro': self.is_pro,
            'subscription_type': self.subscription_type,
            'subscription_source': self.subscription_source,
            'pro_since': self.pro_since.isoformat() if self.pro_since else None,
            'pro_expires_at': self.pro_expires_at.isoformat() if self.pro_expires_at else None
        }
