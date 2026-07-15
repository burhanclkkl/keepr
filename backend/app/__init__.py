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
    from app.extensions import limiter
    limiter.init_app(app)
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
        import sqlalchemy as sa
        from datetime import datetime, timezone
        from app.utils.mail_helper import check_smtp_status

        # 1. Database Connection check
        db_status = 'healthy'
        db_details = ''
        try:
            db.session.execute(sa.text('SELECT 1')).scalar()
            db_details = 'Database connection is active.'
        except Exception as e:
            db_status = 'unhealthy'
            db_details = str(e)

        # 2. SMTP Health check
        smtp_check = check_smtp_status()

        # 3. Scheduler Daemon check
        scheduler_status = 'unhealthy'
        scheduler_details = ''
        scheduler_last_run = app.config.get('SCHEDULER_LAST_RUN')
        if scheduler_last_run:
            try:
                last_run_dt = datetime.fromisoformat(scheduler_last_run)
                # If scheduler ran in the last 60 seconds, it is healthy
                now = datetime.now(timezone.utc)
                delta = (now - last_run_dt).total_seconds()
                if delta < 60:
                    scheduler_status = 'healthy'
                scheduler_details = f"Last run was {delta:.1f} seconds ago."
            except Exception as e:
                scheduler_details = f"Error checking time: {e}"
        else:
            scheduler_details = "Scheduler has not run yet."

        overall_status = 'healthy' if (db_status == 'healthy' and scheduler_status == 'healthy' and smtp_check['status'] != 'error') else 'degraded'

        return {
            'status': overall_status,
            'database': {
                'status': db_status,
                'details': db_details
            },
            'smtp': smtp_check,
            'scheduler': {
                'status': scheduler_status,
                'details': scheduler_details
            }
        }, 200 if overall_status == 'healthy' else 500

    return app
