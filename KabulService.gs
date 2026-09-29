/*
CLAUDE APPROVAL NOTES
- A technician/operator creates the certificate and acceptance request.
- Quality/admin alone can approve or reject it.
- KabulKayitlari is the audit trail; certificate rows are never deleted.
*/
const ACCEPTANCE_SHEET = 'KabulKayitlari';
const ACCEPTANCE_HEADERS = ['KabulId','SertifikaId','MastarNo','KabulNedeni','Standart','TalepEden','TalepEdenEmail','TalepOnayi','TalepOnayTarihi','KaliteOnayi','KaliteOnayTarihi','Durum','Aciklama','Olusturan','OlusturmaTarihi'];
const ACCEPTANCE_REASONS = ['Yeni sertifika kabulü','Yıllık kalibrasyon yenileme','Sertifika süresi uzatma','Mastar ilk kabulü','Kontrol sonrası yeniden kabul'];
const ACCEPTANCE_STANDARDS = ['ISO 17025','ISO 9001','İç prosedür','Teknik şartname','Diğer'];
function getAcceptanceSheet_() { const ss=getSpreadsheet_(); let sheet=ss.getSheetByName(ACCEPTANCE_SHEET); if(!sheet)sheet=ss.insertSheet(ACCEPTANCE_SHEET); if(sheet.getLastRow()===0){sheet.getRange(1,1,1,ACCEPTANCE_HEADERS.length).setValues([ACCEPTANCE_HEADERS]);sheet.setFrozenRows(1);} return sheet; }
function getAcceptanceOptions() { return {reasons:ACCEPTANCE_REASONS,standards:ACCEPTANCE_STANDARDS,statuses:['Taslak','Kalite Onayı Bekliyor','Onaylandı','Reddedildi']}; }
function createAcceptanceRecord(data) { const input=data||{}; const user=getCurrentUser_({parameter:{userEmail:input.userEmail||'',userName:input.userName||''}}); if(!input.mastarNo||!input.certificateId||!input.acceptanceReason||!input.standard) throw new Error('Mastar, sertifika, kabul nedeni ve standart zorunludur.'); if(!canCreateCalibration_(user)) throw new Error('Kabul kaydı için yetkiniz bulunmuyor.'); const row=['K-'+Utilities.getUuid().slice(0,8),input.certificateId,input.mastarNo,input.acceptanceReason,input.standard,input.requesterName||user.name,input.requesterEmail||user.email,'Bekliyor','', 'Bekliyor','', 'Kalite Onayı Bekliyor',input.description||'',user.name,new Date()]; getAcceptanceSheet_().appendRow(row); return {success:true,acceptanceId:row[0],status:row[11]}; }
function getAcceptanceRecords(mastarNo) { return getSheetObjects_(ACCEPTANCE_SHEET).filter(r=>!mastarNo||normalize_(r.MastarNo)===normalize_(mastarNo)).sort((a,b)=>new Date(b.OlusturmaTarihi||0)-new Date(a.OlusturmaTarihi||0)); }
function getPendingAcceptanceRecords() { return getAcceptanceRecords('').filter(r=>r.Durum==='Kalite Onayı Bekliyor'); }
/* CLAUDE CONCURRENCY NOTE: the read (find pending row) and the write (set decision cells) happen inside one
   script lock, and the status is re-checked right before writing. This stops two quality users from approving
   or rejecting the same acceptance record at the same moment: whoever's request enters the lock second sees the
   already-decided status and gets a clear error instead of silently overwriting the first decision. */
function decideAcceptance_(data, decision) {
  const input=data||{}, user=getCurrentUser_({parameter:{userEmail:input.userEmail||'',userName:input.userName||''}});
  if(!canApprove_(user)) throw new Error('Bu karar yalnızca kalite yetkilisi veya yönetici tarafından verilebilir.');
  const lock=LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet=getAcceptanceSheet_(), item=getSheetObjects_(ACCEPTANCE_SHEET).find(r=>String(r.KabulId)===String(input.acceptanceId));
    if(!item) throw new Error('Kabul kaydı bulunamadı.');
    if(item.Durum!=='Kalite Onayı Bekliyor') throw new Error('Bu kayıt için karar zaten verilmiş: '+item.Durum+' (başka bir kullanıcı az önce karar vermiş olabilir).');
    sheet.getRange(item._row,10).setValue(decision);
    sheet.getRange(item._row,11).setValue(new Date());
    sheet.getRange(item._row,12).setValue(decision);
    sheet.getRange(item._row,14).setValue(String(item.Olusturan||'')+' | Kalite kararı: '+user.name);
    return {success:true,acceptanceId:input.acceptanceId,status:decision,decidedBy:user.name};
  } finally {
    lock.releaseLock();
  }
}
function approveAcceptance(data) { return decideAcceptance_(data,'Onaylandı'); }
function rejectAcceptance(data) { return decideAcceptance_(data,'Reddedildi'); }
