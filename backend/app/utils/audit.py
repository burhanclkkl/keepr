import sys
from flask import request
from app.database import db
from app.models.audit_log import AuditLog

def log_audit(user_id, action, details=None):
    try:
        # remote_addr güvenilir: proxy arkasındaysa ProxyFix (TRUST_PROXY_HOPS)
        # doğru IP'yi ayarlar; değilse ham XFF header'ına güvenilmez (spoofing).
        ip = request.remote_addr

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
