const CERTIFICATE_DAYS_WARNING = 60;

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

function dateOnly_(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(String(value) + 'T00:00:00');
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

function formatDate_(value) {
  const date = dateOnly_(value);
  return date ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
}

function certificateRows_() {
  return getSheetObjects_(APP_CONFIG.sheets.certificates).filter((row) => isActive_(row.Aktif)).map((row) => {
    const expiry = dateOnly_(row.GecerlilikTarihi);
    const days = expiry ? Math.ceil((expiry - dateOnly_(new Date())) / 86400000) : null;
    return Object.assign({}, row, {
      SertifikaDurumu: certificateStatus_(expiry),
      KalanGun: days,
      SertifikaTarihi: formatDate_(row.SertifikaTarihi),
      GecerlilikTarihi: formatDate_(row.GecerlilikTarihi),
      GuncellenmeTarihi: formatDate_(row.GuncellenmeTarihi)
    });
  });
}

function getCertificates(filters) {
  const options = filters || {};
  const query = normalize_(options.query);
  return certificateRows_()
    .filter((row) => !query || [row.MastarNo, row.SertifikaNo, row.SertifikaTuru, row.Kurum].some((value) => normalize_(value).includes(query)))
    .filter((row) => !options.mastarNo || normalize_(row.MastarNo).includes(normalize_(options.mastarNo)))
    .filter((row) => !options.certificateType || row.SertifikaTuru === options.certificateType)
    .filter((row) => !options.status || row.SertifikaDurumu === options.status)
    .filter((row) => options.expiringSoon !== true || (row.KalanGun !== null && row.KalanGun >= 0 && row.KalanGun <= CERTIFICATE_DAYS_WARNING))
    .sort((a, b) => (a.KalanGun === null ? 99999 : a.KalanGun) - (b.KalanGun === null ? 99999 : b.KalanGun));
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
  if (!user.active || !['admin', 'operator'].includes(user.role)) throw new Error('Sertifika kaydı için yetkiniz bulunmuyor.');
  if (!getProductByNo(input.mastarNo)) throw new Error('Mastar bulunamadı.');

  const now = new Date();
  const row = [
    'S-' + Utilities.getUuid().slice(0, 8), input.mastarNo, input.certificateNo || '', input.certificateType,
    input.organization || '', input.certificateDate ? dateOnly_(input.certificateDate) : '', dateOnly_(input.validityDate),
    input.fileUrl || '', certificateStatus_(input.validityDate), input.description || '', true, user.name, now
  ];
  getCertificatesSheet_().appendRow(row);
  return { success: true };
}
