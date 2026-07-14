from datetime import datetime
from app.database import db

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    icon = db.Column(db.String(50), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    is_public = db.Column(db.Boolean, default=False, nullable=False)
    share_slug = db.Column(db.String(50), unique=True, nullable=True, index=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to get children subcategories
    subcategories = db.relationship('Category', backref=db.backref('parent', remote_side=[id]), lazy=True, cascade="all, delete-orphan")
    
    # Relationship with keeps: keeps remain when category is deleted (will be set to null)
    keeps = db.relationship('Keep', back_populates='category', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'icon': self.icon,
            'user_id': self.user_id,
            'parent_id': self.parent_id,
            'is_public': self.is_public,
            'share_slug': self.share_slug,
            'created_at': self.created_at.isoformat()
        }
