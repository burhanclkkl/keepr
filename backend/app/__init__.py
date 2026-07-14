from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from app.database import db
from config import Config

migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    # Configure CORS with origins from environment config
    allowed_origins = app.config.get('CORS_ORIGINS', '*')
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
    
    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.categories import categories_bp
    from app.routes.keeps import keeps_bp
    from app.routes.collaborations import collaborations_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(categories_bp, url_prefix='/api/categories')
    app.register_blueprint(keeps_bp, url_prefix='/api/keeps')
    app.register_blueprint(collaborations_bp, url_prefix='/api')
    
    @app.route('/health', methods=['GET'])
    def health_check():
        return {'status': 'healthy', 'message': 'Keepr API is up and running'}, 200
        
    return app
