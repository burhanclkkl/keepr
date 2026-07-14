import os
import secrets
import string
import hmac
import hashlib
from flask import current_app

def generate_otp():
    """Generates a random numeric verification code using cryptographically secure secrets."""
    try:
        length = int(os.environ.get('OTP_LENGTH', '6'))
    except ValueError:
        length = 6
    return "".join(secrets.choice(string.digits) for _ in range(length))

def hash_otp(code):
    """Signs and hashes the OTP code using HMAC SHA-256 and the application SECRET_KEY."""
    secret = current_app.config.get('SECRET_KEY', 'keepr-super-secret-key-change-in-prod')
    return hmac.new(secret.encode(), code.encode(), hashlib.sha256).hexdigest()

def reset_verification_fields(user):
    """Clears all OTP-related fields from the user record upon successful verification."""
    user.verification_code_hash = None
    user.verification_code_expires_at = None
    user.verification_attempts = 0
    user.verification_locked_until = None
