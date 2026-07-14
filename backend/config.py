import os
from dotenv import load_dotenv

load_dotenv()

# Bilinen zayıf/varsayılan anahtarlar — üretimde reddedilir.
_WEAK_SECRETS = {
    None, '', 'keepr-super-secret-key-change-in-prod',
    'change-me', 'secret', 'changeme',
}


def _is_production():
    return os.environ.get('FLASK_ENV', 'development').lower() == 'production'


def _require_secret(name):
    """Ortam değişkeninden secret okur. Üretimde eksik/zayıf ise uygulamayı başlatmaz."""
    value = os.environ.get(name)
    if _is_production():
        if value in _WEAK_SECRETS or (value and len(value) < 32):
            raise RuntimeError(
                f"[GÜVENLİK] '{name}' üretimde ayarlanmamış veya zayıf. "
                f"Güçlü bir değer üretin: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )
        return value
    # Geliştirmede fallback'e izin ver (yalnızca lokal).
    return value or 'dev-only-insecure-secret-do-not-use-in-prod'


class Config:
    # Flask secret
    SECRET_KEY = _require_secret('SECRET_KEY')

    # JWT secret — SECRET_KEY'den FARKLI olmalı.
    JWT_SECRET_KEY = _require_secret('JWT_SECRET_KEY')
    if _is_production() and JWT_SECRET_KEY == SECRET_KEY:
        raise RuntimeError(
            "[GÜVENLİK] JWT_SECRET_KEY, SECRET_KEY ile aynı olamaz. Ayrı değerler kullanın."
        )

    # Database
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
        # Heroku style postgres url fix for SQLAlchemy
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = DATABASE_URL or 'postgresql://postgres:postgres@localhost:5432/keepr'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    try:
        JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))
    except ValueError:
        JWT_EXPIRATION_HOURS = 24

    # CORS Config — üretimde '*' reddedilir (whitelist zorunlu).
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
    if _is_production() and CORS_ORIGINS.strip() == '*':
        raise RuntimeError(
            "[GÜVENLİK] Üretimde CORS_ORIGINS '*' olamaz. İzinli origin(ler)i belirtin, "
            "örn: CORS_ORIGINS=https://keepr.app"
        )

    # Ortam bayrağı (debug ve mock endpoint guard'ları bunu kullanır).
    IS_PRODUCTION = _is_production()

    # Güvenilen ters proxy (Nginx/Cloudflare) katman sayısı.
    # 0 => hiç proxy yok, X-Forwarded-For'a GÜVENME (spoofing önlenir).
    # 1 => tek bir güvenilen proxy arkasında, XFF'in son 1 hop'una güven.
    try:
        TRUST_PROXY_HOPS = int(os.environ.get('TRUST_PROXY_HOPS', '0'))
    except ValueError:
        TRUST_PROXY_HOPS = 0
