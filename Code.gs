/*
CLAUDE PROJECT NOTES
- Empty product search means show every active product.
- Master list sorts by MastarNo, then UrunAdi; clicking a row shows old calibrations and movements.
- Current user is read from Session and Kullanicilar. No external integration is used.
- If assignedTo is empty, assign to the actor. If different, history says Atayan and Atanan.
- Calibration entry is product-based and defaults location to Depo.
*/
const APP_CONFIG = {
  appName: 'Mastar Takip',
  sheets: { products: 'Urunler', certificates: 'Sertifikalar', movements: 'Hareketler', users: 'Kullanicilar' },
  pages: { home: 'Index', masterTracking: 'MasterTakip', reports: 'Raporlar', certificates: 'Sertifikalar' }
};
const PRODUCT_HEADERS = ['MastarNo','UrunAdi','SeriNo','Aciklama','AnaKonum','DetayKonum','Durum','SorumluKisi','SonKontrolTarihi','SonrakiKontrolTarihi','KalibrasyonDurumu','Aktif','Guncelleyen','GuncellenmeTarihi'];
const MOVEMENT_HEADERS = ['HareketId','TarihSaat','KullaniciEmail','KullaniciAdi','MastarNo','MastarAdi','HareketTuru','EskiAnaKonum','EskiDetayKonum','YeniAnaKonum','YeniDetayKonum','EskiDurum','YeniDurum','Aciklama','Kaynak'];
const USER_HEADERS = ['KullaniciAdi','Email','Rol','Aktif'];
const CERTIFICATE_HEADERS = ['SertifikaId','MastarNo','SertifikaNo','SertifikaTuru','Kurum','SertifikaTarihi','GecerlilikTarihi','DosyaUrl','Durum','Aciklama','Aktif','Ekleyen','GuncellenmeTarihi'];
const CERTIFICATE_DAYS_WARNING = 60;

function doGet(e) {
  ensureSheets();
  const page = normalizePage_(e && e.parameter && e.parameter.page);
  const template = HtmlService.createTemplateFromFile(page);
  template.userContext = JSON.stringify(getCurrentUser_(e)).replace(/</g, '\\u003c');
  return template.evaluate().setTitle(APP_CONFIG.appName).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function normalizePage_(value) { const wanted = String(value || '').toLowerCase(); return Object.keys(APP_CONFIG.pages).map(k => APP_CONFIG.pages[k]).find(p => p.toLowerCase() === wanted) || 'Index'; }
function getSpreadsheet_() { const ss = SpreadsheetApp.getActiveSpreadsheet(); if (!ss) throw new Error('Google E-Tablosu bağlantısı bulunamadı.'); return ss; }
function ensureSheets() {
  const ss = getSpreadsheet_();
  [[APP_CONFIG.sheets.products, PRODUCT_HEADERS], [APP_CONFIG.sheets.certificates, CERTIFICATE_HEADERS], [APP_CONFIG.sheets.movements, MOVEMENT_HEADERS], [APP_CONFIG.sheets.users, USER_HEADERS]].forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name); if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) { sheet.getRange(1, 1, 1, headers.length).setValues([headers]); sheet.setFrozenRows(1); }
  });
}
function getSheetObjects_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name); if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues(); const headers = values[0].map(String);
  return values.slice(1).map((row, i) => { const item = {_row: i + 2}; headers.forEach((h, j) => item[h] = row[j]); return item; });
}
function normalize_(value) { return String(value == null ? '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim(); }
function isActive_(value) { return value !== false && String(value).toLowerCase() !== 'false' && String(value) !== '0'; }
function dateOnly_(value) { if (!value) return null; const d = value instanceof Date ? new Date(value) : new Date(String(value)); if (isNaN(d.getTime())) return null; d.setHours(0,0,0,0); return d; }
function formatDate_(value, format) { const d = dateOnly_(value); return d ? Utilities.formatDate(d, Session.getScriptTimeZone(), format || 'dd.MM.yyyy') : ''; }
function getCurrentUser_(e) {
  const session = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const param = String((e && e.parameter && e.parameter.userEmail) || '').trim().toLowerCase();
  const email = session || param; const row = getSheetObjects_(APP_CONFIG.sheets.users).find(u => String(u.Email || '').trim().toLowerCase() === email);
  return { name: row && row.KullaniciAdi || String((e && e.parameter && e.parameter.userName) || 'Kullanıcı'), email: email, role: row && row.Rol || 'guest', active: row ? isActive_(row.Aktif) : Boolean(param), source: session ? 'google-account' : 'parameter' };
}
function getCurrentUserContext() { return getCurrentUser_({parameter:{}}); }
function formatProduct_(row) { const out = Object.assign({}, row); ['SonKontrolTarihi','SonrakiKontrolTarihi','GuncellenmeTarihi'].forEach(k => out[k] = formatDate_(out[k])); delete out._row; return out; }
function searchProducts(query, filters) {
  ensureSheets(); const q = normalize_(query); const options = filters || {};
  return getSheetObjects_(APP_CONFIG.sheets.products).filter(p => options.includeAll || isActive_(p.Aktif)).filter(p => !q || [p.MastarNo,p.UrunAdi,p.SeriNo,p.Aciklama,p.AnaKonum,p.DetayKonum].some(v => normalize_(v).includes(q))).filter(p => !options.status || String(p.Durum || '') === String(options.status)).filter(p => !options.location || String(p.AnaKonum || '') === String(options.location)).sort((a,b) => String(a.MastarNo || '').localeCompare(String(b.MastarNo || ''), 'tr', {numeric:true}) || String(a.UrunAdi || '').localeCompare(String(b.UrunAdi || ''), 'tr')).slice(0, 500).map(formatProduct_);
}
function getAllProducts(includeInactive) { return searchProducts('', {includeAll: includeInactive === true}); }
function getProductByNo(no) { const target = normalize_(no); return getSheetObjects_(APP_CONFIG.sheets.products).find(p => normalize_(p.MastarNo) === target) || null; }
function getMovementHistory(no) { return getSheetObjects_(APP_CONFIG.sheets.movements).filter(r => normalize_(r.MastarNo) === normalize_(no)).sort((a,b) => new Date(b.TarihSaat || 0) - new Date(a.TarihSaat || 0)).slice(0,100).map(r => Object.assign({}, r, {TarihSaat: formatDate_(r.TarihSaat, 'dd.MM.yyyy HH:mm')})); }
function certificateStatus_(value) { const expiry = dateOnly_(value); if (!expiry) return 'Tarih Yok'; const days = Math.ceil((expiry - dateOnly_(new Date())) / 86400000); return days < 0 ? 'Süresi Dolmuş' : days <= CERTIFICATE_DAYS_WARNING ? '60 Gün İçinde' : 'Geçerli'; }
function certificateRows_() { return getSheetObjects_(APP_CONFIG.sheets.certificates).filter(r => isActive_(r.Aktif)).map(r => { const expiry = dateOnly_(r.GecerlilikTarihi); return Object.assign({}, r, {SertifikaDurumu: certificateStatus_(expiry), KalanGun: expiry ? Math.ceil((expiry-dateOnly_(new Date()))/86400000) : null, SertifikaTarihi: formatDate_(r.SertifikaTarihi,'yyyy-MM-dd'), GecerlilikTarihi: formatDate_(r.GecerlilikTarihi,'yyyy-MM-dd'), GuncellenmeTarihi: formatDate_(r.GuncellenmeTarihi,'yyyy-MM-dd')}); }); }
function getCertificates(filters) { const o = filters || {}; const q = normalize_(o.query); return certificateRows_().filter(r => !q || [r.MastarNo,r.SertifikaNo,r.SertifikaTuru,r.Kurum].some(v => normalize_(v).includes(q))).filter(r => !o.mastarNo || normalize_(r.MastarNo) === normalize_(o.mastarNo)).filter(r => !o.certificateType || r.SertifikaTuru === o.certificateType).filter(r => !o.status || r.SertifikaDurumu === o.status).filter(r => o.expiringSoon !== true || (r.KalanGun != null && r.KalanGun >= 0 && r.KalanGun <= CERTIFICATE_DAYS_WARNING)).sort((a,b) => (a.KalanGun == null ? 99999 : a.KalanGun) - (b.KalanGun == null ? 99999 : b.KalanGun)); }
function getCertificatesByProduct(no) { return getCertificates({mastarNo:no}); }
function getProductDetail(no) { const product = getProductByNo(no); if (!product) return null; return {product: formatProduct_(product), certificates: getCertificatesByProduct(no), history: getMovementHistory(no)}; }
function saveMovement(data) {
  ensureSheets(); const input = data || {}; const product = getProductByNo(input.mastarNo); if (!product) throw new Error('Mastar bulunamadı.');
  const user = getCurrentUser_({parameter:{userEmail:input.userEmail || '', userName:input.userName || ''}}); if (!user.active || !['admin','operator'].includes(String(user.role).toLowerCase())) throw new Error('Bu işlem için yetkiniz bulunmuyor.');
  const actor = user.name || 'Kullanıcı'; const assigned = String(input.assignedTo || actor).trim(); const assignment = assigned !== actor ? 'Atayan: ' + actor + ' | Atanan: ' + assigned : 'İşlem yapan: ' + actor;
  const main = String(input.newMainLocation || product.AnaKonum || 'Depo').trim(); const detail = String(input.newDetailLocation || product.DetayKonum || '').trim(); const status = String(input.newStatus || product.Durum || '').trim(); const type = String(input.movementType || 'Al'); const reason = String(input.description || input.reasonPreset || '').trim() || type;
  getSpreadsheet_().getSheetByName(APP_CONFIG.sheets.movements).appendRow([Utilities.getUuid(),new Date(),user.email,actor,product.MastarNo,product.UrunAdi,type,product.AnaKonum || '',product.DetayKonum || '',main,detail,product.Durum || '',status,reason + ' | ' + assignment,String(input.source || 'MastarTakip')]);
  const sheet = getSpreadsheet_().getSheetByName(APP_CONFIG.sheets.products); sheet.getRange(product._row,5,1,3).setValues([[main,detail,status]]); sheet.getRange(product._row,8).setValue(assigned); return {success:true};
}
function saveCertificate(data) {
  const input = data || {}; if (!input.mastarNo || !input.certificateType || !input.validityDate) throw new Error('Mastar no, tür ve geçerlilik tarihi zorunludur.');
  const user = getCurrentUser_({parameter:{userEmail:input.userEmail || '', userName:input.userName || ''}}); if (!user.active || !['admin','operator'].includes(String(user.role).toLowerCase())) throw new Error('Sertifika kaydı için yetkiniz bulunmuyor.'); if (!getProductByNo(input.mastarNo)) throw new Error('Mastar bulunamadı.');
  getSpreadsheet_().getSheetByName(APP_CONFIG.sheets.certificates).appendRow(['S-' + Utilities.getUuid().slice(0,8),input.mastarNo,input.certificateNo || '',input.certificateType,input.organization || '',input.certificateDate ? dateOnly_(input.certificateDate) : '',dateOnly_(input.validityDate),input.fileUrl || '',certificateStatus_(input.validityDate),input.description || '',true,input.assignedTo || user.name,new Date()]); return {success:true};
}
function getCertificateFilterOptions() { const rows=certificateRows_(); return {types:[...new Set(rows.map(r=>r.SertifikaTuru).filter(Boolean))].sort(), statuses:['Geçerli','60 Gün İçinde','Süresi Dolmuş','Tarih Yok']}; }
function getCertificateSummary() { const rows=certificateRows_(); return {total:rows.length,valid:rows.filter(r=>r.SertifikaDurumu==='Geçerli').length,expiringSoon:rows.filter(r=>r.SertifikaDurumu==='60 Gün İçinde').length,expired:rows.filter(r=>r.SertifikaDurumu==='Süresi Dolmuş').length,noDate:rows.filter(r=>r.SertifikaDurumu==='Tarih Yok').length}; }
function getFilterOptions() { const rows=getSheetObjects_(APP_CONFIG.sheets.products); return {statuses:[...new Set(rows.map(r=>r.Durum).filter(Boolean))].sort(),locations:[...new Set(rows.map(r=>r.AnaKonum).filter(Boolean))].sort()}; }
function getAnalytics() { const rows=getSheetObjects_(APP_CONFIG.sheets.movements); const count=k=>rows.reduce((o,r)=>{const v=String(r[k] || 'Belirtilmemiş');o[v]=(o[v]||0)+1;return o;},{}); return {totalMovements:rows.length,byMovement:count('HareketTuru'),byLocation:count('YeniAnaKonum'),byUser:count('KullaniciAdi'),byProduct:count('MastarNo')}; }
function getCalibrationEntryData(no) { const d=getProductDetail(no); if(!d) throw new Error('Mastar bulunamadı.'); return {product:d.product,lastCalibration:d.certificates.find(r=>String(r.SertifikaTuru).toLowerCase()==='kalibrasyon') || null,certificates:d.certificates,currentUser:getCurrentUserContext()}; }
function baglantiyiTestEt() { ensureSheets(); return 'Tablo bağlantısı hazır.'; }
