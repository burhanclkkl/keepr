import sys
sys.path.insert(0, '/Users/burhan/Desktop/keepr/backend')
from app import create_app
from app.database import db
from app.models.user import User
from datetime import datetime, timedelta, timezone

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        user = User.query.first()
        if not user:
            print("No user found in database!")
            sys.exit(0)
        print(f"Testing upgrade mock for user: {user.username} (Current status: {user.is_pro})")
        try:
            if user.is_pro:
                user.is_pro = False
                user.subscription_type = 'free'
                user.subscription_source = 'none'
                user.pro_since = None
                user.pro_expires_at = None
                print("Downgraded user successfully")
            else:
                target_tier = 'pro'
                user.is_pro = True
                user.subscription_type = target_tier
                user.subscription_source = 'mock'
                # Check timezone usage: datetime.now(timezone.utc).replace(tzinfo=None)
                user.pro_since = datetime.now(timezone.utc).replace(tzinfo=None)
                user.pro_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=365)
                print("Upgraded user successfully")
            db.session.commit()
            print("DB commit success!")
        except Exception as e:
            db.session.rollback()
            print("❌ Error during upgrade mock execution:")
            import traceback
            traceback.print_exc()
