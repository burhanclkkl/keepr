from datetime import datetime
from app.database import db

class CategoryCollaborator(db.Model):
    __tablename__ = 'category_collaborators'
    
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    role = db.Column(db.String(30), default='viewer', nullable=False) # 'viewer' or 'editor'
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships - Avoid backref conflicts with user/category cascading deletion
    category_rel = db.relationship('Category', backref=db.backref('collaborator_associations', lazy=True, cascade="all, delete-orphan"))
    user_rel = db.relationship('User', backref=db.backref('collaboration_associations', lazy=True, cascade="all, delete-orphan"))
    
    __table_args__ = (
        db.UniqueConstraint('category_id', 'user_id', name='uq_category_user_collaborator'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'category_id': self.category_id,
            'user_id': self.user_id,
            'username': self.user_rel.username if self.user_rel else None,
            'email': self.user_rel.email if self.user_rel else None,
            'role': self.role,
            'joined_at': self.joined_at.isoformat()
        }
