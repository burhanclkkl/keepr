"""
Şifre sıfırlama (forgot-password) için password_resets tablosunu oluşturur.
Kullanım:  python migrate_password_reset.py
"""
from app import create_app
from app.database import db
from app.models.password_reset import PasswordReset

app = create_app()
with app.app_context():
    try:
        PasswordReset.__table__.create(bind=db.engine, checkfirst=True)
        print("OK: password_resets tablosu oluşturuldu (veya zaten mevcut).")
    except Exception as e:
        print(f"HATA: password_resets tablosu oluşturulamadı: {e}")
print("Password reset DB migration tamamlandı.")
