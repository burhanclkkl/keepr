import os
import threading
import time
from datetime import datetime, timezone
from app import create_app

app = create_app()

def start_reminder_scheduler(flask_app):
    def run_scheduler():
        # Wait a few seconds for app startup
        time.sleep(5)
        print("[Scheduler] Background reminder scheduler started.")
        while True:
            try:
                with flask_app.app_context():
                    from app.models.keep import Keep
                    from app.models.user import User
                    from app.database import db
                    from app.utils.mail_helper import send_reminder_email_async
                    
                    now = datetime.now(timezone.utc)
                    due_keeps = Keep.query.filter(
                        Keep.reminder_at <= now,
                        Keep.is_reminder_sent == False,
                        Keep.reminder_at != None
                    ).all()
                    
                    if due_keeps:
                        for keep in due_keeps:
                            keep.is_reminder_sent = True
                            user = db.session.get(User, keep.user_id)
                            print(f"[Reminder] Alarm triggered for Keep {keep.id} (User: {keep.user_id})")
                            if user and user.email:
                                send_reminder_email_async(user.email, keep.title or keep.url, keep.url)
                        db.session.commit()
            except Exception as e:
                print(f"[Scheduler Error] {e}")
            time.sleep(30)

    thread = threading.Thread(target=run_scheduler, daemon=True)
    thread.start()

if __name__ == '__main__':
    # Start background reminder scheduler thread
    start_reminder_scheduler(app)
    
    port = int(os.environ.get('PORT', 5055))
    app.run(host='0.0.0.0', port=port, debug=True)
