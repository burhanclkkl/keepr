from datetime import datetime
from app.database import db

class Invitation(db.Model):
    __tablename__ = 'invitations'
    
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='CASCADE'), nullable=False)
    inviter_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False, index=True)
    role = db.Column(db.String(30), default='viewer', nullable=False) # 'viewer' or 'editor'
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    category_rel = db.relationship('Category', backref=db.backref('category_invitations', lazy=True, cascade="all, delete-orphan"))
    inviter_rel = db.relationship('User', backref=db.backref('user_sent_invitations', lazy=True, cascade="all, delete-orphan"))
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
        
    def to_dict(self):
        return {
            'id': self.id,
            'category_id': self.category_id,
            'category_name': self.category_rel.name if self.category_rel else None,
            'inviter_id': self.inviter_id,
            'inviter_username': self.inviter_rel.username if self.inviter_rel else None,
            'token': self.token,
            'role': self.role,
            'expires_at': self.expires_at.isoformat(),
            'is_used': self.is_used,
            'is_expired': self.is_expired(),
            'created_at': self.created_at.isoformat()
        }
