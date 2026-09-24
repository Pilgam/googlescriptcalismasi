const CONFIG = Object.freeze({
  title: 'Mastar Takip',
  sheets: Object.freeze({
    products: 'Urunler',
    certificates: 'Sertifikalar',
    movements: 'Hareketler',
    users: 'Kullanicilar'
  }),
  pages: ['Index', 'MasterTakip', 'Sertifikalar', 'Raporlar'],
  certificateWarningDays: 60
});

const HEADERS = Object.freeze({
  Urunler: ['MastarNo', 'UrunAdi', 'SeriNo', 'Aciklama', 'AnaKonum', 'DetayKonum', 'Durum', 'SorumluKisi', 'SonKontrolTarihi', 'SonrakiKontrolTarihi', 'KalibrasyonDurumu', 'Aktif', 'Guncelleyen', 'GuncellenmeTarihi'],
  Sertifikalar: ['SertifikaId', 'MastarNo', 'SertifikaNo', 'SertifikaTuru', 'Kurum', 'SertifikaTarihi', 'GecerlilikTarihi', 'DosyaUrl', 'Durum', 'Aciklama', 'Aktif', 'Ekleyen', 'GuncellenmeTarihi'],
  Hareketler: ['HareketId', 'TarihSaat', 'KullaniciEmail', 'KullaniciAdi', 'MastarNo', 'MastarAdi', 'HareketTuru', 'EskiAnaKonum', 'EskiDetayKonum', 'YeniAnaKonum', 'YeniDetayKonum', 'EskiDurum', 'YeniDurum', 'Aciklama', 'Kaynak'],
  Kullanicilar: ['KullaniciAdi', 'Email', 'Rol', 'Aktif']
});

function doGet(e) {
  ensureSheets_();
  const requested = String(e && e.parameter && e.parameter.page || 'Index').toLowerCase();
  const page = CONFIG.pages.find(name => name.toLowerCase() === requested) || 'Index';
  const template = HtmlService.createTemplateFromFile(page);
  template.appUrl = ScriptApp.getService().getUrl() || '';
  template.userContext = JSON.stringify(getCurrentUser_(e)).replace(/</g, '\\u003c');
  return template.evaluate()
    .setTitle(CONFIG.title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

function getSpreadsheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Bu Apps Script projesi bir Google E-Tablosuna bağlı olmalıdır.');
  return spreadsheet;
}

function ensureSheets_() {
  const spreadsheet = getSpreadsheet_();
  Object.keys(HEADERS).forEach(name => {
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) sheet = spreadsheet.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
      sheet.setFrozenRows(1);
    }
  });
}

function getRows_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  return values.slice(1).map((row, index) => {
    const object = { _row: index + 2 };
    headers.forEach((header, column) => object[header] = row[column]);
    return object;
  });
}

function normalize_(value) {
  return String(value == null ? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isActive_(value) {
  return value !== false && String(value).toLowerCase() !== 'false' && String(value).toLowerCase() !== '0';
}

function getCurrentUser_(event) {
  const sessionEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const parameterEmail = String(event && event.parameter && event.parameter.userEmail || '').trim().toLowerCase();
  const email = sessionEmail || parameterEmail;
  const user = getRows_(CONFIG.sheets.users).find(row => String(row.Email || '').trim().toLowerCase() === email);
  return {
    name: user && user.KullaniciAdi || String(event && event.parameter && event.parameter.userName || 'Kullanıcı'),
    email: email,
    role: user && user.Rol || 'guest',
    active: user ? isActive_(user.Aktif) : Boolean(parameterEmail),
    source: sessionEmail ? 'google-account' : (parameterEmail ? 'parameter' : 'unknown')
  };
}

function getCurrentUserContext() {
  return getCurrentUser_({ parameter: {} });
}

function formatDate_(value, format) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? '' : Utilities.formatDate(date, Session.getScriptTimeZone(), format || 'dd.MM.yyyy');
}

function searchProducts(query, filters) {
  ensureSheets_();
  const keyword = normalize_(query);
  const options = filters || {};
  return getRows_(CONFIG.sheets.products)
    .filter(product => options.includeAll || isActive_(product.Aktif))
    .filter(product => !keyword || [product.MastarNo, product.UrunAdi, product.SeriNo, product.Aciklama, product.AnaKonum, product.DetayKonum]
      .some(value => normalize_(value).includes(keyword)))
    .filter(product => !options.status || String(product.Durum || '') === String(options.status))
    .filter(product => !options.location || String(product.AnaKonum || '') === String(options.location))
    .slice(0, 50)
    .map(product => {
      const result = Object.assign({}, product);
      ['SonKontrolTarihi', 'SonrakiKontrolTarihi', 'GuncellenmeTarihi'].forEach(key => result[key] = formatDate_(result[key]));
      delete result._row;
      return result;
    });
}

function getProductByNo(productNo) {
  const wanted = normalize_(productNo);
  return getRows_(CONFIG.sheets.products).find(product => normalize_(product.MastarNo) === wanted) || null;
}

function getMovementHistory(productNo) {
  return getRows_(CONFIG.sheets.movements)
    .filter(row => normalize_(row.MastarNo) === normalize_(productNo))
    .slice(0, 50)
    .map(row => Object.assign({}, row, { TarihSaat: formatDate_(row.TarihSaat, 'dd.MM.yyyy HH:mm:ss') }));
}

function saveMovement(data) {
  ensureSheets_();
  const input = data || {};
  const product = getProductByNo(input.mastarNo);
  if (!product) throw new Error('Mastar bulunamadı.');
  const user = getCurrentUser_({ parameter: { userEmail: input.userEmail || '', userName: input.userName || '' } });
  if (!user.active || !['admin', 'operator'].includes(String(user.role).toLowerCase())) throw new Error('Bu işlem için yetkiniz bulunmuyor.');

  const mainLocation = String(input.newMainLocation == null ? product.AnaKonum || '' : input.newMainLocation).trim();
  const detailLocation = String(input.newDetailLocation == null ? product.DetayKonum || '' : input.newDetailLocation).trim();
  const status = String(input.newStatus == null ? product.Durum || '' : input.newStatus).trim();
  const spreadsheet = getSpreadsheet_();
  spreadsheet.getSheetByName(CONFIG.sheets.movements).appendRow([
    Utilities.getUuid(), new Date(), user.email, user.name, product.MastarNo, product.UrunAdi,
    String(input.movementType || 'Al'), product.AnaKonum || '', product.DetayKonum || '', mainLocation,
    detailLocation, product.Durum || '', status, String(input.description || 'İşlem kaydı'), String(input.source || 'MastarTakip')
  ]);
  spreadsheet.getSheetByName(CONFIG.sheets.products).getRange(product._row, 5, 1, 3).setValues([[mainLocation, detailLocation, status]]);
  return { success: true };
}

function getFilterOptions() {
  const products = getRows_(CONFIG.sheets.products);
  return {
    statuses: [...new Set(products.map(row => row.Durum).filter(Boolean))].sort(),
    locations: [...new Set(products.map(row => row.AnaKonum).filter(Boolean))].sort()
  };
}

function getAnalytics() {
  const rows = getRows_(CONFIG.sheets.movements);
  const countBy = key => rows.reduce((result, row) => {
    const value = String(row[key] || 'Belirtilmemiş');
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
  ensureSheets_();
  return 'Tablo bağlantısı hazır.';
}
