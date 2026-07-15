# Keepr — Master Documentation & Reference Manual

**200 sekme mi açık bırakıyorsun?**  
Keepr, *"bunu sonra okuyorum"* diyerek tarayıcı köşelerinde unutulan, kaybolan veya tarayıcı sekmelerini şişiren tüm dijital bağlantıların (link, video, makale, alışveriş öğesi) düzenli ve güvenli bir şekilde saklandığı yerdir. 

Bu döküman, Keepr uygulamasının mimarisini, teknik çalışma mekanizmalarını (veri akışları, güvenlik algoritmaları, abonelik planları) ve geliştirme yol haritasını eksiksiz olarak açıklamaktadır.

---

## 📌 İçindekiler

1. [Mimari Yapı & Mimarisi](#1-mimari-yapı--mimarisi)
2. [Teknoloji Yığını (Tech Stack)](#2-teknoloji-yığını-tech-stack)
3. [Detaylı Çalışma Mekanizmaları (Under the Hood)](#3-detaylı-çalışma-mekanizmaları-under-the-hood)
    *   [Kimlik Doğrulama & HMAC-SHA256 OTP Akışı](#a-kimlik-doğrulama--hmac-sha256-otp-akışı)
    *   [Güvenlik, Brute-Force & Audit Logları](#b-güvenlik-brute-force--audit-logları)
    *   [Meta-Veri Ayrıştırıcı & Okuma Süresi Algoritması](#c-meta-veri-ayrıştırıcı--okuma-süresi-algoritması)
    *   [Akıllı Alarm Hatırlatıcı & Asenkron Scheduler](#d-akıllı-alarm-hatırlatıcı--asenkron-scheduler)
    *   [Kullanıcı Paket Kısıtlamaları (Feature Gating)](#e-kullanıcı-paket-kısıtlamaları-feature-gating)
    *   [Web Pano Algılama & Klavye Kısayolları](#f-web-pano-algılama--klavye-kısayolları)
    *   [Mobil OS Paylaşım Entegrasyonu (Share Extension)](#g-mobil-os-paylaşım-entegrasyonu-share-extension)
4. [Veritabanı Şeması & İlişkileri](#4-veritabanı-şeması--ilişkileri)
5. [Ortam Değişkenleri (.env)](#5-ortam-değişkenleri-env)
6. [Kurulum & Sunucu Çalıştırma Rehberi](#6-kurulum--sunucu-çalıştırma-rehberi)
7. [API Uç Noktaları (API Endpoints)](#7-api-uç-noktaları-api-endpoints)
8. [Yapılacaklar & Gelecek Yol Haritası (Roadmap & TODO)](#8-yapılacaklar--gelecek-yol-haritası-roadmap--todo)

---

## 1. Mimari Yapı & Mimarisi

Keepr, monorepo biçiminde tasarlanmış olup 3 temel bileşenden oluşur:
```
keepr/
├── backend/          # Flask REST API (Port: 5055)
├── frontend/         # React web uygulaması (Port: 5173)
├── mobile/           # Expo React Native uygulaması
```

### Sistem Akış Diyagramı
```
                 [Mobil Uygulama (Expo)]         [Web Arayüzü (Vite + React)]
                            │                                │
                            └───────────────┬────────────────┘
                                            │ HTTP (Bearer JWT)
                                            ▼
                                  [Flask REST API (:5055)]
                                            │
                     ┌──────────────────────┼──────────────────────┐
                     ▼                      ▼                      ▼
           [PostgreSQL DB]           [Asenkron Thread]     [Web Scraper Engine]
         (Şema ve Log Takibi)       (OTP & Hatırlatıcılar)  (cloudscraper + BS4)
```

---

## 2. Teknoloji Yığını (Tech Stack)

### Backend (Python/Flask)
*   **Flask 3.0.3:** RESTful API yönlendirme ve request/response yönetimi.
*   **Flask-SQLAlchemy & PostgreSQL:** Veri tabanı ORM katmanı ve ilişkisel veri modeli.
*   **PyJWT:** 15 dakikalık Access Token ve veritabanı kontrollü 7 günlük Refresh Token mimarisi.
*   **BeautifulSoup4 & cloudscraper:** Cloudflare bot korumalarını aşarak bağlantıların başlık (`og:title`), açıklama ve resim bilgilerini çeken kazıma motoru.
*   **Sanal Ortam (venv):** Bağımlılıkların izole çalışması için yapılandırılmış Python 3.9+ ortamı.

### Web Frontend (React/Vite)
*   **TypeScript:** Statik tip güvenliği.
*   **TanStack Query (React Query) v5:** Sunucu durum yönetimi, otomatik önbellek geçersiz kılma (`invalidateQueries`) ve optimistic UI güncellemeleri.
*   **Framer Motion:** Apple tarzı akıcı geçiş animasyonları ve modal kayma hareketleri.
*   **Vanilla CSS:** Esnek ve hızlı yüklenen Apple-tarzı minimal tasarım sistemi.

### Mobil Arayüz (React Native/Expo)
*   **Expo SDK 57:** Native derleme ve cihaz özellikleri erişimi.
*   **expo-share-intent:** İşletim sisteminin yerel "Paylaş" menüsünden Keepr uygulamasına doğrudan link gönderme entegrasyonu.
*   **lucide-react-native:** Premium SVG vektör ikon kütüphanesi.

---

## 3. Detaylı Çalışma Mekanizmaları (Under the Hood)

### A. Kimlik Doğrulama & HMAC-SHA256 OTP Akışı
Keepr, e-posta doğrulamasını güvenli bir OTP (One Time Password) akışı ile yönetir:
1.  **Kayıt (Registration):** Kullanıcı adı, e-posta, şifre ve KVKK onayı alınır. Hesap `is_verified = False` olarak oluşturulur.
2.  **Güvenli OTP Üretimi:** 6 haneli rastgele bir sayı kodu üretilir. Bu kod veritabanında düz metin olarak **saklanmaz**. Sunucu tarafındaki `SECRET_KEY` kullanılarak **HMAC-SHA256** ile şifrelenir ve yalnızca bu hash veritabanına (`otp_hash`) kaydedilir.
3.  **Asenkron Gönderim:** Kod, asenkron bir Python thread'i kullanılarak kullanıcının e-postasına gönderilir. API cevabı gecikmeden anında `201 Created (verification_pending: true)` koduyla döner.
4.  **Doğrulama (Verification):** Kullanıcının arayüze girdiği kod sunucuya gönderilir. Sunucu gelen kodu tekrar HMAC-SHA256 ile şifreler ve DB'deki hash ile zaman uyumlu (`hmac.compare_digest`) karşılaştırır. Eşleşme durumunda hesap doğrulanır (`is_verified = True`), OTP alanları sıfırlanır ve JWT tokenları teslim edilir.

### B. Güvenlik, Brute-Force & Audit Logları
*   **Brute-Force Koruması:** Giriş veya OTP doğrulama aşamasında IP adresi ve e-posta bazlı hatalı denemeler `login_attempts` tablosunda tutulur. 5 hatalı denemeyi aşan kullanıcılar 15 dakika boyunca kilitlenir (`verification_locked_until`).
*   **Parola Geçmişi Takibi:** Kullanıcı şifre güncellerken son kullandığı şifreleri tekrar kullanamaz (`password_history` tablosu). Yeni şifrelerin en az 12 karakter olması, büyük-küçük harf, rakam ve özel karakter içermesi zorunludur.
*   **Audit Logging (Denetim İzleri):** `log_audit()` fonksiyonu ile kullanıcının yaptığı tüm kritik işlemler (kayıt, giriş, silme, şifre değiştirme, toplu işlemler) IP adresiyle birlikte `audit_logs` tablosuna kaydedilir.

### C. Meta-Veri Ayrıştırıcı & Okuma Süresi Algoritması
Bir bağlantı sisteme eklendiğinde arka planda çalışan süreçler:
1.  **Metadata Scraper:** Gönderilen URL `cloudscraper` kütüphanesi ile çekilir. HTML kodu `BeautifulSoup` ile parse edilerek sırasıyla OpenGraph (`og:title`), Twitter Card (`twitter:title`) ve standart `<title>` etiketleri taranır. Resim ve açıklama etiketleri de benzer hiyerarşiyle toplanır.
2.  **Okuma Süresi Hesaplama:** Çekilen makale/içerik gövdesindeki tüm HTML etiketleri temizlenir. Kalan düz metindeki kelimeler regex ile sayılır (`word_count = len(re.findall(r'\w+', text))`). Standart bir insanın dakikada ortalama 200 kelime okuduğu kabul edilerek okuma süresi hesaplanır:
    $$\text{Okuma Süresi (dk)} = \max\left(1, \text{round}\left(\frac{\text{Kelime Sayısı}}{200}\right)\right)$$
    Bu değer `reading_time_minutes` alanında saklanır ve kartların üzerinde (örneğin: `5 dk okuma`) gösterilir.

### D. Akıllı Alarm Hatırlatıcı & Asenkron Scheduler
*   **Alarm Kurma:** Pro ve Team üyeleri, bir linke hatırlatma kurabilir (`reminder_at`). Tarih formatı ISO 8601 olarak alınır ve naive UTC zamanına dönüştürülerek kaydedilir.
*   **Daemon Scheduler:** Sunucu (`run.py`) başlatıldığında, ana Flask uygulamasının yanında arka planda daemon bir thread başlatılır. Bu thread her **30 saniyede bir** uyanır ve veritabanını tarar:
    ```sql
    SELECT * FROM keeps 
    WHERE reminder_at <= UTC_NOW() 
      AND is_reminder_sent = FALSE 
      AND reminder_at IS NOT NULL;
    ```
*   **E-posta Bildirimi:** Zamanı gelmiş bir alarm yakalandığında, sistem ilgili kullanıcının e-posta adresini çekerek asenkron bir SMTP görevi başlatır (`send_reminder_email_async`). E-posta şablonunda bağlantının başlığı, adresi ve "Bağlantıyı Aç" butonu yer alır. Gönderim bittiğinde `is_reminder_sent = True` olarak işaretlenir. E-posta sunucusu yapılandırılmamışsa sistem otomatik log fall-back moduna geçerek terminale çıktı verir.

### E. Kullanıcı Paket Kısıtlamaları (Feature Gating)
Kullanıcılar 3 farklı pakete sahip olabilir: **Free, Pro ve Team**.
*   `check_tier_access(user, min_tier)` kontrolcü dekoratörü ile API erişimleri kısıtlanır:
    *   **Temalar & Renk Değiştirme:** En az **Pro** üyeliği gerektirir.
    *   **Bağlantı Sabitleme (Pin) ve Favoriler:** En az **Pro** üyeliği gerektirir.
    *   **Akıllı Alarm Kurma:** En az **Pro** üyeliği gerektirir.
    *   **İç İçe Alt Klasörler & Ekip Paylaşımı:** En az **Team** üyeliği gerektirir.
*   Ödeme altyapısı entegrasyonuna hazırlık amacıyla `POST /api/auth/upgrade-mock` uç noktası üzerinden test amaçlı anlık paket yükseltmeleri (Pro veya Team) gerçekleştirilebilir.

### F. Web Pano Algılama & Klavye Kısayolları
*   **Pano Algılayıcı (Clipboard Detect):** Kullanıcı tarayıcı sekmesine odaklandığında (`window.focus`), `navigator.clipboard.readText()` API'si tetiklenir. Panoda geçerli bir web adresi bulunursa, ekranın alt orta kısmında Apple tarzı animasyonlu bir bildirim kartı belirir. Kullanıcı tek tıkla panodaki linki kütüphanesine kaydedebilir.
*   **Klavye Kısayolları (Keyboard Shortcuts):** `useKeepKeyboardShortcuts` hook'u sayesinde, listede odaklanmış bir kart üzerindeyken aşağıdaki tuşlarla hızlı aksiyonlar alınabilir:
    *   `F` : Favorilere Ekle / Kaldır
    *   `P` : Başa Sabitle / Kaldır
    *   `A` : Hatırlatıcı / Alarm Modalini Aç
    *   `Delete / Backspace` : Bağlantıyı Sil
    *   `Escape` : Detay panelini veya modalı kapat.

### G. Mobil OS Paylaşım Entegrasyonu (Share Extension)
*   Telefonun işletim sisteminde (iOS/Android) herhangi bir uygulamadayken (örneğin Safari, YouTube, Twitter) "Paylaş" butonuna dokunulup "Keepr" seçildiğinde `expo-share-intent` devreye girer.
*   Uygulama arka planda uyanır, paylaşılan URL'yi otomatik olarak yakalar, kaydetme modalını açarak kategori seçimi ile birlikte tek tıkla veritabanına gönderilmesini sağlar.

---

## 4. Veritabanı Şeması & İlişkileri

```
   ┌────────────────────────────────────────────────────────┐
   │                         users                          │
   ├────────────────────────────────────────────────────────┤
   │ id (PK)                                                │
   │ username (VARCHAR, Unique)                             │
   │ email (VARCHAR, Unique)                                │
   │ password_hash (VARCHAR)                                │
   │ is_verified (BOOLEAN)                                  │
   │ otp_hash (VARCHAR, Nullable)                           │
   │ subscription_type (VARCHAR: 'free', 'pro', 'team')     │
   │ is_pro (BOOLEAN)                                       │
   │ pro_expires_at (TIMESTAMP)                             │
   └──────────┬───────────────────────────────┬─────────────┘
              │ 1                             │ 1
              │                               │
              │ 1..N                          │ 1..N
   ┌──────────▼─────────────┐      ┌──────────▼─────────────┐
   │       categories       │      │         keeps          │
   ├────────────────────────┤      ├────────────────────────┤
   │ id (PK)                │      │ id (PK)                │
   │ name (VARCHAR)         │      │ url (TEXT)             │
   │ parent_id (FK → cat.id)│      │ title (TEXT)           │
   │ user_id (FK → users)   │      │ reading_time_minutes   │
   │ created_at (TIMESTAMP) │      │ reminder_at (TIMESTAMP)│
   └──────────┬─────────────┘      │ is_reminder_sent       │
              │ 1                  │ user_id (FK → users)   │
              │                    │ category_id (FK)       │
              │ 1..N (Nullable)    │                        │
              └────────────────────┼────────────────────────┘
                                   │
                                   ▼
                            [SET NULL / CASCADE]
```

---

## 5. Ortam Değişkenleri (.env)

Uygulamanın çalışması için `backend/` klasörü altında bir `.env` dosyası bulunmalıdır.

```env
SECRET_KEY=kendi-guclu-anahtariniz
JWT_SECRET_KEY=kendi-jwt-anahtariniz
JWT_EXPIRATION_HOURS=24

# PostgreSQL bağlantı adresi
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/keepr

# SMTP E-Posta Ayarları
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=epostaniz@gmail.com
MAIL_PASSWORD=google-uygulama-sifreniz
MAIL_FROM_NAME=Keepr
MAIL_FROM_EMAIL=no-reply@keepr.app
```

---

## 6. Kurulum & Sunucu Çalıştırma Rehberi

### Gereksinimler
*   Node.js (v18 veya üzeri)
*   Python (3.9 veya üzeri)
*   PostgreSQL (v14 veya üzeri)

### Veritabanı Hazırlama
PostgreSQL üzerinde `keepr` adında bir veritabanı oluşturun:
```bash
createdb keepr
```

### 1. Backend Kurulumu & Çalıştırılması
```bash
cd backend
python3 -m venv venv
source venv/bin/activate

# Kütüphaneleri yükleyin
pip install -r requirements.txt

# Tabloları oluşturun ve ilk kurulumu yapın
python init_db.py

# Sunucuyu ve arka plan scheduler'ını başlatın (Port: 5055)
python run.py
```

### 2. Web Frontend Kurulumu & Çalıştırılması
```bash
cd frontend
npm install
npm run dev
# Arayüz http://localhost:5173 adresinde ayağa kalkacaktır.
```

### 3. Mobil (Expo) Uygulamasının Başlatılması
```bash
cd mobile
npm install
npm run ios     # iOS Simülatör için
npm run android # Android Emülatör için
```

---

## 7. API Uç Noktaları (API Endpoints)

### Kimlik Doğrulama (`/api/auth`)
*   `POST /register` : Yeni kayıt oluşturur (OTP gönderir).
*   `POST /verify-otp` : 6 haneli OTP kodu doğrulaması.
*   `POST /login` : Giriş yapar (JWT ve Refresh Token döner).
*   `POST /refresh` : Access token yenileme.
*   `GET /me` : Profil bilgilerini getirir.
*   `PUT /me` : Profil ayarlarını (şifre, tema, düzen) günceller.
*   `POST /upgrade-mock` : Test amaçlı abonelik paketi yükseltme.

### Bağlantılar (`/api/keeps`)
*   `GET /` : Tüm bağlantıları getirir (arama ve kategori filtreli).
*   `POST /` : Yeni bağlantı ekler (metadata otomatik kazınır).
*   `PUT /<id>` : Bağlantı bilgilerini veya favori/sabitleme durumunu günceller.
*   `DELETE /<id>` : Bağlantıyı siler.
*   `POST /<id>/reminder` : Alarm/hatırlatıcı kurar veya kaldırır.
*   `POST /bulk-delete` : Toplu silme işlemi.
*   `POST /bulk-favorite` : Toplu favori durumu değiştirme.
*   `POST /bulk-move` : Toplu kategori değiştirme.

### Kategoriler (`/api/categories`)
*   `GET /` : Kullanıcının kategorilerini listeler.
*   `POST /` : Yeni kategori oluşturur.
*   `PUT /<id>` : Kategori adını değiştirir.
*   `DELETE /<id>` : Kategoriyi siler (içindeki linkler genel kategoriye düşer).

---

## 8. Yapılacaklar & Gelecek Yol Haritası (Roadmap & TODO)

### ✅ Son Geliştirmeler (Completed In Sprint)
*   **Ekip ve Ortak Klasör Altyapısı (Collaboration & Shared Folders):**
    *   Team paketi kullanıcıları için 48 saat geçerli, secure token tabanlı davet linki yapısı (`/api/collaborations/invite`).
    *   Rol tabanlı erişim kontrolü (Editor vs Viewer/Salt Okunur) yetkilendirmesi.
    *   Sorguların hızlandırılması amacıyla `category_collaborators` tablosundaki `user_id` alanına **B-Tree Index** indeksi eklenmesi.
    *   Web sidebar'da paylaşılan ana ve alt klasörlerin yanında mor renkli **EKİP** rozetleri.
    *   Mobil uygulamada ortak klasörlerin switcher tabında **Users** (kullanıcılar) ikonuyla gösterilmesi, salt okunur klasörlerde yeni bağlantı ekleme FAB butonunun uyarı vermesi ve inspector detay modalında edit/delete eylemlerinin tamamen gizlenerek salt okunur bildirim gösterilmesi.
*   **Gelişmiş Hiyerarşik Alt Klasörler (Nested Folders):** 
    *   Self-referential `parent_id` modeli ile maks. 2 derinlikte klasör yapısı (Kök -> Alt Klasör).
    *   Dairesel referans koruması ve derinlik aşımı doğrulama kuralları (Backend & Frontend).
    *   Web sidebar'da Chevron collapsible ağaç tasarımı ve Mobil Modal üzerinde horizontal parent seçici barı.
*   **Abonelik Yetki Kontrolleri (Feature Gating):** 
    *   Premium kısıtlamalar: Tema/renk değişimi, alarm hatırlatıcılar (**Pro**); alt klasör ekleme/taşıma ve koleksiyon paylaşımı (**Team**).
    *   Geçersiz abonelik isteklerinde uyarı ve Apple stili upgrade modalları.
*   **Sosyal Paylaşım Seçenekleri:** 
    *   Kök kategorilerin salt-okunur web sayfası olarak paylaşıma açılması (`is_public`, `share_slug` entegrasyonu).
    *   Paylaşılan sayfalarda alt klasörleri de içeren responsive akordeon kart görünümleri ve dinamik search filtreleme.
    *   Açık/Paylaşılan klasörlerin yanında yeşil dünya (`Globe`) ikonu ve `AÇIK` rozetleri ile görsel bütünlük (Web Sidebar & Mobil Switcher).
*   **Akıllı Alarm Hatırlatıcı:** Asenkron scheduler thread'i ile zamanı gelen keeps alarm bildirimlerinin SMTP mail olarak gönderilmesi.
*   **Web Pano Algılayıcı & Apple Kısayolları:** Tarayıcı sekmesine dönüldüğünde panodaki linki yakalayıp hızlı kaydetme balonu ve `F`, `P`, `A` hızlı klavye kısayolları.
*   **Test İzolasyonu:** PostgreSQL dev sunucu verilerinin korunması amacıyla test paketinin (`test_subfolders.py`) izole **SQLite in-memory** DB üzerinde çalıştırılması.

### 📌 Gelecek Yol Haritası (Roadmap & TODO)
*   [ ] **Gerçek E-posta Sunucu Entegrasyonu:** SMTP e-posta sunucusu ile uygulama şifrelerinin canlı doğrulamalarının yapılması ve `.env` yapılandırması.
*   [ ] **Detaylı İstatistikler:** Kullanıcının en çok kaydettiği siteleri, haftalık/aylık okuma alışkanlıklarını raporlayan grafiksel analiz paneli.
*   [ ] **Çevrimdışı Mod (Offline Sync):** İnternet bağlantısı koptuğunda verilerin lokal bellekte (IndexedDB / SecureStore) saklanıp bağlantı gelen ilk anda senkronize edilmesi.


git push origin main
git pull origin main
