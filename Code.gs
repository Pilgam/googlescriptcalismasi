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

const CERTIFICATE_DAYS_WARNING = 60;

function doGet(e) {
  ensureSheets();
  const requested = String((e && e.parameter && e.parameter.page) || 'Index').toLowerCase();
  const pages = Object.keys(APP_CONFIG.pages).map((key) => APP_CONFIG.pages[key]);
  const page = pages.find((name) => name.toLowerCase() === requested) || APP_CONFIG.pages.home;
  const template = HtmlService.createTemplateFromFile(page);
  template.appUrl = ScriptApp.getService().getUrl() || '';
  template.userContext = JSON.stringify(getCurrentUser_(e)).replace(/</g, '\\u003c');
  return template.evaluate()
    .setTitle(APP_CONFIG.appName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
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
  const sessionEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const parameterEmail = String((e && e.parameter && e.parameter.userEmail) || '').trim().toLowerCase();
  const resolvedEmail = sessionEmail || parameterEmail;
  const record = getSheetObjects_(APP_CONFIG.sheets.users)
    .find((row) => String(row.Email || '').trim().toLowerCase() === resolvedEmail);

  return {
    name: record && record.KullaniciAdi ? record.KullaniciAdi : String((e && e.parameter && e.parameter.userName) || 'Kullanıcı'),
    email: resolvedEmail,
    role: record && record.Rol ? record.Rol : 'guest',
    active: record ? String(record.Aktif).toLowerCase() !== 'false' : Boolean(parameterEmail),
    source: sessionEmail ? 'google-account' : (parameterEmail ? 'integration-parameter' : 'unknown')
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
  return value !== false && String(value).toLowerCase() !== 'false' && String(value) !== '0';
}

function formatDate_(value, format) {
  if (!value) return '';
  const dateValue = value instanceof Date ? value : new Date(value);
  if (isNaN(dateValue.getTime())) return '';
  return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), format || 'dd.MM.yyyy');
}

function formatProduct_(product) {
  const copy = Object.assign({}, product);
  ['SonKontrolTarihi', 'SonrakiKontrolTarihi', 'GuncellenmeTarihi'].forEach((key) => {
    if (copy[key]) copy[key] = formatDate_(copy[key]);
  });
  return copy;
}

function searchProducts(query, filters) {
  ensureSheets();
  const keyword = normalize_(query || '');
  const options = filters || {};

  return getSheetObjects_(APP_CONFIG.sheets.products)
    .filter((product) => options.includeAll || isActive_(product.Aktif))
    .filter((product) => !keyword || [product.MastarNo, product.UrunAdi, product.SeriNo, product.Aciklama, product.AnaKonum, product.DetayKonum]
      .some((value) => normalize_(value).includes(keyword)))
    .filter((product) => !options.status || String(product.Durum || '') === String(options.status))
    .filter((product) => !options.location || String(product.AnaKonum || '') === String(options.location))
    .sort((a, b) => {
      const byNo = String(a.MastarNo || '').localeCompare(String(b.MastarNo || ''), 'tr', { numeric: true });
      if (byNo !== 0) return byNo;
      return String(a.UrunAdi || '').localeCompare(String(b.UrunAdi || ''), 'tr');
    })
    .slice(0, 80)
    .map(formatProduct_);
}

function getProductByNo(productNo) {
  const target = normalize_(productNo);
  const rows = getSheetObjects_(APP_CONFIG.sheets.products);
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (normalize_(row.MastarNo) === target) {
      return Object.assign({}, row, { _row: i + 2 });
    }
  }
  return null;
}

function getMovementHistory(productNo) {
  return getSheetObjects_(APP_CONFIG.sheets.movements)
    .filter((row) => normalize_(row.MastarNo) === normalize_(productNo))
    .sort((a, b) => new Date(b.TarihSaat || 0) - new Date(a.TarihSaat || 0))
    .slice(0, 100)
    .map((row) => Object.assign({}, row, { TarihSaat: formatDate_(row.TarihSaat, 'dd.MM.yyyy HH:mm') }));
}

function getProductDetail(productNo) {
  const product = getProductByNo(productNo);
  if (!product) return null;
  return {
    product: formatProduct_(product),
    certificates: getCertificates({ mastarNo: productNo }),
    history: getMovementHistory(productNo)
  };
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
  if (!user.active || !['admin', 'operator'].includes(String(user.role).toLowerCase())) {
    throw new Error('Bu işlem için yetkiniz bulunmuyor.');
  }

  const movementType = String(input.movementType || 'Al');
  const newMainLocation = String(input.newMainLocation || record.AnaKonum || 'Depo').trim();
  const newDetailLocation = String(input.newDetailLocation || record.DetayKonum || '').trim();
  const newStatus = String(input.newStatus || record.Durum || '').trim();
  const assignedTo = String(input.assignedTo || record.SorumluKisi || user.name || '').trim();
  const actor = String(user.name || 'Kullanıcı').trim();
  const reason = String(input.description || input.reasonPreset || '').trim() || getDefaultReason_(movementType);
  const assignmentText = assignedTo && assignedTo !== actor ? 'Atayan: ' + actor + ' | Atanan: ' + assignedTo : 'İşlem yapan: ' + actor;
  const ss = getSpreadsheet_();

  ss.getSheetByName(APP_CONFIG.sheets.movements).appendRow([
    Utilities.getUuid(),
    new Date(),
    user.email,
    actor,
    record.MastarNo,
    record.UrunAdi,
    movementType,
    record.AnaKonum || '',
    record.DetayKonum || '',
    newMainLocation,
    newDetailLocation,
    record.Durum || '',
    newStatus,
    reason + ' | ' + assignmentText,
    String(input.source || 'MastarTakip')
  ]);

  ss.getSheetByName(APP_CONFIG.sheets.products).getRange(record._row, 5, 1, 3).setValues([[newMainLocation, newDetailLocation, newStatus]]);
  if (assignedTo) {
    ss.getSheetByName(APP_CONFIG.sheets.products).getRange(record._row, 8).setValue(assignedTo);
  }

  return { success: true };
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

function dateOnly_(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(String(value));
  if (isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function certificateStatus_(value) {
  const expiry = dateOnly_(value);
  if (!expiry) return 'Tarih Yok';
  const today = dateOnly_(new Date());
  const days = Math.ceil((expiry - today) / 86400000);
  if (days < 0) return 'Süresi Dolmuş';
  if (days <= CERTIFICATE_DAYS_WARNING) return '60 Gün İçinde';
  return 'Geçerli';
}

function certificateRows_() {
  return getSheetObjects_(APP_CONFIG.sheets.certificates)
    .filter((row) => isActive_(row.Aktif))
    .map((row) => {
      const expiry = dateOnly_(row.GecerlilikTarihi);
      return Object.assign({}, row, {
        SertifikaDurumu: certificateStatus_(expiry),
        KalanGun: expiry ? Math.ceil((expiry - dateOnly_(new Date())) / 86400000) : null,
        SertifikaTarihi: formatDate_(row.SertifikaTarihi, 'yyyy-MM-dd'),
        GecerlilikTarihi: formatDate_(row.GecerlilikTarihi, 'yyyy-MM-dd'),
        GuncellenmeTarihi: formatDate_(row.GuncellenmeTarihi, 'yyyy-MM-dd')
      });
    });
}

function getCertificates(filters) {
  const options = filters || {};
  const query = normalize_(options.query || '');
  return certificateRows_()
    .filter((row) => !query || [row.MastarNo, row.SertifikaNo, row.SertifikaTuru, row.Kurum].some((value) => normalize_(value).includes(query)))
    .filter((row) => !options.mastarNo || normalize_(row.MastarNo) === normalize_(options.mastarNo))
    .filter((row) => !options.certificateType || row.SertifikaTuru === options.certificateType)
    .filter((row) => !options.status || row.SertifikaDurumu === options.status)
    .sort((a, b) => (a.KalanGun == null ? 99999 : a.KalanGun) - (b.KalanGun == null ? 99999 : b.KalanGun));
}

function getCertificatesByProduct(mastarNo) {
  return getCertificates({ mastarNo: mastarNo });
}

function getCertificateFilterOptions() {
  const rows = certificateRows_();
  return {
    types: [...new Set(rows.map((row) => row.SertifikaTuru).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'tr')),
    statuses: ['Geçerli', '60 Gün İçinde', 'Süresi Dolmuş', 'Tarih Yok']
  };
}

function getCertificateSummary() {
  const rows = certificateRows_();
  return {
    total: rows.length,
    valid: rows.filter((row) => row.SertifikaDurumu === 'Geçerli').length,
    expiringSoon: rows.filter((row) => row.SertifikaDurumu === '60 Gün İçinde').length,
    expired: rows.filter((row) => row.SertifikaDurumu === 'Süresi Dolmuş').length,
    noDate: rows.filter((row) => row.SertifikaDurumu === 'Tarih Yok').length
  };
}

function saveCertificate(data) {
  const input = data || {};
  if (!input.mastarNo || !input.certificateType || !input.validityDate) {
    throw new Error('Mastar no, sertifika türü ve geçerlilik tarihi zorunludur.');
  }

  const user = getCurrentUser_({ parameter: { userEmail: input.userEmail || '', userName: input.userName || '' } });
  if (!user.active || !['admin', 'operator'].includes(String(user.role).toLowerCase())) {
    throw new Error('Sertifika kaydı için yetkiniz bulunmuyor.');
  }

  if (!getProductByNo(input.mastarNo)) {
    throw new Error('Mastar bulunamadı.');
  }

  const row = [
    'S-' + Utilities.getUuid().slice(0, 8),
    input.mastarNo,
    input.certificateNo || '',
    input.certificateType,
    input.organization || '',
    input.certificateDate ? dateOnly_(input.certificateDate) : '',
    dateOnly_(input.validityDate),
    input.fileUrl || '',
    certificateStatus_(input.validityDate),
    input.description || '',
    true,
    input.assignedTo || user.name,
    new Date()
  ];

  getCertificatesSheet_().appendRow(row);
  return { success: true };
}

function getCertificatesSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(APP_CONFIG.sheets.certificates);
  if (!sheet) sheet = ss.insertSheet(APP_CONFIG.sheets.certificates);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, CERTIFICATE_HEADERS.length).setValues([CERTIFICATE_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function baglantiyiTestEt() {
  ensureSheets();
  return 'Tablo bağlantısı hazır.';
}
