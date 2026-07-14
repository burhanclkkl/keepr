import sys
sys.path.insert(0, '/Users/burhan/Desktop/keepr/backend')
from app import create_app
from app.database import db
import sqlalchemy as sa

app = create_app()
with app.app_context():
    with db.engine.connect() as conn:
        try:
            conn.execute(sa.text('ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE'))
            conn.commit()
            print("✅ Successfully added parent_id column with CASCADE FK to categories table.")
        except Exception as e:
            if 'already exists' in str(e).lower():
                print("⚠️ Column parent_id already exists, skipping.")
            else:
                print(f"❌ Error adding parent_id: {e}")
print("Subfolders DB Migration complete.")
