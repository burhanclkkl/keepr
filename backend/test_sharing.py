import os
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

import sys
sys.path.insert(0, '/Users/burhan/Desktop/keepr/backend')
from app import create_app
from app.database import db
from app.models.user import User
from app.models.category import Category
from app.models.keep import Keep
from app.utils.auth_helpers import generate_token
import json
import unittest

class SharingTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
        # Seed test users dynamically
        self.user1 = User(username='user1', email='user1@keepr.app', subscription_type='team', is_verified=True)
        self.user1.set_password('TestPass123!')
        self.user2 = User(username='user2', email='user2@keepr.app', subscription_type='free', is_verified=True)
        self.user2.set_password('TestPass123!')
        db.session.add(self.user1)
        db.session.add(self.user2)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_sharing_flow(self):
        # Generate tokens
        token1 = generate_token(self.user1.id)
        token2 = generate_token(self.user2.id)
        
        # 2. Create a test category for User1 (team)
        cat = Category(name="Test Shared Collection", user_id=self.user1.id)
        db.session.add(cat)
        db.session.commit()
        
        # Add a keep to this category
        keep = Keep(
            url="https://github.com/google/keepr",
            title="Keepr Shared Public Project",
            description="Testing public sharing details",
            category_id=cat.id,
            user_id=self.user1.id
        )
        db.session.add(keep)
        db.session.commit()
        
        headers1 = {'Authorization': f'Bearer {token1}'}
        headers2 = {'Authorization': f'Bearer {token2}'}
        
        # 3. Test Ownership Authorization: User2 should not be able to share User1's category
        res = self.client.post(f'/api/categories/{cat.id}/share', 
                               data=json.dumps({'is_public': True}),
                               content_type='application/json',
                               headers=headers2)
        self.assertEqual(res.status_code, 404, "Should reject unauthorized share attempts with 404")
        
        # Verify category is still private
        db.session.refresh(cat)
        self.assertFalse(cat.is_public)
        self.assertIsNone(cat.share_slug)
        
        # 4. Test Authorized Share: User1 (team) shares their own category
        res = self.client.post(f'/api/categories/{cat.id}/share', 
                               data=json.dumps({'is_public': True}),
                               content_type='application/json',
                               headers=headers1)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['is_public'])
        self.assertIsNotNone(data['share_slug'])
        
        db.session.refresh(cat)
        self.assertTrue(cat.is_public)
        self.assertIsNotNone(cat.share_slug)
        
        slug = cat.share_slug
        
        # 5. Test Public Anonymous GET (No token header)
        res = self.client.get(f'/api/categories/shared/{slug}')
        self.assertEqual(res.status_code, 200, "Public anonymous fetch should return 200 OK")
        shared_data = json.loads(res.data)
        
        self.assertEqual(shared_data['category']['name'], "Test Shared Collection")
        self.assertEqual(shared_data['category']['username'], self.user1.username)
        self.assertEqual(len(shared_data['keeps']), 1)
        self.assertEqual(shared_data['keeps'][0]['title'], "Keepr Shared Public Project")
        
        # 6. Test Unshare (Toggle is_public to False)
        res = self.client.post(f'/api/categories/{cat.id}/share', 
                               data=json.dumps({'is_public': False}),
                               content_type='application/json',
                               headers=headers1)
        self.assertEqual(res.status_code, 200)
        
        db.session.refresh(cat)
        self.assertFalse(cat.is_public)
        self.assertIsNone(cat.share_slug)
        
        # 7. Test Public GET after unsharing (Should return 404)
        res = self.client.get(f'/api/categories/shared/{slug}')
        self.assertEqual(res.status_code, 404, "Unshared collections should return 404 Not Found")
        
        print("✅ All sharing endpoint tests passed successfully!")

if __name__ == '__main__':
    unittest.main()
