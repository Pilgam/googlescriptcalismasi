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
    masterTracking: 'MasterTakip',
    reports: 'Raporlar',
    certificates: 'Sertifikalar'
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
  const template = HtmlService.createTemplateFromFile(page);
  template.pageTitle = page === APP_CONFIG.pages.home ? 'Ana Menü' : page;
  template.userContext = JSON.stringify(getCurrentUser_(e)).replace(/</g, '\u003c');

  return template.evaluate()
    .setTitle(APP_CONFIG.appName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function normalizePage_(requestedPage) {
  const requested = String(requestedPage || '').toLowerCase();
  const pages = Object.keys(APP_CONFIG.pages).map((key) => APP_CONFIG.pages[key]);
  return pages.find((page) => page.toLowerCase() === requested) || APP_CONFIG.pages.home;
}

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
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
  const now = new Date();
  const date = (days) => {
    const result = new Date(now);
    result.setDate(result.getDate() + days);
    return result;
  };
  sheet.getRange(2, 1, 3, CERTIFICATE_HEADERS.length).setValues([
    ['S-001', 'M-1001', 'KAL-2026-001', 'Kalibrasyon', 'ABC Kalibrasyon', date(-10), date(25), '', '60 Gün İçinde', 'Yıllık kalibrasyon', true, 'Sistem', now],
    ['S-002', 'M-1002', 'UYG-2026-023', 'Uygunluk', 'ISO Lab', date(-5), date(120), '', 'Geçerli', 'Yıllık uygunluk', true, 'Sistem', now],
    ['S-003', 'M-1003', 'KAL-2026-007', 'Kalibrasyon', 'XYZ Lab', date(-120), date(-10), '', 'Süresi Dolmuş', 'Geçerlilik bitti', true, 'Sistem', now]
  ]);
}

function getCurrentUser_(e) {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const parameterEmail = String(e && e.parameter && e.parameter.userEmail || '').trim().toLowerCase();
  const resolvedEmail = email || parameterEmail;
  const record = getSheetObjects_(APP_CONFIG.sheets.users)
    .find((row) => String(row.Email || '').trim().toLowerCase() === resolvedEmail);

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
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
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
  return String(value || '').toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim();
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
    .filter((product) => options.includeAll || isActive_(product.Aktif))
    .filter((product) => !keyword || [product.MastarNo, product.UrunAdi, product.SeriNo, product.Aciklama, product.AnaKonum]
      .some((value) => normalize_(value).includes(keyword)))
    .filter((product) => !options.status || String(product.Durum || '') === String(options.status))
    .filter((product) => !options.location || String(product.AnaKonum || '') === String(options.location))
    .slice(0, 50)
    .map(formatProduct_);
}

function getProductByNo(productNo) {
  return getSheetObjects_(APP_CONFIG.sheets.products)
    .map((product, index) => ({ product, rowIndex: index + 2 }))
    .find((item) => normalize_(item.product.MastarNo) === normalize_(productNo)) || null;
}

function getMovementHistory(productNo) {
  return getSheetObjects_(APP_CONFIG.sheets.movements)
    .filter((row) => normalize_(row.MastarNo) === normalize_(productNo))
    .sort((a, b) => new Date(b.TarihSaat) - new Date(a.TarihSaat))
    .slice(0, 50);
}

function getDefaultReason_(movementType) {
  return (DEFAULT_REASON_MAP[String(movementType || 'Al')] || DEFAULT_REASON_MAP.Al)[0];
}

function saveMovement(data) {
  ensureSheets();
  const input = data || {};
  const record = getProductByNo(input.mastarNo);
  if (!record) throw new Error('Mastar bulunamadı.');

  const user = getCurrentUser_({ parameter: { userEmail: input.userEmail || '', userName: input.userName || '' } });
  if (!user.active || !['admin', 'operator'].includes(user.role)) throw new Error('Bu işlem için yetkiniz bulunmuyor.');

  const product = record.product;
  const now = new Date();
  const movementType = String(input.movementType || 'Al');
  const description = String(input.description || input.reasonPreset || '').trim() || getDefaultReason_(movementType);
  const mainLocation = String(input.newMainLocation || product.AnaKonum || '').trim();
  const detailLocation = String(input.newDetailLocation || product.DetayKonum || '').trim();
  const status = String(input.newStatus || product.Durum || '').trim();
  const ss = getSpreadsheet_();

  ss.getSheetByName(APP_CONFIG.sheets.movements).appendRow([
    Utilities.getUuid(), now, user.email, user.name, product.MastarNo, product.UrunAdi,
    movementType, product.AnaKonum || '', product.DetayKonum || '', mainLocation, detailLocation,
    product.Durum || '', status, description, String(input.source || 'MastarTakip')
  ]);
  ss.getSheetByName(APP_CONFIG.sheets.products).getRange(record.rowIndex, 5, 1, 3)
    .setValues([[mainLocation, detailLocation, status]]);

  return { success: true, product: Object.assign({}, product, { AnaKonum: mainLocation, DetayKonum: detailLocation, Durum: status }) };
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
  const countBy = (key) => rows.reduce((result, row) => {
    const value = row[key] || 'Belirtilmemiş';
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
  return {
    totalMovements: rows.length,
    byMovement: countBy('HareketTuru'),
    byLocation: countBy('YeniAnaKonum'),
    byUser: countBy('KullaniciAdi'),
    byProduct: countBy('MastarNo')
  };
}

function baglantiyiTestEt() {
  ensureSheets();
  return 'Tablo bağlantısı hatasız tamamlandı.';
}
