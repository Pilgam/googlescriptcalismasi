

/*
CLAUDE ARCHITECTURE NOTE — acceptance workflow
- Calibration is entered by a technician/operator and never becomes approved automatically.
- Every calibration entry creates an acceptance record with reason and standard.
- Quality users are rows in Kullanicilar with Rol = kalite or quality.
- Only quality/admin users may approve or reject an acceptance.
- The acceptance record is the audit source; certificate history remains immutable.
- Current user comes from Session/Kullanicilar. No external integration is introduced.
*/

function getProductDetail(productNo) {
  const product = getProductByNo(productNo);
  if (!product) return null;
  return {
    product: formatProduct_(product),
    certificates: typeof getCertificatesByProduct === 'function' ? getCertificatesByProduct(productNo) : [],
    history: getMovementHistory(productNo)
  };
}

function getQualityUsers() {
  return getSheetObjects_(APP_CONFIG.sheets.users)
    .filter(function (row) {
      const role = String(row.Rol || '').toLowerCase();
      return isActive_(row.Aktif) && (role === 'kalite' || role === 'quality' || role === 'admin');
    })
    .map(function (row) { return { name: row.KullaniciAdi, email: row.Email, role: row.Rol }; });
}

function saveCalibrationWithAcceptance(data) {
  const input = data || {};
  if (!input.mastarNo || !input.certificateType || !input.validityDate || !input.acceptanceReason || !input.standard) {
    throw new Error('Mastar, tür, geçerlilik tarihi, kabul nedeni ve standart zorunludur.');
  }
  const user = getCurrentUser_({ parameter: { userEmail: input.userEmail || '', userName: input.userName || '' } });
  if (!user.active || !['admin', 'operator', 'teknisyen', 'technician'].includes(String(user.role).toLowerCase())) {
    throw new Error('Kalibrasyon girişi için yetkiniz bulunmuyor.');
  }
  if (!getProductByNo(input.mastarNo)) throw new Error('Mastar bulunamadı.');

  const certificateId = 'S-' + Utilities.getUuid().slice(0, 8);
  const now = new Date();
  const certificateRow = [
    certificateId, input.mastarNo, input.certificateNo || '', input.certificateType,
    input.organization || '', input.certificateDate ? dateOnly_(input.certificateDate) : '',
    dateOnly_(input.validityDate), input.fileUrl || '', certificateStatus_(input.validityDate),
    input.description || '', true, user.name, now
  ];
  getSpreadsheet_().getSheetByName(APP_CONFIG.sheets.certificates).appendRow(certificateRow);

  const acceptance = createAcceptanceRecord({
    certificateId: certificateId,
    mastarNo: input.mastarNo,
    acceptanceReason: input.acceptanceReason,
    standard: input.standard,
    requesterName: user.name,
    requesterEmail: user.email,
    description: input.description || '',
    userEmail: user.email,
    userName: user.name
  });
  return { success: true, certificateId: certificateId, acceptanceId: acceptance.acceptanceId, status: acceptance.status };
}

function approveAcceptance(data) {
  return updateAcceptanceDecision_(data, 'Onaylandı');
}

function rejectAcceptance(data) {
  return updateAcceptanceDecision_(data, 'Reddedildi');
}

function updateAcceptanceDecision_(data, decision) {
  const input = data || {};
  const user = getCurrentUser_({ parameter: { userEmail: input.userEmail || '', userName: input.userName || '' } });
  const role = String(user.role || '').toLowerCase();
  if (!user.active || !['admin', 'kalite', 'quality'].includes(role)) {
    throw new Error('Bu karar yalnızca kalite yetkilisi veya yönetici tarafından verilebilir.');
  }
  const sheet = getAcceptanceSheet_();
  const rows = getSheetObjects_(ACCEPTANCE_SHEET);
  const item = rows.find(function (row) { return String(row.KabulId) === String(input.acceptanceId); });
  if (!item) throw new Error('Kabul kaydı bulunamadı.');
  const row = item._row;
  sheet.getRange(row, 10).setValue(decision);
  sheet.getRange(row, 11).setValue(new Date());
  sheet.getRange(row, 12).setValue(decision);
  sheet.getRange(row, 14).setValue((item.Olusturan || '') + ' | Kalite kararı: ' + user.name);
  return { success: true, acceptanceId: input.acceptanceId, status: decision, decidedBy: user.name };
}

function getAcceptanceRecords(mastarNo) {
  return getSheetObjects_(ACCEPTANCE_SHEET)
    .filter(function (row) { return !mastarNo || normalize_(row.MastarNo) === normalize_(mastarNo); })
    .sort(function (a, b) { return new Date(b.OlusturmaTarihi || 0) - new Date(a.OlusturmaTarihi || 0); });
}
