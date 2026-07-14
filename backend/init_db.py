import sys
from app import create_app
from app.database import db

def initialize_database():
    app = create_app()
    with app.app_context():
        print(f"Bağlanılan Veritabanı: {app.config['SQLALCHEMY_DATABASE_URI']}")
        try:
            print("Veritabanı tabloları oluşturuluyor...")
            db.create_all()
            
            # Run schema migrations to add theme & settings fields if they do not exist
            print("Veritabanı göçleri (Theme & Settings) uygulanıyor...")
            with db.engine.begin() as conn:
                from sqlalchemy import text
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(20) DEFAULT 'light';"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_color VARCHAR(30) DEFAULT 'indigo';"))
            
            print("PostgreSQL veritabanı ve göçleri başarıyla oluşturuldu/uygulandı!")
        except Exception as e:
            print("\nHATA: Tablolar/Göçler oluşturulamadı!")
            print(f"Hata Detayı: {str(e)}")
            print("\nLütfen PostgreSQL servisinizin çalıştığından ve '.env' dosyasındaki veritabanı bağlantı bilgilerinizin doğru olduğundan emin olun.")

if __name__ == '__main__':
    initialize_database()
