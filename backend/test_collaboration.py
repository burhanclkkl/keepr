import os
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

import unittest
import json
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import create_app
from app.database import db
from app.models.user import User
from app.models.category import Category
from app.models.keep import Keep
from app.models.category_collaborator import CategoryCollaborator
from app.models.invitation import Invitation

class TestCollaborationInfrastructure(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            
            # Clean up existing test users if any
            User.query.filter(User.username.in_(['team_user', 'collab_user', 'free_user'])).delete(synchronize_session=False)
            db.session.commit()
            
            # 1. Create a Team user (Owner of category)
            self.team_user = User(username='team_user', email='team@keepr.app', subscription_type='team', is_verified=True)
            self.team_user.set_password('TestPass123!')
            db.session.add(self.team_user)
            
            # 2. Create another user (Collaborator)
            self.collab_user = User(username='collab_user', email='collab@keepr.app', subscription_type='free', is_verified=True)
            self.collab_user.set_password('TestPass123!')
            db.session.add(self.collab_user)
            
            # 3. Create a Free user (to test tier gating block)
            self.free_user = User(username='free_user', email='free@keepr.app', subscription_type='free', is_verified=True)
            self.free_user.set_password('TestPass123!')
            db.session.add(self.free_user)
            
            db.session.commit()
            
            # Get IDs
            self.team_user_id = self.team_user.id
            self.collab_user_id = self.collab_user.id
            self.free_user_id = self.free_user.id

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def get_token(self, email, password):
        resp = self.client.post('/api/auth/login', json={
            'email': email,
            'password': password
        })
        return json.loads(resp.data.decode('utf-8'))['token']

    def test_collaboration_and_invitations(self):
        # Retrieve Bearer tokens
        team_token = self.get_token('team@keepr.app', 'TestPass123!')
        collab_token = self.get_token('collab@keepr.app', 'TestPass123!')
        free_token = self.get_token('free@keepr.app', 'TestPass123!')
        
        headers_team = {'Authorization': f'Bearer {team_token}'}
        headers_collab = {'Authorization': f'Bearer {collab_token}'}
        headers_free = {'Authorization': f'Bearer {free_token}'}
        
        # Step 1: Create a category for the Team User
        resp = self.client.post('/api/categories', headers=headers_team, json={
            'name': 'Team Work'
        })
        self.assertEqual(resp.status_code, 201)
        team_cat = json.loads(resp.data.decode('utf-8'))
        team_cat_id = team_cat['id']
        
        # Step 2: Attempt invitation from Free user (gating check)
        resp = self.client.post('/api/invite', headers=headers_free, json={
            'category_id': team_cat_id,
            'role': 'editor'
        })
        self.assertEqual(resp.status_code, 403) # TEAM_REQUIRED
        
        # Step 3: Create invitation from Team user
        resp = self.client.post('/api/invite', headers=headers_team, json={
            'category_id': team_cat_id,
            'role': 'editor'
        })
        self.assertEqual(resp.status_code, 201)
        invite_data = json.loads(resp.data.decode('utf-8'))
        invite_token = invite_data['token']
        self.assertEqual(invite_data['role'], 'editor')
        
        # Step 4: Access public invitation details
        resp = self.client.get(f'/api/invite/{invite_token}')
        self.assertEqual(resp.status_code, 200)
        details = json.loads(resp.data.decode('utf-8'))
        self.assertEqual(details['category_name'], 'Team Work')
        self.assertEqual(details['inviter_username'], 'team_user')
        
        # Step 5: Accept invitation from Collab User
        resp = self.client.post(f'/api/invite/{invite_token}/accept', headers=headers_collab)
        self.assertEqual(resp.status_code, 200)
        
        # Step 6: Verify Collab User is listed as collaborator
        resp = self.client.get(f'/api/collaborators/category/{team_cat_id}', headers=headers_team)
        self.assertEqual(resp.status_code, 200)
        collaborators = json.loads(resp.data.decode('utf-8'))
        self.assertEqual(len(collaborators), 1)
        self.assertEqual(collaborators[0]['username'], 'collab_user')
        self.assertEqual(collaborators[0]['role'], 'editor')
        
        # Step 7: Retrieve categories list for Collab User to ensure shared categories are loaded
        resp = self.client.get('/api/categories', headers=headers_collab)
        self.assertEqual(resp.status_code, 200)
        collab_cats = json.loads(resp.data.decode('utf-8'))
        self.assertEqual(len(collab_cats), 1)
        self.assertEqual(collab_cats[0]['id'], team_cat_id)
        self.assertEqual(collab_cats[0]['collaborator_role'], 'editor')
        
        # Step 8: Team user creates a Keep in the shared category (makes team user owner)
        resp = self.client.post('/api/keeps', headers=headers_team, json={
            'url': 'https://google.com',
            'title': 'Google search',
            'description': 'Search engine',
            'category_id': team_cat_id
        })
        self.assertEqual(resp.status_code, 201)
        keep_data = json.loads(resp.data.decode('utf-8'))
        keep_id = keep_data['id']
        
        # Step 9: Make Collab User a 'viewer' and verify they are blocked from adding keeps
        with self.app.app_context():
            collab_assoc = CategoryCollaborator.query.filter_by(category_id=team_cat_id, user_id=self.collab_user_id).first()
            collab_assoc.role = 'viewer'
            db.session.commit()
            
        resp = self.client.post('/api/keeps', headers=headers_collab, json={
            'url': 'https://apple.com',
            'title': 'Apple',
            'category_id': team_cat_id
        })
        self.assertEqual(resp.status_code, 403) # Blocked (viewer)
        
        # Step 10: Verify viewer is blocked from updating owner's keeps inside shared category
        resp = self.client.put(f'/api/keeps/{keep_id}', headers=headers_collab, json={
            'title': 'New Google Title'
        })
        self.assertEqual(resp.status_code, 403) # Blocked (viewer)
        
        # Step 11: Verify viewer is blocked from deleting owner's keeps inside shared category
        resp = self.client.delete(f'/api/keeps/{keep_id}', headers=headers_collab)
        self.assertEqual(resp.status_code, 403) # Blocked (viewer)

if __name__ == '__main__':
    unittest.main()
