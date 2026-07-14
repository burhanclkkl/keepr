import sys
sys.path.insert(0, '/Users/burhan/Desktop/keepr/backend')
from app import create_app
from app.database import db
import sqlalchemy as sa

app = create_app()
with app.app_context():
    with db.engine.connect() as conn:
        for col, defn in [
            ('reading_time_minutes', 'INTEGER'),
            ('reminder_at', 'TIMESTAMP'),
            ('is_reminder_sent', 'BOOLEAN DEFAULT FALSE'),
        ]:
            try:
                conn.execute(sa.text(f'ALTER TABLE keeps ADD COLUMN {col} {defn}'))
                conn.commit()
                print(f'✅ Added {col} to keeps table')
            except Exception as e:
                if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
                    print(f'⚠️ {col} already exists, skipping')
                else:
                    print(f'❌ Error on {col}: {e}')
print('Migration complete.')
