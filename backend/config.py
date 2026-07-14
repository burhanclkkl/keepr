import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask Key
    SECRET_KEY = os.environ.get('SECRET_KEY', 'keepr-super-secret-key-change-in-prod')
    
    # Database
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
        # Heroku style postgres url fix for SQLAlchemy
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_DATABASE_URI = DATABASE_URL or 'postgresql://postgres:postgres@localhost:5432/keepr'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Config
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
    try:
        JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))
    except ValueError:
        JWT_EXPIRATION_HOURS = 24
        
    # CORS Config
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
