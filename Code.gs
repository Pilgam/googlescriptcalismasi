const APP_CONFIG = {
  appName: 'Mastar Takip',
  sheets: {
    products: 'Urunler',
    certificates: 'Sertifikalar',
    movements: 'Hareketler',
    users: 'Kullanicilar'
  },
  pages: {
    home: 'Index',
    masterTracking: 'MasterTakip'
  }
};

const PRODUCT_HEADERS = [
  'MastarNo', 'UrunAdi', 'SeriNo', 'Aciklama', 'AnaKonum', 'DetayKonum',
  'Durum', 'SorumluKisi', 'SonKontrolTarihi', 'SonrakiKontrolTarihi',
  'KalibrasyonDurumu', 'Aktif', 'Guncelleyen', 'GuncellenmeTarihi'
];

const MOVEMENT_HEADERS = [
  'HareketId', 'TarihSaat', 'KullaniciEmail', 'KullaniciAdi', 'MastarNo',
  'MastarAdi', 'HareketTuru', 'EskiAnaKonum', 'EskiDetayKonum',
  'YeniAnaKonum', 'YeniDetayKonum', 'EskiDurum', 'YeniDurum', 'Aciklama', 'Kaynak'
];

const USER_HEADERS = ['KullaniciAdi', 'Email', 'Rol', 'Aktif'];
const CERTIFICATE_HEADERS = [
  'SertifikaId', 'MastarNo', 'SertifikaNo', 'SertifikaTuru', 'Kurum',
  'SertifikaTarihi', 'GecerlilikTarihi', 'DosyaUrl', 'Durum', 'Aciklama',
  'Aktif', 'Ekleyen', 'GuncellenmeTarihi'
];

const DEFAULT_REASON_MAP = {
  Al: ['Ölçüm için kullanım', 'Kullanım sırasında gerekli', 'Ölçüm ve kontrol'],
  'Geri Koy': ['Depoya geri iade', 'Kullanım sonrası iade', 'Kayıt altına alınan dönüş'],
  Transfer: ['Transfer / konum değişimi', 'İşlem alanı değişimi', 'Uygulama yeri taşıma'],
  Kontrol: ['Kontrol / muayene', 'Kalibrasyon kontrolü', 'Saha kontrolleri']
};

function doGet(e) {
  ensureSheets();
  const page = normalizePage_(e && e.parameter && e.parameter.page);
  const user = getCurrentUser_(e);
  const template = HtmlService.createTemplateFromFile(page);
  template.pageTitle = page === APP_CONFIG.pages.masterTracking ? 'Mastar Takip' : 'Ana Menü';
  template.userContext = JSON.stringify(user).replace(/</g, '\\u003c');

  return template.evaluate()
    .setTitle(APP_CONFIG.appName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function normalizePage_(requestedPage) {
  return String(requestedPage || '').toLowerCase() === 'mastertakip'
    ? APP_CONFIG.pages.masterTracking
    : APP_CONFIG.pages.home;
}

function getSpreadsheet_() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (error) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function ensureSheets() {
  const ss = getSpreadsheet_();
  ensureSheetWithHeaders_(ss, APP_CONFIG.sheets.products, PRODUCT_HEADERS, seedExampleProducts_);
  ensureSheetWithHeaders_(ss, APP_CONFIG.sheets.movements, MOVEMENT_HEADERS);
  ensureSheetWithHeaders_(ss, APP_CONFIG.sheets.users, USER_HEADERS, seedExampleUsers_);
  ensureSheetWithHeaders_(ss, APP_CONFIG.sheets.certificates, CERTIFICATE_HEADERS, seedExampleCertificates_);
}

function ensureSheetWithHeaders_(ss, name, headers, seedFunction) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    if (seedFunction) seedFunction(sheet);
  }
}

function seedExampleProducts_(sheet) {
  sheet.getRange(2, 1, 4, PRODUCT_HEADERS.length).setValues([
    ['M-1001', 'Ölçüm Mastarı', 'SN-001', 'Örnek dış çap kontrol mastarı', 'Depo-1', 'Raf-A1 / Göz-01', 'Hazır', 'Ahmet Yılmaz', '01.09.2026', '01.03.2027', 'Geçerli', true, 'Sistem', new Date()],
    ['M-1002', 'Derinlik Mastarı', 'SN-002', 'Örnek derinlik kontrol mastarı', 'Kalite', 'Dolap-2 / Göz-03', 'Kullanımda', 'Ayşe Demir', '15.08.2026', '15.02.2027', 'Geçerli', true, 'Sistem', new Date()],
    ['M-1003', 'Vida Mastarı', 'SN-003', 'Örnek vida kontrol mastarı', 'Bakım', 'Atölye / Tezgah-04', 'Bakımda', '', '20.07.2026', '20.01.2027', 'Bekliyor', true, 'Sistem', new Date()],
    ['M-1004', 'Hassas Ölçüm Mastarı', 'SN-004', 'Örnek hassas ölçüm ekipmanı', 'Depo-2', 'Kabin-B / Raf-02', 'Hazır', '', '05.09.2026', '05.03.2027', 'Geçerli', true, 'Sistem', new Date()]
  ]);
}

function seedExampleUsers_(sheet) {
  sheet.getRange(2, 1, 2, USER_HEADERS.length).setValues([
    ['Yönetici', 'admin@example.com', 'admin', true],
    ['Operatör', 'operator@example.com', 'operator', true]
  ]);
}

function seedExampleCertificates_(sheet) {
  const today = new Date();
  const addDays = (n) => {
    const date = new Date(today);
    date.setDate(date.getDate() + n);
    return date;
  };

  sheet.getRange(2, 1, 4, CERTIFICATE_HEADERS.length).setValues([
    ['S-001', 'M-1001', 'KAL-2026-001', 'Kalibrasyon', 'ABC Kalibrasyon', addDays(-10), addDays(25), 'https://example.com/1', '60 Gün İçinde', 'Yıllık kalibrasyon', true, 'Yönetici', new Date()],
    ['S-002', 'M-1002', 'UYG-2026-023', 'Uygunluk', 'ISO Lab', addDays(4), addDays(120), 'https://example.com/2', 'Geçerli', 'Yıllık uygunluk', true, 'Yönetici', new Date()],
    ['S-003', 'M-1003', 'KAL-2026-007', 'Kalibrasyon', 'XYZ Lab', addDays(-120), addDays(-10), 'https://example.com/3', 'Süresi Dolmuş', 'Geçerlilik bitti', true, 'Operatör', new Date()],
    ['S-004', 'M-1004', 'TST-2026-015', 'Test', 'Laboratuvar A', addDays(-20), addDays(85), 'https://example.com/4', 'Geçerli', 'Düzenli kontrol', true, 'Operatör', new Date()]
  ]);
}

function getCurrentUser_(e) {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const parameterEmail = String(e && e.parameter && e.parameter.userEmail || '').trim().toLowerCase();
  const resolvedEmail = email || parameterEmail;
  const users = getSheetObjects_(APP_CONFIG.sheets.users);
  const record = users.find((row) => String(row.Email || '').trim().toLowerCase() === resolvedEmail);

  return {
    name: record && record.KullaniciAdi ? record.KullaniciAdi : String(e && e.parameter && e.parameter.userName || 'Kullanıcı'),
    email: resolvedEmail,
    role: record && record.Rol ? record.Rol : 'guest',
    active: record ? String(record.Aktif).toLowerCase() !== 'false' : Boolean(parameterEmail),
    source: email ? 'google-account' : (parameterEmail ? 'integration-parameter' : 'unknown')
  };
}

function getCurrentUserContext() {
  return getCurrentUser_({ parameter: {} });
}

function getSheetObjects_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).map((row) => {
    const item = {};
    headers.forEach((header, index) => item[header] = row[index]);
    return item;
  });
}

function normalize_(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isActive_(value) {
  return value !== false && String(value).toLowerCase() !== 'false';
}

function formatProduct_(product) {
  const copy = Object.assign({}, product);
  ['SonKontrolTarihi', 'SonrakiKontrolTarihi', 'GuncellenmeTarihi'].forEach((key) => {
    if (copy[key] instanceof Date) copy[key] = Utilities.formatDate(copy[key], Session.getScriptTimeZone(), 'dd.MM.yyyy');
  });
  return copy;
}

function searchProducts(query, filters) {
  ensureSheets();
  const keyword = normalize_(query);
  const options = filters || {};

  return getSheetObjects_(APP_CONFIG.sheets.products)
    .filter((product) => isActive_(product.Aktif))
    .filter((product) => {
      if (!keyword) return true;
      return [product.MastarNo, product.UrunAdi, product.SeriNo, product.Aciklama, product.AnaKonum]
        .some((value) => normalize_(value).includes(keyword));
    })
    .filter((product) => !options.status || String(product.Durum || '') === String(options.status))
    .filter((product) => !options.location || String(product.AnaKonum || '') === String(options.location))
    .slice(0, 50)
    .map(formatProduct_);
}

function getProductByNo(productNo) {
  return getSheetObjects_(APP_CONFIG.sheets.products)
    .map((product, index) => ({ product, rowIndex: index + 2 }))
    .find((item) => String(item.product.MastarNo || '').trim().toLowerCase() === String(productNo || '').trim().toLowerCase()) || null;
}

function getMovementHistory(productNo) {
  return getSheetObjects_(APP_CONFIG.sheets.movements)
    .filter((row) => String(row.MastarNo || '').trim().toLowerCase() === String(productNo || '').trim().toLowerCase())
    .sort((a, b) => new Date(b.TarihSaat) - new Date(a.TarihSaat))
    .slice(0, 50);
}

function getDefaultReason_(movementType) {
  const list = DEFAULT_REASON_MAP[String(movementType || 'Al')] || DEFAULT_REASON_MAP.Al;
  return list[0];
}

function saveMovement(data) {
  ensureSheets();
  const input = data || {};
  const record = getProductByNo(input.mastarNo);
  if (!record) throw new Error('Mastar bulunamadı.');

  const user = getCurrentUser_({ parameter: { userEmail: input.userEmail || '', userName: input.userName || '' } });
  if (!user.active || !['admin', 'operator'].includes(user.role)) {
    throw new Error('Bu işlem için yetkiniz bulunmuyor.');
  }

  const product = record.product;
  const now = new Date();
  const movementType = String(input.movementType || 'Al');
  const typedReason = String(input.description || '').trim();
  const presetReason = String(input.reasonPreset || '').trim();
  const description = typedReason || presetReason || getDefaultReason_(movementType);
  const newMainLocation = String(input.newMainLocation || product.AnaKonum || '').trim();
  const newDetailLocation = String(input.newDetailLocation || product.DetayKonum || '').trim();
  const newStatus = String(input.newStatus || product.Durum || '').trim();

  const movementSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP_CONFIG.sheets.movements);
  const productSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP_CONFIG.sheets.products);

  movementSheet.appendRow([
    Utilities.getUuid(), now, user.email, user.name, product.MastarNo, product.UrunAdi,
    movementType, product.AnaKonum || '', product.DetayKonum || '',
    newMainLocation, newDetailLocation, product.Durum || '', newStatus,
    description, String(input.source || 'MastarTakip')
  ]);

  productSheet.getRange(record.rowIndex, 5, 1, 3).setValues([[newMainLocation, newDetailLocation, newStatus]]);
  productSheet.getRange(record.rowIndex, 13, 1, 2).setValues([[user.name, now]]);

  return {
    success: true,
    product: formatProduct_(Object.assign({}, product, {
      AnaKonum: newMainLocation,
      DetayKonum: newDetailLocation,
      Durum: newStatus,
      Guncelleyen: user.name,
      GuncellenmeTarihi: now
    }))
  };
}

function getFilterOptions() {
  const products = getSheetObjects_(APP_CONFIG.sheets.products);
  return {
    statuses: [...new Set(products.map((row) => row.Durum).filter(Boolean))].sort(),
    locations: [...new Set(products.map((row) => row.AnaKonum).filter(Boolean))].sort()
  };
}

function getAnalytics() {
  const rows = getSheetObjects_(APP_CONFIG.sheets.movements);
  const byLocation = rows.reduce((acc, row) => {
    const key = row.YeniAnaKonum || 'Belirtilmemiş';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const byUser = rows.reduce((acc, row) => {
    const key = row.KullaniciAdi || 'Belirtilmemiş';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const byProduct = rows.reduce((acc, row) => {
    const key = row.MastarNo || 'Belirtilmemiş';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return {
    totalMovements: rows.length,
    byLocation,
    byUser,
    byProduct
  };
}

function baglantiyiTestEt() {
  ensureSheets();
  return 'Tablo bağlantısı hatasız tamamlandı.';
}

function seedExamples() {
  ensureSheets();
}
