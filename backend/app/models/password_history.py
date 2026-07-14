from datetime import datetime
from app.database import db

class PasswordHistory(db.Model):
    __tablename__ = 'password_histories'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'password_hash': self.password_hash,
            'created_at': self.created_at.isoformat()
        }
