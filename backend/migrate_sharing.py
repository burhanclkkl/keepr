import sys
sys.path.insert(0, '/Users/burhan/Desktop/keepr/backend')
from app import create_app
from app.database import db
import sqlalchemy as sa

app = create_app()
with app.app_context():
    with db.engine.connect() as conn:
        for col, defn in [
            ('is_public', 'BOOLEAN NOT NULL DEFAULT FALSE'),
            ('share_slug', 'VARCHAR(50) UNIQUE'),
        ]:
            try:
                conn.execute(sa.text(f'ALTER TABLE categories ADD COLUMN {col} {defn}'))
                conn.commit()
                print(f'✅ Added column {col} to categories table')
            except Exception as e:
                if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
                    print(f'⚠️ Column {col} already exists, skipping')
                else:
                    print(f'❌ Error on {col}: {e}')
print("Migration completed successfully.")
