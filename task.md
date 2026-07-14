# Keepr Geliştirme Görev Listesi

## 🚀 Sprint: Alt Klasörler & Hiyerarşik Paylaşım (Subfolders & Tree Sharing)

### 1. Backend (Tamamlandı)
- [x] `Category` modeline `parent_id` self-referential yabancı anahtarı ve subcategories ilişkisinin eklenmesi
- [x] PostgreSQL veritabanı tablolarının şemaya uygun şekilde re-create edilmesi
- [x] `POST /api/categories` ve `PUT /api/categories/<id>` yollarına validasyonların eklenmesi:
  - [x] **Abonelik Kontrolü:** Alt klasör işlemleri için **Team** lisansı zorunluluğu
  - [x] **Derinlik Limiti:** Maksimum 2 seviyeli (Root -> Subfolder) klasör kısıtlaması
  - [x] **Dairesel Referans Koruması:** Bir klasörün kendisini veya alt klasörünü parent seçmesi engeli
- [x] `POST /api/categories/<id>/share` rotasına Team kısıtlaması ve alt klasör paylaşım engeli eklenmesi
- [x] `GET /api/categories/shared/<slug>` public endpoint'inin N+1 sorgularını önleyen joinedload recursive (özyinelemeli) sorguya refaktör edilmesi
- [x] Test paketinin dev verileri korumak amacıyla izole **SQLite in-memory** üzerinde çalışacak şekilde yapılandırılması (`test_subfolders.py`)

### 2. Web Arayüzü (React / Vite) (Tamamlandı)
- [x] `Sidebar.tsx` kategori listesinin Chevron collapsible ağaç yapısına (Tree view) güncellenmesi
- [x] Team abonesi olmayanlarda "Alt Klasör Ekle" (+) butonunun yanına kilit (Lock) ikonu yerleştirilmesi ve Pro upgrade modalına bağlanması
- [x] Kategori paylaşım switch'ine Team abonelik kontrolü (`openProModal('folder')`) eklenmesi
- [x] Paylaşılan klasörlerin yanına yeşil dünya (`Globe`) ikonu ve `AÇIK` rozetinin (Badge) eklenmesi
- [x] `SharedCollectionView.tsx` sayfasının alt klasörleri recursive accordion ve filtreleme ile gösterecek şekilde sıfırdan revize edilmesi

### 3. Mobil İstemci (React Native / iOS & Android) (Tamamlandı)
- [x] `ManageCategoriesModal.tsx` üzerine "Üst Klasör (Opsiyonel)" horizontal scroll seçicisinin ve kilit/gating kontrollerinin eklenmesi
- [x] Kategori yönetim modalında alt kategorilerin girintili (indentation) gösterimiyle native ağaç yapısının kurulması
- [x] `AddKeepModal.tsx` ve `InspectorSheet.tsx` picker listelerinde alt kategorilerin `↳ Alt Klasör` formatında hiyerarşik listelenmesi
- [x] `DashboardScreen.tsx` Category Switcher Bar (FlatList) listesinde alt kategorilerin hiyerarşik sıralanması ve paylaşılanlerin yeşil dünya (`Globe`) ikonuyla vurgulanması
- [x] iOS keyboard offset problemini çözen `KeyboardAvoidingView` entegrasyonu
- [x] Android hardware back-button ile uyumlu modal kapatma (`onRequestClose`) akışları

---

## 🖥️ Backend & Genel Altyapı (Tamamlandı)
- [x] Backend Yapılandırmasının Kurulması
- [x] Yardımcı Araçların (Utils) Geliştirilmesi
- [x] Veritabanı Modellerinin Oluşturulması
- [x] API Rotalarının Geliştirilmesi
- [x] E-posta Doğrulama Akışı (Email OTP Verification Flow)
- [x] Akıllı Alarm Hatırlatıcı (Asenkron Scheduler)
- [x] Web Pano Algılayıcı & Apple Kısayolları

## 🎨 Web Frontend (Tamamlandı)
- [x] Frontend Projesinin Kurulması
- [x] Stil ve Temel Ayarların Yapılması
- [x] State Yönetimi & Veri Servisleri
- [x] Arayüz Bileşenlerinin Yazılması
- [x] Ana Sayfaların Yazılması

## 📌 Gelecek Yol Haritası (Roadmap & TODO)
- [ ] **Gerçek E-posta Sunucu Entegrasyonu:** SMTP e-posta sunucusu ile uygulama şifrelerinin canlı doğrulamalarının yapılması ve `.env` yapılandırması.
- [ ] **Ekip ve Ortak Klasör Altyapısı:** Team paketi kullanıcıları için davet linkleri ve ortak erişimli koleksiyon paylaşımı veri şeması entegrasyonu.
- [ ] **Mobil Pano Otomatik Algılama:** Panodaki linkleri algılayıp kaydetme uyarısı sunan yapının mobil istemciye de taşınması.
- [ ] **Detaylı İstatistikler:** Kullanıcının en çok kaydettiği siteleri, haftalık/aylık okuma alışkanlıklarını raporlayan grafiksel analiz paneli.
- [ ] **Çevrimdışı Mod (Offline Sync):** İnternet bağlantısı koptuğunda verilerin lokal bellekte (IndexedDB / SecureStore) saklanıp bağlantı gelen ilk anda senkronize edilmesi.
