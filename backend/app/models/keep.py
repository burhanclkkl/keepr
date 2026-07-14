from datetime import datetime
from app.database import db

class Keep(db.Model):
    __tablename__ = 'keeps'
    
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.Text, nullable=False)
    title = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)
    
    # Foreign Keys
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    is_favorite = db.Column(db.Boolean, default=False, nullable=False)
    is_pinned = db.Column(db.Boolean, default=False, nullable=False)
    
    reading_time_minutes = db.Column(db.Integer, nullable=True)
    reminder_at = db.Column(db.DateTime(timezone=True), nullable=True)
    is_reminder_sent = db.Column(db.Boolean, default=False, nullable=False)
    
    # Relationships
    category = db.relationship('Category', back_populates='keeps')
    
    def to_dict(self):
        return {
            'id': self.id,
            'url': self.url,
            'title': self.title,
            'description': self.description,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'user_id': self.user_id,
            'is_favorite': self.is_favorite,
            'is_pinned': self.is_pinned,
            'reading_time_minutes': self.reading_time_minutes,
            'reminder_at': self.reminder_at.isoformat() if self.reminder_at else None,
            'is_reminder_sent': self.is_reminder_sent,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
