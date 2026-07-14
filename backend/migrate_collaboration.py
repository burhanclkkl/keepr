import sys
sys.path.insert(0, '/Users/burhan/Desktop/keepr/backend')
from app import create_app
from app.database import db

app = create_app()
with app.app_context():
    print("Ortak çalışma ve davetiye tabloları oluşturuluyor...")
    try:
        db.create_all()
        print("Tablolar başarıyla oluşturuldu ve B-Tree indeksleri eklendi!")
    except Exception as e:
        print(f"Hata: {e}")
