from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from app.database import db
from config import Config

migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Güvenilen proxy arkasındaysa (TRUST_PROXY_HOPS>0), X-Forwarded-For'u
    # yalnızca o kadar hop için işle; böylece request.remote_addr güvenilir olur.
    # Aksi halde XFF hiç dikkate alınmaz (istemci spoofing'i etkisiz).
    trust_hops = app.config.get('TRUST_PROXY_HOPS', 0)
    if trust_hops and trust_hops > 0:
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=trust_hops, x_proto=trust_hops)

    # Initialize Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    # Configure CORS with origins from environment config.
    # Virgülle ayrılmış liste destekle: "https://a.com,https://b.com"
    raw_origins = app.config.get('CORS_ORIGINS', '*')
    if raw_origins.strip() == '*':
        allowed_origins = '*'
    else:
        allowed_origins = [o.strip() for o in raw_origins.split(',') if o.strip()]
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
    
    # Import models to ensure they are registered with SQLAlchemy
    from app.models.user import User
    from app.models.category import Category
    from app.models.keep import Keep
    from app.models.audit_log import AuditLog
    from app.models.password_history import PasswordHistory
    from app.models.refresh_token import RefreshToken
    from app.models.login_attempt import LoginAttempt
    from app.models.category_collaborator import CategoryCollaborator
    from app.models.invitation import Invitation
    from app.models.password_reset import PasswordReset
    
    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.categories import categories_bp
    from app.routes.keeps import keeps_bp
    from app.routes.collaborations import collaborations_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(categories_bp, url_prefix='/api/categories')
    app.register_blueprint(keeps_bp, url_prefix='/api/keeps')
    app.register_blueprint(collaborations_bp, url_prefix='/api')
    
    @app.after_request
    def set_security_headers(response):
        # MIME-sniffing engelle
        response.headers['X-Content-Type-Options'] = 'nosniff'
        # Clickjacking engelle (API iframe'de gömülmemeli)
        response.headers['X-Frame-Options'] = 'DENY'
        # Referrer sızıntısını azalt
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        # Tarayıcı özelliklerini kısıtla
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        # JSON API için sıkı CSP (hiçbir aktif içerik gerekmiyor)
        response.headers['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'"
        # HSTS yalnızca üretimde (HTTPS zorunlu)
        if app.config.get('IS_PRODUCTION'):
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response

    @app.route('/health', methods=['GET'])
    def health_check():
        return {'status': 'healthy', 'message': 'Keepr API is up and running'}, 200

    return app
