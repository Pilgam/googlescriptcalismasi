const CERTIFICATE_HEADERS = [
  'SertifikaId', 'MastarNo', 'SertifikaNo', 'SertifikaTuru', 'Kurum',
  'SertifikaTarihi', 'GecerlilikTarihi', 'DosyaUrl', 'Durum', 'Aciklama',
  'Aktif', 'Ekleyen', 'GuncellenmeTarihi'
];

function getCertificatesSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Sertifikalar');
  if (!sheet) sheet = ss.insertSheet('Sertifikalar');
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, CERTIFICATE_HEADERS.length).setValues([CERTIFICATE_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getCertificateStatus_(validityDate) {
  if (!validityDate) return 'Tarih Yok';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(validityDate);
  expiry.setHours(0, 0, 0, 0);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  if (days < 0) return 'Süresi Dolmuş';
  if (days <= 60) return '60 Gün İçinde';
  return 'Geçerli';
}

function formatCertificate_(certificate) {
  const copy = Object.assign({}, certificate);
  ['SertifikaTarihi', 'GecerlilikTarihi', 'GuncellenmeTarihi'].forEach((key) => {
    if (copy[key] instanceof Date) {
      copy[key] = Utilities.formatDate(copy[key], Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  });
  if (copy.GecerlilikTarihi) copy.SertifikaDurumu = getCertificateStatus_(copy.GecerlilikTarihi);
  return copy;
}

function getCertificates(filters) {
  const options = filters || {};
  const rows = getSheetObjectsFromSheet_(getCertificatesSheet_());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows
    .filter((row) => String(row.Aktif).toLowerCase() !== 'false')
    .map((row) => {
      const item = Object.assign({}, row);
      item.SertifikaDurumu = getCertificateStatus_(item.GecerlilikTarihi);
      if (item.GecerlilikTarihi) {
        const expiry = new Date(item.GecerlilikTarihi);
        expiry.setHours(0, 0, 0, 0);
        item.KalanGun = Math.ceil((expiry - today) / 86400000);
      } else {
        item.KalanGun = null;
      }
      return item;
    })
    .filter((item) => !options.mastarNo || String(item.MastarNo).toLowerCase().includes(String(options.mastarNo).toLowerCase()))
    .filter((item) => !options.certificateType || item.SertifikaTuru === options.certificateType)
    .filter((item) => !options.status || item.SertifikaDurumu === options.status)
    .filter((item) => options.expiringSoon !== true || (item.KalanGun !== null && item.KalanGun >= 0 && item.KalanGun <= 60))
    .sort((a, b) => {
      if (a.KalanGun === null) return 1;
      if (b.KalanGun === null) return -1;
      return a.KalanGun - b.KalanGun;
    })
    .map(formatCertificate_);
}

function getCertificateFilterOptions() {
  const rows = getSheetObjectsFromSheet_(getCertificatesSheet_());
  return {
    types: [...new Set(rows.map((row) => row.SertifikaTuru).filter(Boolean))].sort(),
    statuses: ['Geçerli', '60 Gün İçinde', 'Süresi Dolmuş', 'Tarih Yok']
  };
}

function getCertificateSummary() {
  const rows = getCertificates({});
  return {
    total: rows.length,
    expiringSoon: rows.filter((row) => row.SertifikaDurumu === '60 Gün İçinde').length,
    expired: rows.filter((row) => row.SertifikaDurumu === 'Süresi Dolmuş').length
  };
}

function saveCertificate(data) {
  const input = data || {};
  if (!input.mastarNo || !input.certificateType || !input.validityDate) {
    throw new Error('Mastar no, sertifika türü ve geçerlilik tarihi zorunludur.');
  }

  const user = getCurrentUser_({ parameter: { userEmail: input.userEmail || '', userName: input.userName || '' } });
  if (!user.active || !['admin', 'operator'].includes(user.role)) {
    throw new Error('Sertifika kaydı için yetkiniz bulunmuyor.');
  }
  if (!getProductByNo(input.mastarNo)) throw new Error('Mastar bulunamadı.');

  const now = new Date();
  const sheet = getCertificatesSheet_();
  const row = [
    Utilities.getUuid(), input.mastarNo, input.certificateNo || '', input.certificateType,
    input.organization || '', input.certificateDate ? new Date(input.certificateDate) : '',
    new Date(input.validityDate), input.fileUrl || '', getCertificateStatus_(new Date(input.validityDate)),
    input.description || '', true, user.name, now
  ];
  sheet.appendRow(row);
  return formatCertificate_(Object.fromEntries(CERTIFICATE_HEADERS.map((header, index) => [header, row[index]])));
}

function getSheetObjectsFromSheet_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).map((row) => {
    const item = {};
    headers.forEach((header, index) => item[header] = row[index]);
    return item;
  });
}
