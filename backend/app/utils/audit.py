import sys
from flask import request
from app.database import db
from app.models.audit_log import AuditLog

def log_audit(user_id, action, details=None):
    try:
        ip = request.remote_addr
        # Check for proxy headers (Nginx, Cloudflare, etc.)
        if request.headers.get('X-Forwarded-For'):
            ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
        
        log = AuditLog(
            user_id=user_id,
            action=action,
            ip_address=ip,
            details=details
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Audit log failed: {str(e)}", file=sys.stderr)
