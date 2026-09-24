# CLAUDE_CONTEXT

APP:
- Google Apps Script web app
- pages: Index, MasterTakip
- user context: Google Session email or userEmail param
- spreadsheet source: active spreadsheet
- module scope: mastar takibi + sertifika/kalibrasyon takibi

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
- Aktif

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

EXAMPLE_DATA

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

STATUS_LOGIC
- Geçerli: 60 gun ustu
- 60 Gun Icind e: 0-60 gun arasi
- Sure Dolmus: gecerlilik tarihi gecmis
- Tarih Yok: tarih yok

FILTERS
- mastarNo
- productName
- serialNo
- certificateType
- organization
- status
- expiringSoon
- dateFrom
- dateTo

REQUIRED FUNCTIONS
- getCertificates(filters)
- getCertificateFilterOptions()
- getCertificateSummary()
- saveCertificate(data)
- getProductByNo(mastarNo)
- searchProducts(query, filters)
- getMovementHistory(mastarNo)
- saveMovement(data)
- getCurrentUserContext()

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
- ?page=Index => ana menu
- ?page=MasterTakip => mastar takibi

AUTH_RULES
- user email resolved from Session.getActiveUser().getEmail() or userEmail query param
- role check before save: admin/operator allowed
- sheet-based user record is source of truth
