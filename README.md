# Google Apps Script - Mastar Takip başlangıç yapısı

Bu repository, Claude tarafından hazırlanmış ana menüye daha sonra bağlanabilecek sade bir Google Apps Script modülüdür.

## Dosya yapısı

- `Code.gs`: sayfa yönlendirme, sheet kurulumu, kullanıcı bağlamı, arama ve hareket servisleri
- `Index.html`: modül ana menüsü
- `MasterTakip.html`: arama, detay, hareket kaydı ve hareket geçmişi
- `Header.html`: ortak üst başlık ve kullanıcı bilgisi
- `Styles.html`: ortak arayüz stilleri
- `appsscript.json`: Apps Script çalışma ayarları

## İlk çalıştırma

1. Bu repository dosyalarını Google Apps Script projesine kopyalayın veya clasp ile bağlayın.
2. Proje bir Google Spreadsheet'e bağlı olmalıdır (`SpreadsheetApp.getActiveSpreadsheet()`).
3. `doGet` fonksiyonunu ilk kez çalıştırın veya Web App olarak deploy edin.
4. İlk açılışta şu sheet'ler otomatik oluşur:
   - `Urunler`
   - `Hareketler`
   - `Kullanicilar`
5. Boş sheet'lere örnek kayıtlar otomatik eklenir.

## Claude entegrasyon sözleşmesi

Ana uygulama Mastar Takip modülünü şu URL formatı ile açabilir:

```text
WEB_APP_URL?page=MasterTakip
```

İlk entegrasyon için opsiyonel bağlam parametreleri de desteklenir:

```text
WEB_APP_URL?page=MasterTakip&userEmail=user@example.com&userName=Kullanıcı
```

`userEmail` ve `userName` entegrasyon kolaylığı içindir. Yetki kararı yalnızca URL parametresine göre verilmez; `Kullanicilar` sheet'inde aynı e-posta ile aktif kullanıcı bulunması gerekir.

### Beklenen `Kullanicilar` kolonları

```text
KullaniciAdi | Email | Rol | Aktif
```

Desteklenen roller:

- `admin`: tüm işlemler
- `operator`: arama ve hareket kaydı
- diğer roller: salt görüntüleme / işlem kısıtlı

### Claude'un okuyup kullanabileceği fonksiyonlar

- `searchProducts(query, filters)`
- `getProductByNo(productNo)`
- `getMovementHistory(mastarNo)`
- `saveMovement(data)`
- `getCurrentUserContext()`
- `getFilterOptions()`

`saveMovement` veri örneği:

```javascript
{
  mastarNo: 'M-1001',
  movementType: 'Transfer',
  newMainLocation: 'Depo-1',
  newDetailLocation: 'Raf-A2 / Göz-03',
  newStatus: 'Hazır',
  description: 'Örnek hareket',
  userEmail: 'user@example.com',
  userName: 'Kullanıcı',
  source: 'ClaudeMainMenu'
}
```

## Veri modeli

`Urunler` güncel durumu tutar. `Hareketler` değişiklik öncesi ve sonrası bilgileri tutan değişmez geçmiş tablosudur. Ürün konumu güncellenirken önce hareket kaydı oluşturulur.

Gerçek kullanıcı sheet'i ve gerçek kolonlar geldiğinde yalnızca `APP_CONFIG`, header listeleri ve seed fonksiyonları güncellenmelidir.

## Not

`appsscript.json` içindeki `ANYONE` erişimi prototip içindir. Gerçek kullanıma alınmadan önce Web App erişimi kurumun Google hesaplarıyla sınırlandırılmalıdır.
