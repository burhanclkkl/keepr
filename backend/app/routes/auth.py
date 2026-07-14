from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, timezone
import os
import re
import time
import hmac
import hashlib
from werkzeug.security import check_password_hash
from app.database import db
from app.models.user import User
from app.models.category import Category
from app.models.password_history import PasswordHistory
from app.models.refresh_token import RefreshToken
from app.models.login_attempt import LoginAttempt
from app.utils.auth_helpers import generate_token, generate_refresh_token, token_required, check_pro_access
from app.utils.security_helpers import validate_password_strength
from app.utils.audit import log_audit
from app.utils.errors import server_error
from app.utils.verification_helpers import generate_otp, hash_otp, reset_verification_fields
from app.utils.mail_helper import send_verification_email_async, send_password_reset_email_async
from app.models.password_reset import PasswordReset

auth_bp = Blueprint('auth', __name__)

def create_auth_response(user):
    token = generate_token(user.id)
    refresh_token = generate_refresh_token(user.id)
    return jsonify({
        'token': token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    })

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')
    kvkk_accepted = data.get('kvkk_accepted', False)
    
    # 1. Enforce KVKK Check
    if not kvkk_accepted:
        return jsonify({'error': 'Kayıt olmak için KVKK Aydınlatma Metni\'ni onaylamanız gerekmektedir.'}), 400
        
    if not username or not email or not password:
        return jsonify({'error': 'Lütfen tüm alanları doldurun (username, email, password).'}), 400
        
    username = username.strip()
    email = email.strip()
    if full_name:
        full_name = full_name.strip()
        
    if not username or not email:
        return jsonify({'error': 'Kullanıcı adı veya e-posta boş bırakılamaz.'}), 400
        
    # Email format validation
    if '@' not in email or '.' not in email.split('@')[-1]:
        return jsonify({'error': 'Geçersiz e-posta adresi formatı.'}), 400
        
    # Password strength check
    password_error = validate_password_strength(password, username, email)
    if password_error:
        return jsonify({'error': password_error}), 400
        
    # Check if username exists
    username_exists = db.session.execute(
        db.select(User).filter_by(username=username)
    ).scalar_one_or_none()
    if username_exists:
        if username_exists.is_verified or username_exists.email != email:
            return jsonify({'error': 'Bu kullanıcı adı zaten alınmış.'}), 400
        
    # Check if email exists
    email_exists = db.session.execute(
        db.select(User).filter_by(email=email)
    ).scalar_one_or_none()
    
    if email_exists:
        if email_exists.is_verified:
            return jsonify({'error': 'Bu e-posta adresi zaten kullanımda.'}), 400
        else:
            # 2. Recycle unverified account
            try:
                email_exists.username = username
                email_exists.full_name = full_name
                email_exists.set_password(password)
                
                # Regenerate verification fields
                otp = generate_otp()
                email_exists.verification_code_hash = hash_otp(otp)
                email_exists.verification_code_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)
                email_exists.verification_last_sent_at = datetime.now(timezone.utc).replace(tzinfo=None)
                email_exists.verification_attempts = 0
                email_exists.verification_locked_until = None
                
                # Update KVKK details
                email_exists.kvkk_accepted = True
                email_exists.kvkk_accepted_at = datetime.now(timezone.utc).replace(tzinfo=None)
                email_exists.kvkk_version = os.environ.get('KVKK_CURRENT_VERSION', '2026-07')
                
                db.session.commit()
                
                # Async send verification email
                send_verification_email_async(email, otp)
                
                log_audit(email_exists.id, 'OTP_SENT', 'Verification code sent for recycled unverified account')
                
                return jsonify({
                    'message': 'Kayıt işlemi devam ediyor. Lütfen e-postanıza gönderilen 6 haneli doğrulama kodunu girin.',
                    'email': email,
                    'verification_pending': True
                }), 200
            except Exception as e:
                db.session.rollback()
                return server_error('Kayıt işlemi sırasında bir hata oluştu.')
        
    try:
        # 3. Create new user
        new_user = User(
            username=username, 
            email=email, 
            full_name=full_name,
            is_verified=False,
            kvkk_accepted=True,
            kvkk_accepted_at=datetime.now(timezone.utc).replace(tzinfo=None),
            kvkk_version=os.environ.get('KVKK_CURRENT_VERSION', '2026-07')
        )
        new_user.set_password(password)
        
        # Generate verification code
        otp = generate_otp()
        new_user.verification_code_hash = hash_otp(otp)
        new_user.verification_code_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)
        new_user.verification_last_sent_at = datetime.now(timezone.utc).replace(tzinfo=None)
        new_user.verification_attempts = 0
        
        db.session.add(new_user)
        db.session.flush()  # Flush to get the new user's ID
        
        # Create default categories for this user
        default_categories = [
            {'name': 'Okuma', 'icon': 'book-open'},
            {'name': 'Alışveriş', 'icon': 'shopping-bag'},
            {'name': 'İzleme', 'icon': 'video'},
            {'name': 'Genel', 'icon': 'bookmark'}
        ]
        for cat_data in default_categories:
            category = Category(
                name=cat_data['name'], 
                icon=cat_data['icon'], 
                user_id=new_user.id
            )
            db.session.add(category)
            
        # Save password history
        pw_history = PasswordHistory(user_id=new_user.id, password_hash=new_user.password_hash)
        db.session.add(pw_history)
        db.session.commit()
        
        # Async send verification email
        send_verification_email_async(email, otp)
        
        # Audit Logs
        log_audit(new_user.id, 'REGISTER_INITIATED', 'User registered, verification code generated')
        log_audit(new_user.id, 'OTP_SENT', 'Verification code sent to user email')
        
        return jsonify({
            'message': 'Kayıt başarıyla oluşturuldu. Lütfen e-postanıza gönderilen 6 haneli doğrulama kodunu girin.',
            'email': email,
            'verification_pending': True
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return server_error('Kayıt işlemi sırasında bir hata oluştu.')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Lütfen e-posta ve şifrenizi girin.'}), 400
        
    # remote_addr güvenilir: proxy arkasındaysa ProxyFix ayarlar, değilse
    # gerçek istemci IP'sidir. Ham XFF header'ına GÜVENİLMEZ (spoofing).
    ip_address = request.remote_addr

    # Rate Limit Check
    fifteen_mins_ago = datetime.utcnow() - timedelta(minutes=15)
    thirty_mins_ago = datetime.utcnow() - timedelta(minutes=30)
    
    # 1. 30 Minutes Block Check (10+ failures)
    failed_attempts_30 = db.session.execute(
        db.select(LoginAttempt).filter(
            (LoginAttempt.ip_address == ip_address) | (LoginAttempt.email == email),
            LoginAttempt.was_successful == False,
            LoginAttempt.attempted_at >= thirty_mins_ago
        )
    ).scalars().all()
    
    if len(failed_attempts_30) >= 10:
        return jsonify({'error': 'Hesabınız veya IP adresiniz güvenlik amacıyla geçici olarak bloke edildi. Lütfen 30 dakika bekleyin.'}), 429
        
    # 2. 15 Minutes Block Check (5+ failures)
    failed_attempts_15 = [attempt for attempt in failed_attempts_30 if attempt.attempted_at >= fifteen_mins_ago]
    
    if len(failed_attempts_15) >= 5:
        return jsonify({'error': 'Çok fazla başarısız giriş denemesi yapıldı. Güvenliğiniz için lütfen 15 dakika bekleyin.'}), 429
        
    # Find user by email
    user = db.session.execute(
        db.select(User).filter_by(email=email)
    ).scalar_one_or_none()
    
    if not user or not user.check_password(password):
        # Log failure
        attempt = LoginAttempt(ip_address=ip_address, email=email, was_successful=False)
        db.session.add(attempt)
        db.session.commit()
        
        # Log audit
        log_audit(user.id if user else None, 'FAILED_LOGIN', f"Failed login attempt for email {email}")
        return jsonify({'error': 'Hatalı e-posta veya şifre.'}), 401
        
    # 4. Check if user is verified
    if not user.is_verified:
        log_audit(user.id, 'LOGIN_BLOCKED_UNVERIFIED', f"Login blocked for unverified email {email}")
        return jsonify({
            'error': 'E-posta adresiniz doğrulanmamış. Giriş yapmak için lütfen e-postanızı doğrulayın.',
            'email': email,
            'verification_pending': True
        }), 403

    # Log success
    attempt = LoginAttempt(ip_address=ip_address, email=email, was_successful=True)
    db.session.add(attempt)
    db.session.commit()
    
    log_audit(user.id, 'LOGIN', 'User logged in successfully')
    
    # Generate unified auth response
    response_data = create_auth_response(user).get_json()
    response_data['message'] = 'Giriş başarılı.'
    return jsonify(response_data), 200

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    data = request.get_json() or {}
    refresh_token = data.get('refresh_token')
    
    if not refresh_token:
        return jsonify({'error': 'Refresh token eksik.'}), 400
        
    ref_record = db.session.execute(
        db.select(RefreshToken).filter_by(token=refresh_token)
    ).scalar_one_or_none()
    
    # 1. Reuse detection
    if ref_record and ref_record.revoked:
        # Revoke all tokens for this user
        db.session.execute(
            db.update(RefreshToken).where(RefreshToken.user_id == ref_record.user_id).values(revoked=True)
        )
        db.session.commit()
        log_audit(ref_record.user_id, 'TOKEN_REUSE_DETECTED', f"Revoked refresh token presented: {refresh_token}. Revoked all user sessions.")
        return jsonify({'error': 'Güvenlik ihlali: Bu oturum anahtarı daha önce kullanılmış. Tüm oturumlarınız kapatıldı.'}), 401
        
    if not ref_record or ref_record.is_expired():
        return jsonify({'error': 'Geçersiz veya süresi dolmuş oturum.'}), 401
        
    # 2. Rotate token
    ref_record.revoked = True
    db.session.commit()
    
    new_access_token = generate_token(ref_record.user_id)
    new_refresh_token = generate_refresh_token(ref_record.user_id)
    
    return jsonify({
        'token': new_access_token,
        'refresh_token': new_refresh_token
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout_user(current_user):
    data = request.get_json() or {}
    refresh_token = data.get('refresh_token')
    if refresh_token:
        ref_record = db.session.execute(
            db.select(RefreshToken).filter_by(token=refresh_token, user_id=current_user.id)
        ).scalar_one_or_none()
        if ref_record:
            db.session.delete(ref_record)
            db.session.commit()
            
    log_audit(current_user.id, 'LOGOUT', 'User logged out successfully')
    return jsonify({'message': 'Başarıyla çıkış yapıldı.'}), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify(current_user.to_dict()), 200

@auth_bp.route('/me', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json() or {}
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')
    theme_mode = data.get('theme_mode')
    theme_color = data.get('theme_color')
    view_layout = data.get('view_layout')
    
    # Verify current password if altering sensitive fields
    is_altering_sensitive = (username is not None and username != current_user.username) or \
                           (email is not None and email != current_user.email) or \
                           (password is not None)
                           
    if is_altering_sensitive:
        current_password = data.get('current_password')
        if not current_password:
            return jsonify({
                'error': 'Bu değişiklikleri gerçekleştirmek için mevcut şifrenizi girmelisiniz.',
                'requires_password': True
            }), 400
        if not current_user.check_password(current_password):
            return jsonify({'error': 'Mevcut şifreniz yanlış.'}), 400

    if username is not None:
        username = username.strip()
        if not username:
            return jsonify({'error': 'Kullanıcı adı boş olamaz.'}), 400
        if username != current_user.username:
            username_exists = db.session.execute(
                db.select(User).filter_by(username=username)
            ).scalar_one_or_none()
            if username_exists:
                return jsonify({'error': 'Bu kullanıcı adı zaten alınmış.'}), 400
            log_audit(current_user.id, 'CHANGE_USERNAME', f"Username changed from '{current_user.username}' to '{username}'")
            current_user.username = username
        
    if email is not None:
        email = email.strip()
        if not email:
            return jsonify({'error': 'E-posta adresi boş olamaz.'}), 400
        if '@' not in email or '.' not in email.split('@')[-1]:
            return jsonify({'error': 'Geçersiz e-posta adresi formatı.'}), 400
        if email != current_user.email:
            email_exists = db.session.execute(
                db.select(User).filter_by(email=email)
            ).scalar_one_or_none()
            if email_exists:
                return jsonify({'error': 'Bu e-posta adresi zaten kullanımda.'}), 400
            log_audit(current_user.id, 'CHANGE_EMAIL', f"Email changed from '{current_user.email}' to '{email}'")
            current_user.email = email
        
    if password is not None:
        password_error = validate_password_strength(password, username or current_user.username, email or current_user.email)
        if password_error:
            return jsonify({'error': password_error}), 400
            
        # History check (last 5)
        history = db.session.execute(
            db.select(PasswordHistory).filter_by(user_id=current_user.id).order_by(PasswordHistory.created_at.desc()).limit(5)
        ).scalars().all()
        for entry in history:
            if check_password_hash(entry.password_hash, password):
                return jsonify({'error': 'Yeni şifreniz son 5 şifrenizden biri olamaz.'}), 400
                
        current_user.set_password(password)
        
        # Add history entry
        pw_history = PasswordHistory(user_id=current_user.id, password_hash=current_user.password_hash)
        db.session.add(pw_history)
        
        # Cleanup history (> 10 entries)
        all_histories = db.session.execute(
            db.select(PasswordHistory).filter_by(user_id=current_user.id).order_by(PasswordHistory.created_at.desc())
        ).scalars().all()
        if len(all_histories) > 10:
            for old_hist in all_histories[10:]:
                db.session.delete(old_hist)
                
        log_audit(current_user.id, 'CHANGE_PASSWORD', 'Password changed successfully')
        
    if 'full_name' in data:
        new_full_name = full_name.strip() if full_name else None
        if new_full_name != current_user.full_name:
            log_audit(current_user.id, 'CHANGE_FULL_NAME', f"Full name changed to '{new_full_name}'")
            current_user.full_name = new_full_name
        
    if theme_mode is not None:
        if not check_pro_access(current_user):
            return jsonify({
                'code': 'PRO_REQUIRED',
                'feature': 'theme',
                'message': 'Tema değiştirme özelliği yalnızca Keepr Pro kullanıcılarına özeldir.'
            }), 403
        theme_mode = theme_mode.strip().lower()
        if theme_mode not in ['light', 'dark']:
            return jsonify({'error': 'Geçersiz tema modu (light veya dark olmalıdır).'}), 400
        current_user.theme_mode = theme_mode
        
    if theme_color is not None:
        if not check_pro_access(current_user):
            return jsonify({
                'code': 'PRO_REQUIRED',
                'feature': 'theme',
                'message': 'Tema değiştirme özelliği yalnızca Keepr Pro kullanıcılarına özeldir.'
            }), 403
        theme_color = theme_color.strip().lower()
        if theme_color not in ['indigo', 'emerald', 'blue', 'rose', 'amber']:
            return jsonify({'error': 'Geçersiz tema rengi.'}), 400
        current_user.theme_color = theme_color
        
    if view_layout is not None:
        view_layout = view_layout.strip().lower()
        if view_layout not in ['grid', 'list']:
            return jsonify({'error': 'Geçersiz arayüz yerleşimi.'}), 400
        current_user.view_layout = view_layout
        
    try:
        db.session.commit()
        return jsonify({
            'message': 'Profil bilgileri güncellendi.',
            'user': current_user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return server_error('Güncelleme sırasında hata oluştu.')

@auth_bp.route('/me', methods=['DELETE'])
@token_required
def delete_account(current_user):
    data = request.get_json() or {}
    password = data.get('password')
    
    if not password:
        return jsonify({'error': 'Hesabınızı silmek için mevcut şifrenizi girmelisiniz.'}), 400
        
    if not current_user.check_password(password):
        return jsonify({'error': 'Şifreniz yanlış.'}), 400
        
    try:
        # Audit log first
        log_audit(current_user.id, 'DELETE_ACCOUNT', f"Account deleted for user '{current_user.username}'")
        
        # Delete user (CASCADE deletes keeps, categories, refresh tokens, histories)
        db.session.delete(current_user)
        db.session.commit()
        return jsonify({'message': 'Hesabınız ve tüm verileriniz kalıcı olarak silindi.'}), 200
    except Exception as e:
        db.session.rollback()
        return server_error('Hesap silinirken hata oluştu.')

@auth_bp.route('/verify-code', methods=['POST'])
def verify_code():
    data = request.get_json() or {}
    email = data.get('email')
    code = data.get('code')
    
    if not email or not code:
        return jsonify({'error': 'E-posta adresi ve doğrulama kodu zorunludur.'}), 400
        
    email = email.strip()
    code = code.strip()
    
    # Validate format of 6 digit code
    if not re.match(r'^\d{6}$', code):
        return jsonify({'error': 'Girdiğiniz doğrulama kodu geçersiz veya süresi dolmuş.'}), 400
        
    # Get user
    user = db.session.execute(
        db.select(User).filter_by(email=email)
    ).scalar_one_or_none()
    
    if not user:
        # Prevent timing/enumeration attacks by doing a dummy hmac comparison and returning generic error
        dummy_secret = 'dummy-secret-key-for-timing-mitigation'
        hmac.new(dummy_secret.encode(), code.encode(), hashlib.sha256).hexdigest()
        return jsonify({'error': 'Girdiğiniz doğrulama kodu geçersiz veya süresi dolmuş.'}), 400
        
    # Check lockout
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if user.verification_locked_until:
        if now < user.verification_locked_until:
            remaining = int((user.verification_locked_until - now).total_seconds() / 60)
            log_audit(user.id, 'OTP_LOCKED', 'Locked user attempted code verification')
            return jsonify({'error': f'Çok fazla hatalı kod denemesi yaptınız. Lütfen {remaining + 1} dakika sonra tekrar deneyin.'}), 403
        
    # Compare hash using constant time compare
    incoming_hash = hash_otp(code)
    db_hash = user.verification_code_hash
    
    if db_hash and hmac.compare_digest(db_hash, incoming_hash):
        # Code matched! Now check expiration
        if user.verification_code_expires_at and now < user.verification_code_expires_at:
            try:
                user.is_verified = True
                reset_verification_fields(user)
                db.session.commit()
                
                log_audit(user.id, 'OTP_VERIFIED', 'User email verified successfully')
                
                # Auto log-in by creating and returning JWT tokens
                return create_auth_response(user), 200
            except Exception as e:
                db.session.rollback()
                return server_error('Doğrulama sırasında bir hata oluştu.')
                
    # If code did not match or expired
    try:
        user.verification_attempts += 1
        if user.verification_attempts >= 5: # Limit reached
            user.verification_locked_until = now + timedelta(minutes=15)
            db.session.commit()
            log_audit(user.id, 'OTP_LOCKED', 'User OTP verification attempts locked for 15 minutes')
            return jsonify({'error': 'Çok fazla hatalı kod denemesi yaptınız. Güvenliğiniz için hesabınız 15 dakika boyunca kilitlendi.'}), 403
            
        db.session.commit()
    except Exception:
        db.session.rollback()
        
    log_audit(user.id, 'OTP_FAILED', 'Failed verification code attempt')
    return jsonify({'error': 'Girdiğiniz doğrulama kodu geçersiz veya süresi dolmuş.'}), 400

@auth_bp.route('/resend-code', methods=['POST'])
def resend_code():
    data = request.get_json() or {}
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'E-posta adresi zorunludur.'}), 400
        
    email = email.strip()
    
    # Query user
    user = db.session.execute(
        db.select(User).filter_by(email=email)
    ).scalar_one_or_none()
    
    # Generic success response to prevent email/username enumeration
    generic_success = jsonify({'message': 'E-posta adresinize yeni bir doğrulama kodu gönderildi.'}), 200
    
    if not user:
        # Sleep for a tiny random time or do dummy operations to mitigate timing analysis
        time.sleep(0.1)
        return generic_success
        
    # Throttle check
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if user.verification_last_sent_at:
        try:
            cooldown = int(os.environ.get('OTP_RESEND_SECONDS', '60'))
        except ValueError:
            cooldown = 60
        if now < user.verification_last_sent_at + timedelta(seconds=cooldown):
            remaining = int((user.verification_last_sent_at + timedelta(seconds=cooldown) - now).total_seconds())
            return jsonify({'error': f'Lütfen yeni kod istemeden önce {remaining} saniye bekleyin.'}), 429
            
    # Reset attempts and lock if requesting a new code
    try:
        otp = generate_otp()
        user.verification_code_hash = hash_otp(otp)
        user.verification_code_expires_at = now + timedelta(minutes=10)
        user.verification_last_sent_at = now
        user.verification_attempts = 0
        user.verification_locked_until = None
        db.session.commit()
        
        # Dispatch email asynchronously in daemon thread
        send_verification_email_async(email, otp)
        log_audit(user.id, 'OTP_RESENT', 'Verification code regenerated and resent')
    except Exception as e:
        db.session.rollback()
        return server_error('Kod gönderilirken bir sorun oluştu.')
        
    return generic_success

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Şifre sıfırlama kodu ister. Kullanıcı sayımını (enumeration) önlemek için
    her durumda generic başarı yanıtı döner."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip()

    generic_success = (jsonify({
        'message': 'Eğer bu e-posta kayıtlıysa, şifre sıfırlama kodu gönderildi.'
    }), 200)

    if not email:
        return jsonify({'error': 'E-posta adresi zorunludur.'}), 400

    user = db.session.execute(
        db.select(User).filter_by(email=email)
    ).scalar_one_or_none()

    # Kullanıcı yoksa veya doğrulanmamışsa: sızıntı yapma, generic dön.
    if not user or not user.is_verified:
        time.sleep(0.1)
        return generic_success

    now = datetime.utcnow()

    # Cooldown: son 60 sn içinde istek varsa sessizce yenisini gönderme.
    last_reset = db.session.execute(
        db.select(PasswordReset).filter_by(user_id=user.id)
        .order_by(PasswordReset.created_at.desc())
    ).scalars().first()
    if last_reset and (now - last_reset.created_at).total_seconds() < 60:
        return generic_success

    try:
        # Önceki kullanılmamış kodları geçersiz kıl.
        db.session.execute(
            db.update(PasswordReset)
            .where(PasswordReset.user_id == user.id, PasswordReset.used == False)
            .values(used=True)
        )
        code = generate_otp()
        reset = PasswordReset(
            user_id=user.id,
            code_hash=hash_otp(code),
            expires_at=now + timedelta(minutes=15),
            attempts=0,
            used=False,
        )
        db.session.add(reset)
        db.session.commit()

        send_password_reset_email_async(email, code)
        log_audit(user.id, 'PASSWORD_RESET_REQUESTED', 'Password reset code generated and sent')
    except Exception:
        db.session.rollback()
        return server_error('Şifre sıfırlama isteği işlenirken bir hata oluştu.')

    return generic_success


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """E-posta + kod + yeni şifre ile şifreyi sıfırlar. Başarılıysa tüm
    oturumlar (refresh token) iptal edilir."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip()
    code = (data.get('code') or '').strip()
    new_password = data.get('new_password') or data.get('password')

    if not email or not code or not new_password:
        return jsonify({'error': 'E-posta, kod ve yeni şifre zorunludur.'}), 400

    generic_error = jsonify({'error': 'Girdiğiniz kod geçersiz veya süresi dolmuş.'}), 400

    if not re.match(r'^\d{6}$', code):
        return generic_error

    user = db.session.execute(
        db.select(User).filter_by(email=email)
    ).scalar_one_or_none()
    if not user:
        # Timing/enumeration azaltma: dummy hmac
        hmac.new(b'dummy-secret', code.encode(), hashlib.sha256).hexdigest()
        return generic_error

    now = datetime.utcnow()
    reset = db.session.execute(
        db.select(PasswordReset).filter_by(user_id=user.id, used=False)
        .order_by(PasswordReset.created_at.desc())
    ).scalars().first()

    if not reset or reset.is_expired():
        return generic_error

    # Deneme limiti (brute-force koruması)
    if reset.attempts >= 5:
        reset.used = True
        db.session.commit()
        log_audit(user.id, 'PASSWORD_RESET_LOCKED', 'Too many invalid reset code attempts')
        return jsonify({'error': 'Çok fazla hatalı deneme. Lütfen yeni bir sıfırlama kodu isteyin.'}), 429

    # Sabit zamanlı karşılaştırma
    if not hmac.compare_digest(reset.code_hash, hash_otp(code)):
        try:
            reset.attempts += 1
            db.session.commit()
        except Exception:
            db.session.rollback()
        log_audit(user.id, 'PASSWORD_RESET_FAILED', 'Invalid reset code attempt')
        return generic_error

    # Kod doğru — yeni şifreyi doğrula
    password_error = validate_password_strength(new_password, user.username, user.email)
    if password_error:
        return jsonify({'error': password_error}), 400

    # Son 5 şifre tekrarını engelle
    history = db.session.execute(
        db.select(PasswordHistory).filter_by(user_id=user.id)
        .order_by(PasswordHistory.created_at.desc()).limit(5)
    ).scalars().all()
    for entry in history:
        if check_password_hash(entry.password_hash, new_password):
            return jsonify({'error': 'Yeni şifreniz son 5 şifrenizden biri olamaz.'}), 400

    try:
        user.set_password(new_password)
        db.session.add(PasswordHistory(user_id=user.id, password_hash=user.password_hash))
        reset.used = True
        # GÜVENLİK: şifre değişince tüm aktif oturumları iptal et.
        db.session.execute(
            db.update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked=True)
        )
        db.session.commit()
        log_audit(user.id, 'PASSWORD_RESET_SUCCESS', 'Password reset successfully; all sessions revoked')
    except Exception:
        db.session.rollback()
        return server_error('Şifre sıfırlanırken bir hata oluştu.')

    return jsonify({'message': 'Şifreniz başarıyla sıfırlandı. Lütfen yeni şifrenizle giriş yapın.'}), 200


@auth_bp.route('/upgrade-mock', methods=['POST'])
@token_required
def upgrade_mock(current_user):
    """Mocks upgrading/toggling a user's subscription to Pro or Team.

    GÜVENLİK: Bu endpoint ödeme doğrulaması YAPMAZ; herhangi bir kullanıcının
    kendini ücretsiz Pro/Team yapmasına izin verir. Üretimde ASLA erişilebilir
    olmamalıdır — yalnızca geliştirme/demo ortamında çalışır.
    """
    from flask import current_app
    if current_app.config.get('IS_PRODUCTION'):
        log_audit(current_user.id, 'MOCK_UPGRADE_BLOCKED',
                  'Attempt to use mock upgrade endpoint in production')
        return jsonify({'error': 'Bu işlem kullanılamıyor.'}), 404
    try:
        if current_user.is_pro:
            current_user.is_pro = False
            current_user.subscription_type = 'free'
            current_user.subscription_source = 'none'
            current_user.pro_since = None
            current_user.pro_expires_at = None
            log_audit(current_user.id, 'MOCK_DOWNGRADE', 'User toggled subscription back to Free')
            message = 'Aboneliğiniz sonlandırıldı (Ücretsiz sürüme geçtiniz).'
        else:
            data = request.get_json(silent=True) or {}
            target_tier = data.get('target_tier', 'pro')
            if target_tier not in ('pro', 'team'):
                target_tier = 'pro'
            
            current_user.is_pro = True
            current_user.subscription_type = target_tier
            current_user.subscription_source = 'mock'
            current_user.pro_since = datetime.utcnow()
            current_user.pro_expires_at = datetime.utcnow() + timedelta(days=365) # 1 year
            log_audit(current_user.id, 'MOCK_UPGRADE', f'User upgraded subscription to {target_tier} via mock payment')
            message = f'Keepr {target_tier.capitalize()} aboneliğiniz başarıyla aktif edildi! Tüm premium özelliklerin kilidi açıldı.'
            
        db.session.commit()
        return jsonify({
            'message': message,
            'user': current_user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print("❌ Error inside upgrade_mock route:")
        traceback.print_exc()
        return server_error('Abonelik işlemi sırasında hata oluştu.')

