from datetime import datetime
from app.database import db

class LoginAttempt(db.Model):
    __tablename__ = 'login_attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    attempted_at = db.Column(db.DateTime, default=datetime.utcnow)
    was_successful = db.Column(db.Boolean, default=False, nullable=False)
