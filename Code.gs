const SPREADSHEET_ID = '18qCBAwLaMnMw4kOxu_KgfpOFe5SxOBo8c0SOGpqXZ-c';

const APP_CONFIG = {
  appName: 'Mastar Takip',
  sheets: {
    products: 'Urunler',
    certificates: 'Sertifikalar',
    movements: 'Hareketler',
    users: 'Kullanicilar'
  },
  pages: ['Index', 'MasterTakip', 'Raporlar', 'Sertifikalar']
};

const PRODUCT_HEADERS = ['MastarNo', 'UrunAdi', 'SeriNo', 'Aciklama', 'AnaKonum', 'DetayKonum', 'Durum', 'SorumluKisi', 'Aktif'];
const MOVEMENT_HEADERS = ['HareketId', 'TarihSaat', 'KullaniciEmail', 'KullaniciAdi', 'MastarNo', 'MastarAdi', 'HareketTuru', 'EskiAnaKonum', 'EskiDetayKonum', 'YeniAnaKonum', 'YeniDetayKonum', 'EskiDurum', 'YeniDurum', 'Aciklama', 'Kaynak'];
const USER_HEADERS = ['KullaniciAdi', 'Email', 'Rol', 'Aktif'];
const CERTIFICATE_HEADERS = ['SertifikaId', 'MastarNo', 'SertifikaNo', 'SertifikaTuru', 'Kurum', 'SertifikaTarihi', 'GecerlilikTarihi', 'DosyaUrl', 'Durum', 'Aciklama', 'Aktif', 'Ekleyen', 'GuncellenmeTarihi'];

function doGet(e) {
  ensureSheets();
  const requested = String((e && e.parameter && e.parameter.page) || 'Index');
  const page = APP_CONFIG.pages.find((name) => name.toLowerCase() === requested.toLowerCase()) || 'Index';
  const template = HtmlService.createTemplateFromFile(page);
  template.pageTitle = page === 'Index' ? 'Ana Menü' : page;
  template.userContext = JSON.stringify(getCurrentUser_(e)).replace(/</g, '\\u003c');
  return template.evaluate().setTitle(APP_CONFIG.appName).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }

function getSpreadsheet_() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (error) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
}

function ensureSheets() {
  const ss = getSpreadsheet_();
  ensureSheetWithHeaders_(ss, APP_CONFIG.sheets.products, PRODUCT_HEADERS, seedExampleProducts_);
  ensureSheetWithHeaders_(ss, APP_CONFIG.sheets.certificates, CERTIFICATE_HEADERS, seedExampleCertificates_);
  ensureSheetWithHeaders_(ss, APP_CONFIG.sheets.movements, MOVEMENT_HEADERS);
  ensureSheetWithHeaders_(ss, APP_CONFIG.sheets.users, USER_HEADERS, seedExampleUsers_);
}

function ensureSheetWithHeaders_(ss, name, headers, seedFn) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    if (seedFn) seedFn(sheet);
  }
}

function seedExampleProducts_(sheet) {
  sheet.getRange(2, 1, 5, PRODUCT_HEADERS.length).setValues([
    ['M-1001', 'G8 Tampon Mastar', 'SN-001', 'Dış çap kontrol mastarı', 'Depo-1', 'Raf-A1 / Göz-01', 'Hazır', 'Ahmet Yılmaz', true],
    ['M-1002', 'Basınç Ölçüm Mastarı', 'SN-002', 'Basınç sensör doğrulama', 'Kalite', 'Dolap-2 / Göz-03', 'Kullanımda', 'Ayşe Demir', true],
    ['M-1003', 'Vida Kalibrasyon Mastarı', 'SN-003', 'Vida kontrol ve doğrulama', 'Bakım', 'Atölye / Tezgah-04', 'Bakımda', '', true],
    ['M-1004', 'Hassas Ölçüm Mastarı', 'SN-004', 'Hassas ölçüm doğrulama', 'Depo-2', 'Kabin-B / Raf-02', 'Hazır', '', true],
    ['M-1005', 'Görsel Kalite Mastarı', 'SN-005', 'Optik kontrol mastarı', 'Merkez', 'Saha-12 / Stok-02', 'Pasif', '', false]
  ]);
}

function seedExampleUsers_(sheet) {
  sheet.getRange(2, 1, 2, USER_HEADERS.length).setValues([
    ['Yönetici', 'admin@example.com', 'admin', true],
    ['Operatör', 'operator@example.com', 'operator', true]
  ]);
}

function seedExampleCertificates_(sheet) {
  sheet.getRange(2, 1, 3, CERTIFICATE_HEADERS.length).setValues([
    ['S-001', 'M-1001', 'KAL-2026-001', 'Kalibrasyon', 'ABC Kalibrasyon', '2026-09-01', '2027-09-01', 'https://example.com/1', 'Geçerli', 'Yıllık kalibrasyon', true, 'Yönetici', new Date()],
    ['S-002', 'M-1001', 'UYG-2026-023', 'Uygunluk', 'ISO Lab', '2026-09-15', '2026-12-15', 'https://example.com/2', '60 Gün İçinde', 'Yıllık uygunluk', true, 'Yönetici', new Date()],
    ['S-003', 'M-1002', 'KAL-2026-007', 'Kalibrasyon', 'XYZ Lab', '2026-08-10', '2026-09-20', 'https://example.com/3', 'Süresi Dolmuş', 'Geçerlilik bitti', true, 'Operatör', new Date()]
  ]);
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

function levenshtein_(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1)
      );
    }
  }
  return matrix[b.length][a.length];
}

function scoreProduct_(product, keyword) {
  if (!keyword) return 1;
  const query = normalize_(keyword);
  const tokens = query.split(' ').filter(Boolean);
  const fields = [product.MastarNo, product.UrunAdi, product.SeriNo, product.Aciklama].map(normalize_);
  let score = 0;
  fields.forEach((field, index) => {
    if (!field) return;
    if (field === query) score += 100 - index * 5;
    if (field.includes(query)) score += 60 - index * 5;
    tokens.forEach((token) => {
      if (field.includes(token)) score += 18;
      else if (field.split(' ').some((word) => levenshtein_(word, token) <= Math.max(1, Math.floor(token.length / 3)))) score += 7;
    });
  });
  return score;
}

function getCurrentUser_(e) {
  const accountEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const parameterEmail = String(e && e.parameter && e.parameter.userEmail || '').trim().toLowerCase();
  const email = accountEmail || parameterEmail;
  const users = getSheetObjects_(APP_CONFIG.sheets.users);
  const record = users.find((row) => String(row.Email || '').trim().toLowerCase() === email);
  return {
    name: record && record.KullaniciAdi || String(e && e.parameter && e.parameter.userName || 'Kullanıcı'),
    email: email,
    role: record && record.Rol || 'guest',
    active: record ? String(record.Aktif).toLowerCase() !== 'false' : Boolean(parameterEmail),
    source: accountEmail ? 'google-account' : 'integration-parameter'
  };
}

function getCurrentUserContext() {
  return getCurrentUser_({ parameter: {} });
}

function searchProducts(query, filters) {
  const options = filters || {};
  const keyword = String(query || '').trim();
  const products = getSheetObjects_(APP_CONFIG.sheets.products)
    .filter((product) => options.includeAll || isActive_(product.Aktif))
    .map((product) => ({ product, score: scoreProduct_(product, keyword) }))
    .filter((item) => !keyword || item.score > 0)
    .filter((item) => !options.status || String(item.product.Durum) === String(options.status))
    .filter((item) => !options.location || String(item.product.AnaKonum) === String(options.location))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((item) => ({ ...item.product, AramaSkoru: item.score }));
  return products;
}

function getProductByNo(productNo) {
  const normalized = normalize_(productNo);
  return getSheetObjects_(APP_CONFIG.sheets.products)
    .map((product, index) => ({ product, rowIndex: index + 2 }))
    .find((item) => normalize_(item.product.MastarNo) === normalized) || null;
}

function getMovementHistory(productNo) {
  return getSheetObjects_(APP_CONFIG.sheets.movements)
    .filter((row) => normalize_(row.MastarNo) === normalize_(productNo))
    .sort((a, b) => new Date(b.TarihSaat) - new Date(a.TarihSaat))
    .slice(0, 100);
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
  const mainLocation = String(input.newMainLocation || product.AnaKonum || '').trim();
  const detailLocation = String(input.newDetailLocation || product.DetayKonum || '').trim();
  const status = String(input.newStatus || product.Durum || '').trim();
  const movementSheet = getSpreadsheet_().getSheetByName(APP_CONFIG.sheets.movements);
  const productSheet = getSpreadsheet_().getSheetByName(APP_CONFIG.sheets.products);

  movementSheet.appendRow([
    'H-' + Utilities.getUuid().slice(0, 8),
    now,
    user.email,
    user.name,
    product.MastarNo,
    product.UrunAdi,
    String(input.movementType || 'Transfer'),
    product.AnaKonum || '',
    product.DetayKonum || '',
    mainLocation,
    detailLocation,
    product.Durum || '',
    status,
    String(input.description || '').trim(),
    String(input.source || 'MastarTakip')
  ]);

  productSheet.getRange(record.rowIndex, 5, 1, 3).setValues([[mainLocation, detailLocation, status]]);
  return { success: true, mastarNo: product.MastarNo, newMainLocation: mainLocation, newDetailLocation: detailLocation, newStatus: status };
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
  const byMovement = rows.reduce((acc, row) => {
    const key = row.HareketTuru || 'Belirtilmemiş';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    totalMovements: rows.length,
    byLocation: byLocation,
    byUser: byUser,
    byProduct: byProduct,
    byMovement: byMovement
  };
}

function baglantiyiTestEt() {
  ensureSheets();
  return 'Tablo bağlantısı hatasız tamamlandı.';
}

function seedExamples() {
  ensureSheets();
}
