import unittest
import sys
import json
import os
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

sys.path.insert(0, '/Users/burhan/Desktop/keepr/backend')
from app import create_app
from app.database import db
from app.models.user import User
from app.models.category import Category
from app.models.keep import Keep
from datetime import datetime, timezone

class TestSubfoldersHierarchy(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            # Clean up existing test users to prevent IntegrityError
            User.query.filter(User.username.in_(['team_user', 'pro_user'])).delete(synchronize_session=False)
            db.session.commit()
            
            # Create a Team user (verified)
            self.team_user = User(
                username='team_user',
                email='team@keepr.com',
                password_hash='dummy_hash',
                is_pro=True,
                subscription_type='team',
                is_verified=True
            )
            db.session.add(self.team_user)
            
            # Create a Pro user (verified)
            self.pro_user = User(
                username='pro_user',
                email='pro@keepr.com',
                password_hash='dummy_hash',
                is_pro=True,
                subscription_type='pro',
                is_verified=True
            )
            db.session.add(self.pro_user)
            
            db.session.commit()
            self.team_user_id = self.team_user.id
            self.pro_user_id = self.pro_user.id

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def get_token_headers(self, user_id):
        # Generate token using app helper inside app context
        with self.app.app_context():
            from app.utils.auth_helpers import generate_token
            token = generate_token(user_id)
            return {'Authorization': f'Bearer {token}'}

    def test_subfolder_logical_restrictions(self):
        with self.app.app_context():
            # 1. Create a root category for the Team user
            root_cat = Category(name='Yazılım', icon='folder', user_id=self.team_user_id)
            db.session.add(root_cat)
            db.session.commit()
            root_cat_id = root_cat.id

        headers = self.get_token_headers(self.team_user_id)
        
        # 2. Team user creates a subfolder successfully
        res = self.client.post('/api/categories', headers=headers, json={
            'name': 'Python',
            'icon': 'code',
            'parent_id': root_cat_id
        })
        self.assertEqual(res.status_code, 201)
        sub_cat_data = json.loads(res.data)
        self.assertEqual(sub_cat_data['parent_id'], root_cat_id)
        sub_cat_id = sub_cat_data['id']

        # 3. Pro user attempts to create a subfolder under their own category -> Should get 403
        with self.app.app_context():
            pro_root = Category(name='Tasarım', icon='folder', user_id=self.pro_user_id)
            db.session.add(pro_root)
            db.session.commit()
            pro_root_id = pro_root.id

        pro_headers = self.get_token_headers(self.pro_user_id)
        res = self.client.post('/api/categories', headers=pro_headers, json={
            'name': 'Figma',
            'parent_id': pro_root_id
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn('TEAM_REQUIRED', res.data.decode())

        # 4. Team user attempts to set a subfolder under another subfolder (depth 3) -> Should get 400
        res = self.client.post('/api/categories', headers=headers, json={
            'name': 'Django',
            'parent_id': sub_cat_id
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('derinlik', json.loads(res.data)['error'])

        # 5. Team user attempts to set circular parenting on update -> Should get 400
        res = self.client.put(f'/api/categories/{sub_cat_id}', headers=headers, json={
            'parent_id': sub_cat_id
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('kendisinin alt klasörü olamaz', json.loads(res.data)['error'])

        # 6. Team user attempts to share the subfolder directly -> Should get 400
        res = self.client.post(f'/api/categories/{sub_cat_id}/share', headers=headers, json={
            'is_public': True
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('Alt klasörler bağımsız olarak paylaşıma açılamaz', json.loads(res.data)['error'])

        # 6b. Pro user attempts to share their root category -> Should get 403 (TEAM_REQUIRED)
        res = self.client.post(f'/api/categories/{pro_root_id}/share', headers=pro_headers, json={
            'is_public': True
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn('TEAM_REQUIRED', json.loads(res.data)['code'])

        # 7. Team user shares the root category and verifies the public retrieval endpoint includes subcategories & keeps
        res = self.client.post(f'/api/categories/{root_cat_id}/share', headers=headers, json={
            'is_public': True
        })
        self.assertEqual(res.status_code, 200)
        root_shared_data = json.loads(res.data)
        share_slug = root_shared_data['share_slug']

        # Add keeps to both root and subcategory
        with self.app.app_context():
            k1 = Keep(url='https://python.org', title='Python Docs', user_id=self.team_user_id, category_id=root_cat_id)
            k2 = Keep(url='https://django.org', title='Django Web', user_id=self.team_user_id, category_id=sub_cat_id)
            db.session.add_all([k1, k2])
            db.session.commit()

        # Call public endpoint
        res = self.client.get(f'/api/categories/shared/{share_slug}')
        self.assertEqual(res.status_code, 200)
        public_data = json.loads(res.data)
        
        self.assertEqual(public_data['category']['name'], 'Yazılım')
        self.assertEqual(len(public_data['keeps']), 1)
        self.assertEqual(public_data['keeps'][0]['title'], 'Python Docs')
        
        self.assertEqual(len(public_data['subcategories']), 1)
        self.assertEqual(public_data['subcategories'][0]['name'], 'Python')
        self.assertEqual(len(public_data['subcategories'][0]['keeps']), 1)
        self.assertEqual(public_data['subcategories'][0]['keeps'][0]['title'], 'Django Web')

if __name__ == '__main__':
    unittest.main()
