import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from app.database import db
from app.models.user import User

import secrets

def generate_token(user_id):
    """Generates a JWT token for the user (access token, valid for 15 minutes)."""
    try:
        expiration = datetime.utcnow() + timedelta(minutes=15)
        payload = {
            'exp': expiration,
            'iat': datetime.utcnow(),
            'sub': user_id
        }
        token = jwt.encode(
            payload,
            current_app.config.get('JWT_SECRET_KEY'),
            algorithm='HS256'
        )
        return token
    except Exception as e:
        return None

def generate_refresh_token(user_id):
    """Generates a cryptographically secure refresh token (valid for 7 days) and saves it to the database."""
    try:
        from app.models.refresh_token import RefreshToken
        token = secrets.token_urlsafe(64)
        expires_at = datetime.utcnow() + timedelta(days=7)
        
        ref_token = RefreshToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
        db.session.add(ref_token)
        db.session.commit()
        return token
    except Exception as e:
        return None

def token_required(f):
    """Decorator to require a valid JWT token on endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Format: "Bearer <token>"
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Geçersiz yetkilendirme başlığı formatı. Bearer <token> formatında olmalıdır.'}), 401
                
        if not token:
            return jsonify({'error': 'Yetkilendirme tokenı eksik.'}), 401
            
        try:
            # Decode token
            payload = jwt.decode(
                token,
                current_app.config.get('JWT_SECRET_KEY'),
                algorithms=['HS256']
            )
            user_id = payload['sub']
            # Using session.get as preferred in SQLAlchemy 3.x+
            current_user = db.session.get(User, user_id)
            if not current_user:
                return jsonify({'error': 'Kullanıcı bulunamadı.'}), 401
            if not current_user.is_verified:
                return jsonify({'error': 'E-posta adresiniz doğrulanmamış. Lütfen hesabınızı onaylayın.'}), 403
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Oturum süresi doldu. Lütfen tekrar giriş yapın.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Geçersiz yetkilendirme tokenı.'}), 401
            
        return f(current_user, *args, **kwargs)
        
    return decorated

def check_tier_access(user, min_tier='pro'):
    """Returns True if the user subscription_type meets the minimum tier."""
    if not user:
        return False
    TIER_LEVELS = {'free': 0, 'pro': 1, 'team': 2}
    user_tier = getattr(user, 'subscription_type', 'free') or 'free'
    from datetime import datetime, timezone
    if hasattr(user, 'pro_expires_at') and user.pro_expires_at:
        try:
            expires = user.pro_expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires:
                return False
        except Exception:
            pass
    return TIER_LEVELS.get(user_tier, 0) >= TIER_LEVELS.get(min_tier, 1)

def check_pro_access(user):
    """Backward-compatible alias for check_tier_access(user, 'pro')."""
    return check_tier_access(user, min_tier='pro')
