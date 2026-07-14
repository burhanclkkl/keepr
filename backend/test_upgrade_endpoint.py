import sys
sys.path.insert(0, '/Users/burhan/Desktop/keepr/backend')
from app import create_app
from app.database import db
from app.models.user import User
from app.utils.auth_helpers import generate_token

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        user = User.query.first()
        if not user:
            print("No user found in database!")
            sys.exit(0)
        
        # Generate valid JWT token for this user
        token = generate_token(user.id)
        
        print(f"Triggering mock upgrade endpoint via Flask Test Client for user: {user.username}")
        client = app.test_client()
        
        # Send POST request with authorization header
        response = client.post(
            '/api/auth/upgrade-mock',
            headers={'Authorization': f'Bearer {token}'},
            json={'target_tier': 'pro'}
        )
        
        print("Response Status Code:", response.status_code)
        print("Response Body:", response.get_json())
