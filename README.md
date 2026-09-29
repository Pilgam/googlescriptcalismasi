https://script.google.com/macros/s/AKfycbxF8jqg89dYSeabrumo6VZZrEUCuYb1Nkv9sn9UP2Ecsla6_vZVzEt9DC5c-75UGNKg/exec
linkte son hali denemeye açık şekilde duruyor birkaç ui geliştirmesi ve değişikleri olacak

# CLAUDE_CONTEXT

APP:
- Google Apps Script web app (HtmlService template pages, single-file .gs backend split into Code.gs + KabulService.gs)
- pages: Index (hızlı işlem / arama), MasterTakip (liste), Raporlar (istatistik), Sertifikalar (kalibrasyon giriş)
- routing: doGet(e) in Code.gs -> ?page=Index|MasterTakip|Raporlar|Sertifikalar, bilinmeyen/boş değer Index'e düşer (normalizePage_)
- user context: PLACEHOLDER — Session.getActiveUser().getEmail() ya da doğrulanmamış ?userEmail=/?userName= parametresi, Kullanicilar sayfasında eşlenir. Bu kod başka bir siteye/sisteme entegre edilecek; gerçek giriş/izin mekanizması entegre eden tarafça değiştirilecektir. appsscript.json'daki access=ANYONE / executeAs=USER_DEPLOYING ayarları da o zaman birlikte gözden geçirilmeli.
- spreadsheet source: SpreadsheetApp.getActiveSpreadsheet() varsa o, yoksa Code.gs'teki SPREADSHEET_ID sabiti. Veritabanı değişince bu ID güncellenmeli.
- module scope: mastar (ölçüm cihazı) takibi + sertifika/kalibrasyon takibi + kalite kabul-onay iş akışı
- concurrency: saveMovement (Code.gs) ve decideAcceptance_ (KabulService.gs) LockService.getScriptLock() ile korunuyor — bir satırı okuyup sonra o satıra geri yazan yeni bir fonksiyon eklenirse aynı desen (kilit al -> satırı taze oku -> yaz -> kilidi bırak) kullanılmalı.

SHEETS:

Urunler
- MastarNo
- UrunAdi
- SeriNo
- Aciklama
- AnaKonum
- DetayKonum
- Durum
- SorumluKisi
- SonKontrolTarihi
- SonrakiKontrolTarihi
- KalibrasyonDurumu
- Aktif
- Guncelleyen
- GuncellenmeTarihi

Sertifikalar
- SertifikaId
- MastarNo
- SertifikaNo
- SertifikaTuru
- Kurum
- SertifikaTarihi
- GecerlilikTarihi
- DosyaUrl
- Durum
- Aciklama
- Aktif
- Ekleyen
- GuncellenmeTarihi

Hareketler
- HareketId
- TarihSaat
- KullaniciEmail
- KullaniciAdi
- MastarNo
- MastarAdi
- HareketTuru
- EskiAnaKonum
- EskiDetayKonum
- YeniAnaKonum
- YeniDetayKonum
- EskiDurum
- YeniDurum
- Aciklama
- Kaynak

Kullanicilar
- KullaniciAdi
- Email
- Rol
- Aktif
(Rol TAM eşleşmeli, büyük/küçük harf önemsiz ama fazladan kelime olmamalı: kalibrasyon girişi için admin/operator/teknisyen/technician, onay-red için admin/kalite/quality. "Kalite Kontrol" gibi bir değer eşleşmez, sessizce "yetkiniz yok" hatası verir.)

KabulKayitlari  (önceki README'de eksikti — KabulService.gs'in tablosu, kalibrasyon onay akışının audit trail'i, satırlar silinmez)
- KabulId
- SertifikaId
- MastarNo
- KabulNedeni
- Standart
- TalepEden
- TalepEdenEmail
- TalepOnayi
- TalepOnayTarihi
- KaliteOnayi
- KaliteOnayTarihi
- Durum   (Taslak | Kalite Onayı Bekliyor | Onaylandı | Reddedildi)
- Aciklama
- Olusturan
- OlusturmaTarihi

EXAMPLE_DATA
(Not: veritabanı yeniden kurulacaksa bu örnekler sadece kolon formatını göstermek içindir; sütun İSİMLERİ birebir korunmalı çünkü kod satırları isimle okuyor, sırayla değil.)

Urunler
| MastarNo | UrunAdi | SeriNo | Aciklama | AnaKonum | DetayKonum | Durum | SorumluKisi | Aktif |
| M-1001 | Olcum Mastari | SN-001 | Dıs cap kontrol | Depo-1 | Raf-A1 / Goz-01 | Hazir | Ahmet Yilmaz | TRUE |
| M-1002 | Derinlik Mastari | SN-002 | Olcum cihazı | Kalite | Dolap-2 / Goz-03 | Kullanimda | Ayse Demir | TRUE |
| M-1003 | Vida Mastari | SN-003 | Vida kontrol | Bakim | Atolye / Tezgah-04 | Bakimda |  | TRUE |

Sertifikalar
| SertifikaId | MastarNo | SertifikaNo | SertifikaTuru | Kurum | SertifikaTarihi | GecerlilikTarihi | Durum | Aciklama |
| S-001 | M-1001 | KAL-2026-001 | Kalibrasyon | ABC Kalibrasyon | 2026-09-01 | 2027-09-01 | Gecerli | Yillik kalibrasyon |
| S-002 | M-1001 | UYG-2026-023 | Uygunluk | ISO Lab | 2026-09-15 | 2026-12-15 | 60 Gun Icind e | Yillik uygunluk |
| S-003 | M-1002 | KAL-2026-007 | Kalibrasyon | XYZ Lab | 2026-08-10 | 2026-09-20 | Sure Dolmus | Gecerlilik bitti |

Kullanicilar
| KullaniciAdi | Email | Rol | Aktif |
| Yonetici | admin@example.com | admin | TRUE |
| Operator | operator@example.com | operator | TRUE |
| Teknisyen | teknisyen@example.com | teknisyen | TRUE |
| Kalite | kalite@example.com | kalite | TRUE |

STATUS_LOGIC
- Geçerli: 60 gün üstü
- 60 Gün İçinde: 0-60 gün arası
- Süresi Dolmuş: geçerlilik tarihi geçmiş
- Tarih Yok: tarih yok

FILTERS (gerçekte İMPLEMENTE EDİLEN kadarıyla)
- searchProducts(query, filters): filters.includeAll, filters.status, filters.location
- getCertificates(filters): filters.query, filters.mastarNo, filters.certificateType
- NOT: eski bir taslakta getCertificates için status/expiringSoon/organization/dateFrom/dateTo filtreleri de vardı ama Code.gs'teki güncel sürümde bunlar YOK — gerekiyorsa eklenmeli, README'nin eski hali bunları "var" gibi listeliyordu, yanlıştı.

REQUIRED FUNCTIONS

Code.gs
- doGet(e) / getScriptUrl() / include(name)
- searchProducts(query, filters) / getAllProducts(includeInactive) / getProductByNo(mastarNo) / getProductDetail(mastarNo)
- saveMovement(data)  — LockService korumalı
- getMovementHistory(mastarNo)
- saveCertificate(data)  — sadece sertifika satırı ekler, kabul/onay akışına GİRMEZ
- saveCalibrationWithAcceptance(data)  — Sertifikalar.html'in kullandığı fonksiyon: sertifikayı ekler + KabulService.gs'teki createAcceptanceRecord'u tetikleyip bekleyen bir kabul kaydı açar
- getCertificates(filters) / getCertificatesByProduct(mastarNo) / getCertificateSummary() / getCertificateFilterOptions()
- getCurrentUserContext() / getQualityUsers() / getAnalytics() / getFilterOptions()
- getCalibrationEntryData(mastarNo)
- baglantiyiTestEt()  — Apps Script editöründen elle çalıştırılıp tablo bağlantısını doğrulamak için, web akışının dışında

KabulService.gs
- getAcceptanceOptions()
- createAcceptanceRecord(data)
- getAcceptanceRecords(mastarNo) / getPendingAcceptanceRecords()
- approveAcceptance(data) / rejectAcceptance(data)  — ikisi de decideAcceptance_ üzerinden gider, LockService korumalı, karar zaten verilmişse hata fırlatır (çifte onay/red engellenir)

SAVE_CERTIFICATE_INPUT
{
  mastarNo: 'M-1001',
  certificateNo: 'KAL-2026-001',
  certificateType: 'Kalibrasyon',
  organization: 'ABC Kalibrasyon',
  certificateDate: '2026-09-01',
  validityDate: '2027-09-01',
  fileUrl: 'https://drive.google.com/..',
  description: 'Yillik kalibrasyon',
  userEmail: 'admin@example.com',
  userName: 'Yonetici',
  source: 'MastarTakip'
}

UI_BEHAVIOR
- search products by mastar no, product name, serial no, description
- select product -> detail panel
- show certificate list for product
- add certificate form
- show warning badge when certificate is expiring within 60 days
- show red warning when expired
- filters should support status and certificate type

PAGE_ROUTING
- ?page=Index => hızlı işlem / ana arama
- ?page=MasterTakip => mastar listesi
- ?page=Raporlar => istatistikler
- ?page=Sertifikalar => kalibrasyon girişi (kabul/onay akışını başlatır)

AUTH_RULES (PLACEHOLDER — entegre eden ekip kendi sistemine göre değiştirecek)
- şu anki mekanizma: Session.getActiveUser().getEmail() ya da DOĞRULANMAMIŞ ?userEmail= parametresi
- Kullanicilar sayfası source of truth; email eşleşmezse role='guest', active=false
- role check: admin/operator/teknisyen/technician kalibrasyon girebilir; admin/kalite/quality onay/red verebilir
- appsscript.json: access=ANYONE (girişli herkes), executeAs=USER_DEPLOYING — bunlar da gerçek girişle birlikte gözden geçirilmeli

BİLİNEN EKSİKLER / TESLİM NOTLARI
- Sertifikalar.html'deki "Konum" ve "Atanan kişi" alanları formda toplanıyor ama saveCalibrationWithAcceptance bu ikisini okumuyor — kaydedilmiyor. Entegre eden ekip ya bir alana bağlasın ya da formdan kaldırsın.
- Login/izin akışı tamamen placeholder; üretime çıkmadan entegre eden ekibin kendi sistemine göre değiştirilmesi gerekiyor.
- getCertificates(filters) için status/expiringSoon/organization/dateFrom/dateTo filtreleri henüz yok (yukarıdaki FILTERS notuna bak).
