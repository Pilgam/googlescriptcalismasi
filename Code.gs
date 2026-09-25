/*
CLAUDE PROJECT NOTES
- Empty product search means show every active product.
- Master list sorts by MastarNo then UrunAdi; selecting a row shows certificates, acceptance records and movements.
- Current user is read from Session and Kullanicilar; no external integration is used.
- Empty assignedTo defaults to the current actor. Different actor/assignee values are recorded in movement history.
- Calibration is entered by a technician/operator and remains pending until a quality/admin user decides.
- Keep functions small and independently reusable; do not merge UI routing, data access and approval rules.
*/

const SPREADSHEET_ID = '18qCBAwLaMnMw4kOxu_KgfpOFe5SxOBo8c0SOGpqXZ-c';
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

/** WEB APP ENTRY: renders only known pages and passes the current user to the template. */
function doGet(e) {
  ensureSheets();
  const template = HtmlService.createTemplateFromFile(normalizePage_(e && e.parameter && e.parameter.page));
  template.userContext = JSON.stringify(getCurrentUser_(e)).replace(/</g, '\\u003c');
  return template.evaluate().setTitle(APP_CONFIG.appName).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Web uygulamasının ana yayınlama URL'sini döndürür */
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

/** HTML parçalarını şablon olarak derleyip dahil eder */
function include(name) { 
  return HtmlService.createTemplateFromFile(name).evaluate().getContent(); 
}

function normalizePage_(value) { const wanted = String(value || '').toLowerCase(); return Object.keys(APP_CONFIG.pages).map(k => APP_CONFIG.pages[k]).find(p => p.toLowerCase() === wanted) || APP_CONFIG.pages.home; }

/** DATA ACCESS: active spreadsheet is preferred, fixed ID is the safe fallback for standalone web-app execution. */
function getSpreadsheet_() {
  let ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!ss && SPREADSHEET_ID) { try { ss = SpreadsheetApp.openById(SPREADSHEET_ID); } catch (e) { Logger.log(e); } }
  if (!ss) throw new Error('Google E-Tablosu bağlantısı bulunamadı.');
  return ss;
}
function ensureSheets() {
  const ss = getSpreadsheet_();
  [[APP_CONFIG.sheets.products, PRODUCT_HEADERS], [APP_CONFIG.sheets.certificates, CERTIFICATE_HEADERS], [APP_CONFIG.sheets.movements, MOVEMENT_HEADERS], [APP_CONFIG.sheets.users, USER_HEADERS]].forEach(item => {
    let sheet = ss.getSheetByName(item[0]);
    if (!sheet) sheet = ss.insertSheet(item[0]);
    if (sheet.getLastRow() === 0) { sheet.getRange(1, 1, 1, item[1].length).setValues([item[1]]); sheet.setFrozenRows(1); }
  });
}
function getSheetObjects_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues(); const headers = values[0].map(String);
  return values.slice(1).map((row, i) => { const item = {_row: i + 2}; headers.forEach((h, j) => item[h] = row[j]); return item; });
}
function normalize_(value) { return String(value == null ? '' : value).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim(); }
function isActive_(value) { return value !== false && String(value).toLowerCase() !== 'false' && String(value) !== '0'; }
function dateOnly_(value) { if (!value) return null; if (value instanceof Date) { const d = new Date(value); d.setHours(0,0,0,0); return isNaN(d) ? null : d; } const m = String(value).trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/); const d = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(value); if (isNaN(d.getTime())) return null; d.setHours(0,0,0,0); return d; }
function formatDate_(value, format) { const d = dateOnly_(value); return d ? Utilities.formatDate(d, Session.getScriptTimeZone(), format || 'dd.MM.yyyy') : ''; }

/** AUTHORIZATION: Kullanicilar is authoritative. Quality roles are kalite/quality; technicians may create entries. */
function getCurrentUser_(e) {
  const session = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const parameter = String((e && e.parameter && e.parameter.userEmail) || '').trim().toLowerCase();
  const email = session || parameter;
  const row = getSheetObjects_(APP_CONFIG.sheets.users).find(u => String(u.Email || '').trim().toLowerCase() === email);
  return { name: (row && row.KullaniciAdi) || String((e && e.parameter && e.parameter.userName) || 'Kullanıcı'), email, role: (row && row.Rol) || 'guest', active: row ? isActive_(row.Aktif) : Boolean(email), source: session ? 'google-account' : 'parameter' };
}
function getCurrentUserContext() { return getCurrentUser_({parameter:{}}); }
function role_(user) { return String(user && user.role || '').trim().toLowerCase(); }
function canCreateCalibration_(user) { return user && user.active && ['admin','operator','teknisyen','technician'].includes(role_(user)); }
function canApprove_(user) { return user && user.active && ['admin','kalite','quality'].includes(role_(user)); }

/** PRODUCT API: returns all active products for an empty query and supports live filtering. */
function formatProduct_(row) { const out = Object.assign({}, row); ['SonKontrolTarihi','SonrakiKontrolTarihi','GuncellenmeTarihi'].forEach(k => out[k] = formatDate_(out[k])); delete out._row; return out; }
function searchProducts(query, filters) {
  ensureSheets(); const q = normalize_(query); const options = filters || {};
  return getSheetObjects_(APP_CONFIG.sheets.products).filter(p => options.includeAll || isActive_(p.Aktif)).filter(p => !q || [p.MastarNo,p.UrunAdi,p.SeriNo,p.Aciklama,p.AnaKonum,p.DetayKonum].some(v => normalize_(v).includes(q))).filter(p => !options.status || String(p.Durum || '') === String(options.status)).filter(p => !options.location || String(p.AnaKonum || '') === String(options.location)).sort((a,b) => String(a.MastarNo || '').localeCompare(String(b.MastarNo || ''), 'tr', {numeric:true}) || String(a.UrunAdi || '').localeCompare(String(b.UrunAdi || ''), 'tr')).slice(0, 500).map(formatProduct_);
}
function getAllProducts(includeInactive) { return searchProducts('', {includeAll: includeInactive === true}); }
function getProductByNo(no) { const wanted = normalize_(no); return getSheetObjects_(APP_CONFIG.sheets.products).find(p => normalize_(p.MastarNo) === wanted) || null; }

/** HISTORY API: product detail is one request so the UI cannot show a partial product state. */
function getMovementHistory(no) { return getSheetObjects_(APP_CONFIG.sheets.movements).filter(r => normalize_(r.MastarNo) === normalize_(no)).sort((a,b) => new Date(b.TarihSaat || 0) - new Date(a.TarihSaat || 0)).slice(0,100).map(r => Object.assign({}, r, {TarihSaat: formatDate_(r.TarihSaat, 'dd.MM.yyyy HH:mm')})); }
function certificateStatus_(value) { const expiry = dateOnly_(value); if (!expiry) return 'Tarih Yok'; const days = Math.ceil((expiry - dateOnly_(new Date())) / 86400000); return days < 0 ? 'Süresi Dolmuş' : days <= CERTIFICATE_DAYS_WARNING ? '60 Gün İçinde' : 'Geçerli'; }
function certificateRows_() { return getSheetObjects_(APP_CONFIG.sheets.certificates).filter(r => isActive_(r.Aktif)).map(r => { const expiry = dateOnly_(r.GecerlilikTarihi); return Object.assign({}, r, {SertifikaDurumu: certificateStatus_(expiry), KalanGun: expiry ? Math.ceil((expiry-dateOnly_(new Date()))/86400000) : null, SertifikaTarihi: formatDate_(r.SertifikaTarihi,'yyyy-MM-dd'), GecerlilikTarihi: formatDate_(r.GecerlilikTarihi,'yyyy-MM-dd'), GuncellenmeTarihi: formatDate_(r.GuncellenmeTarihi,'yyyy-MM-dd')}); }); }
function getCertificates(filters) { const o=filters||{}, q=normalize_(o.query); return certificateRows_().filter(r => !q || [r.MastarNo,r.SertifikaNo,r.SertifikaTuru,r.Kurum].some(v => normalize_(v).includes(q))).filter(r => !o.mastarNo || normalize_(r.MastarNo)===normalize_(o.mastarNo)).filter(r => !o.certificateType || r.SertifikaTuru===o.certificateType).sort((a,b)=>(a.KalanGun==null?99999:a.KalanGun)-(b.KalanGun==null?99999:b.KalanGun)); }
function getCertificatesByProduct(no) { return getCertificates({mastarNo:no}); }
function getProductDetail(no) { const product=getProductByNo(no); if (!product) return null; return {product:formatProduct_(product), certificates:getCertificatesByProduct(no), history:getMovementHistory(no), acceptances:typeof getAcceptanceRecords === 'function' ? getAcceptanceRecords(no) : []}; }

/** MOVEMENT API: records actor and assignee separately and updates the current product state. */
function saveMovement(data) {
  const input=data||{}, product=getProductByNo(input.mastarNo); if (!product) throw new Error('Mastar bulunamadı.');
  const user=getCurrentUser_({parameter:{userEmail:input.userEmail||'',userName:input.userName||''}}); if (!user.active || !['admin','operator','teknisyen','technician'].includes(role_(user))) throw new Error('Bu işlem için yetkiniz bulunmuyor.');
  const actor=user.name||'Kullanıcı', assigned=String(input.assignedTo||actor).trim(), main=String(input.newMainLocation||product.AnaKonum||'Depo').trim(), detail=String(input.newDetailLocation||product.DetayKonum||'').trim(), status=String(input.newStatus||product.Durum||'').trim(), type=String(input.movementType||'Al'), reason=String(input.description||input.reasonPreset||'').trim()||type;
  getSpreadsheet_().getSheetByName(APP_CONFIG.sheets.movements).appendRow([Utilities.getUuid(),new Date(),user.email,actor,product.MastarNo,product.UrunAdi,type,product.AnaKonum||'',product.DetayKonum||'',main,detail,product.Durum||'',status,reason+' | '+(assigned!==actor?'Atayan: '+actor+' | Atanan: '+assigned:'İşlem yapan: '+actor),String(input.source||'MastarTakip')]);
  const sheet=getSpreadsheet_().getSheetByName(APP_CONFIG.sheets.products); sheet.getRange(product._row,5,1,3).setValues([[main,detail,status]]); sheet.getRange(product._row,8).setValue(assigned); return {success:true};
}

/** CERTIFICATE API: low-level certificate writing remains separate from acceptance workflow. */
function saveCertificate(data) { const input=data||{}; if (!input.mastarNo||!input.certificateType||!input.validityDate) throw new Error('Mastar no, tür ve geçerlilik tarihi zorunludur.'); const user=getCurrentUser_({parameter:{userEmail:input.userEmail||'',userName:input.userName||''}}); if (!canCreateCalibration_(user)) throw new Error('Kalibrasyon girişi için yetkiniz bulunmuyor.'); if (!getProductByNo(input.mastarNo)) throw new Error('Mastar bulunamadı.'); getSpreadsheet_().getSheetByName(APP_CONFIG.sheets.certificates).appendRow(['S-'+Utilities.getUuid().slice(0,8),input.mastarNo,input.certificateNo||'',input.certificateType,input.organization||'',input.certificateDate?dateOnly_(input.certificateDate):'',dateOnly_(input.validityDate),input.fileUrl||'',certificateStatus_(input.validityDate),input.description||'',true,user.name,new Date()]); return {success:true}; }

/** CALIBRATION + ACCEPTANCE: technician creates certificate and pending quality acceptance atomically by workflow. */
function saveCalibrationWithAcceptance(data) { const input=data||{}; if (!input.mastarNo||!input.certificateType||!input.validityDate||!input.acceptanceReason||!input.standard) throw new Error('Mastar, tür, geçerlilik tarihi, kabul nedeni ve standart zorunludur.'); const user=getCurrentUser_({parameter:{userEmail:input.userEmail||'',userName:input.userName||''}}); if (!canCreateCalibration_(user)) throw new Error('Kalibrasyon girişi için yetkiniz bulunmuyor.'); if (!getProductByNo(input.mastarNo)) throw new Error('Mastar bulunamadı.'); const certificateId='S-'+Utilities.getUuid().slice(0,8); getSpreadsheet_().getSheetByName(APP_CONFIG.sheets.certificates).appendRow([certificateId,input.mastarNo,input.certificateNo||'',input.certificateType,input.organization||'',input.certificateDate?dateOnly_(input.certificateDate):'',dateOnly_(input.validityDate),input.fileUrl||'',certificateStatus_(input.validityDate),input.description||'',true,user.name,new Date()]); const acceptance=createAcceptanceRecord({certificateId,mastarNo:input.mastarNo,acceptanceReason:input.acceptanceReason,standard:input.standard,requesterName:user.name,requesterEmail:user.email,description:input.description||'',userEmail:user.email,userName:user.name}); return {success:true,certificateId,acceptanceId:acceptance.acceptanceId,status:acceptance.status}; }
function getQualityUsers() { return getSheetObjects_(APP_CONFIG.sheets.users).filter(r => isActive_(r.Aktif) && ['admin','kalite','quality'].includes(String(r.Rol||'').toLowerCase())).map(r=>({name:r.KullaniciAdi,email:r.Email,role:r.Rol})); }

function getCertificateSummary() { const rows=certificateRows_(); return {total:rows.length,valid:rows.filter(r=>r.SertifikaDurumu==='Geçerli').length,expiringSoon:rows.filter(r=>r.SertifikaDurumu==='60 Gün İçinde').length,expired:rows.filter(r=>r.SertifikaDurumu==='Süresi Dolmuş').length,noDate:rows.filter(r=>r.SertifikaDurumu==='Tarih Yok').length}; }
function getFilterOptions() { const rows=getSheetObjects_(APP_CONFIG.sheets.products); return {statuses:[...new Set(rows.map(r=>r.Durum).filter(Boolean))].sort(),locations:[...new Set(rows.map(r=>r.AnaKonum).filter(Boolean))].sort()}; }
function getAnalytics() { const rows=getSheetObjects_(APP_CONFIG.sheets.movements), count=k=>rows.reduce((o,r)=>{const v=String(r[k]||'Belirtilmemiş');o[v]=(o[v]||0)+1;return o;},{}); return {totalMovements:rows.length,byMovement:count('HareketTuru'),byLocation:count('YeniAnaKonum'),byUser:count('KullaniciAdi'),byProduct:count('MastarNo')}; }
function getCalibrationEntryData(no) { const detail=getProductDetail(no); if (!detail) throw new Error('Mastar bulunamadı.'); return {product:detail.product,lastCalibration:(detail.certificates||[]).find(r=>String(r.SertifikaTuru||'').toLowerCase()==='kalibrasyon')||null,certificates:detail.certificates,currentUser:getCurrentUserContext()}; }
function baglantiyiTestEt() { ensureSheets(); return 'Tablo bağlantısı hazır.'; }
