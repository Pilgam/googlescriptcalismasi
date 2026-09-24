const ACCEPTANCE_SHEET = 'KabulKayitlari';
const ACCEPTANCE_HEADERS = [
  'KabulId', 'SertifikaId', 'MastarNo', 'KabulNedeni', 'Standart',
  'TalepEden', 'TalepEdenEmail', 'TalepOnayi', 'TalepOnayTarihi',
  'KaliteOnayi', 'KaliteOnayTarihi', 'Durum', 'Aciklama', 'Olusturan', 'OlusturmaTarihi'
];

const ACCEPTANCE_REASONS = [
  'Yeni sertifika kabulü',
  'Yıllık kalibrasyon yenileme',
  'Sertifika süresi uzatma',
  'Mastar ilk kabulü',
  'Kontrol sonrası yeniden kabul'
];

const ACCEPTANCE_STANDARDS = [
  'ISO 17025',
  'ISO 9001',
  'İç prosedür',
  'Teknik şartname',
  'Diğer'
];

function getAcceptanceSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(ACCEPTANCE_SHEET);
  if (!sheet) sheet = ss.insertSheet(ACCEPTANCE_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, ACCEPTANCE_HEADERS.length).setValues([ACCEPTANCE_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getAcceptanceOptions() {
  return {
    reasons: ACCEPTANCE_REASONS,
    standards: ACCEPTANCE_STANDARDS,
    statuses: ['Taslak', 'Talep Onayı Bekliyor', 'Kalite Onayı Bekliyor', 'Onaylandı', 'Reddedildi']
  };
}

function createAcceptanceRecord(data) {
  const input = data || {};
  if (!input.mastarNo || !input.certificateId || !input.acceptanceReason || !input.standard) {
    throw new Error('Mastar, sertifika, kabul nedeni ve standart zorunludur.');
  }

  const user = getCurrentUser_({
    parameter: { userEmail: input.userEmail || '', userName: input.userName || '' }
  });
  if (!user.active || !['admin', 'operator'].includes(user.role)) {
    throw new Error('Kabul kaydı için yetkiniz bulunmuyor.');
  }

  const row = [
    'K-' + Utilities.getUuid().slice(0, 8),
    input.certificateId,
    input.mastarNo,
    input.acceptanceReason,
    input.standard,
    input.requesterName || user.name,
    input.requesterEmail || user.email,
    'Bekliyor',
    '',
    'Bekliyor',
    '',
    'Talep Onayı Bekliyor',
    input.description || '',
    user.name,
    new Date()
  ];

  getAcceptanceSheet_().appendRow(row);
  return { success: true, acceptanceId: row[0], status: row[11] };
}

function getAcceptanceRecords(mastarNo) {
  return getSheetObjects_(ACCEPTANCE_SHEET)
    .filter((row) => !mastarNo || normalize_(row.MastarNo) === normalize_(mastarNo))
    .sort((a, b) => new Date(b.OlusturmaTarihi) - new Date(a.OlusturmaTarihi));
}
