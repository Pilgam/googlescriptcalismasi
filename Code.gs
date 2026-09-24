const APP_CONFIG = {
  appName: 'Mastar Takip',
  sheets: {
    products: 'Urunler',
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

function ensureSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetWithHeaders_(ss, APP_CONFIG.sheets.products, PRODUCT_HEADERS, seedExampleProducts_);
  ensureSheetWithHeaders_(ss, APP_CONFIG.sheets.movements, MOVEMENT_HEADERS);
  ensureSheetWithHeaders_(ss, APP_CONFIG.sheets.users, USER_HEADERS, seedExampleUsers_);
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
    active: record ? String(record.Aktif).toLowerCase() !== 'false' : false,
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

function searchProducts(query, filters) {
  ensureSheets();
  const keyword = String(query || '').trim().toLocaleLowerCase('tr-TR');
  const options = filters || {};

  return getSheetObjects_(APP_CONFIG.sheets.products)
    .filter((product) => product.Aktif !== false && String(product.Aktif).toLowerCase() !== 'false')
    .filter((product) => {
      if (!keyword) return true;
      return [product.MastarNo, product.UrunAdi, product.SeriNo, product.Aciklama]
        .some((value) => String(value || '').toLocaleLowerCase('tr-TR').includes(keyword));
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

function formatProduct_(product) {
  const copy = Object.assign({}, product);
  ['SonKontrolTarihi', 'SonrakiKontrolTarihi', 'GuncellenmeTarihi'].forEach((key) => {
    if (copy[key] instanceof Date) copy[key] = Utilities.formatDate(copy[key], Session.getScriptTimeZone(), 'dd.MM.yyyy');
  });
  return copy;
}

function getMovementHistory(productNo) {
  return getSheetObjects_(APP_CONFIG.sheets.movements)
    .filter((row) => String(row.MastarNo || '').trim().toLowerCase() === String(productNo || '').trim().toLowerCase())
    .sort((a, b) => new Date(b.TarihSaat) - new Date(a.TarihSaat))
    .slice(0, 50);
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
  const newMainLocation = String(input.newMainLocation || product.AnaKonum || '').trim();
  const newDetailLocation = String(input.newDetailLocation || product.DetayKonum || '').trim();
  const newStatus = String(input.newStatus || product.Durum || '').trim();
  const movementSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP_CONFIG.sheets.movements);
  const productSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP_CONFIG.sheets.products);

  movementSheet.appendRow([
    Utilities.getUuid(), now, user.email, user.name, product.MastarNo, product.UrunAdi,
    String(input.movementType || 'Kontrol'), product.AnaKonum || '', product.DetayKonum || '',
    newMainLocation, newDetailLocation, product.Durum || '', newStatus,
    String(input.description || '').trim(), String(input.source || 'MastarTakip')
  ]);

  productSheet.getRange(record.rowIndex, 5, 1, 3).setValues([[newMainLocation, newDetailLocation, newStatus]]);
  productSheet.getRange(record.rowIndex, 13, 1, 2).setValues([[user.name, now]]);

  return { success: true, product: formatProduct_(Object.assign({}, product, {
    AnaKonum: newMainLocation,
    DetayKonum: newDetailLocation,
    Durum: newStatus,
    Guncelleyen: user.name,
    GuncellenmeTarihi: now
  })) };
}

function getFilterOptions() {
  const products = getSheetObjects_(APP_CONFIG.sheets.products);
  return {
    statuses: [...new Set(products.map((row) => row.Durum).filter(Boolean))].sort(),
    locations: [...new Set(products.map((row) => row.AnaKonum).filter(Boolean))].sort()
  };
}
