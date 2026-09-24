
/*
  CLAUDE / PRODUCT WORKFLOW NOTES
  - An empty search query means "show all active products"; it must never return an empty list.
  - The master list is sorted by MastarNo, then UrunAdi. The UI filters as the user types.
  - Selecting a product must show both historical certificate/calibration records and movement records.
  - A movement actor is the signed-in user. If assignedTo is empty, the product is assigned to that user.
  - If assignedTo differs from the actor, the movement description records both Atayan and Atanan.
  - Calibration entry is product-based, defaults location to Depo in the UI, and uses APP_CONTEXT for the current user.
  - Do not introduce an external integration/user service; Kullanicilar and the current Apps Script session are authoritative.
*/

/** Returns the complete product list for the master-list page. */
function getAllProducts(includeInactive) {
  return searchProducts('', { includeAll: includeInactive === true });
}

/**
 * Returns the data needed by the calibration-entry page in one request.
 * Keeping this server-side prevents the page from depending on an incomplete
 * client-side search result and guarantees the current product's last dates
 * and current owner are shown before a new calibration is entered.
 */
function getCalibrationEntryData(productNo) {
  const detail = getProductDetail(productNo);
  if (!detail) throw new Error('Mastar bulunamadı.');
  return {
    product: detail.product,
    lastCalibration: (detail.certificates || []).find((row) => String(row.SertifikaTuru || '').toLowerCase() === 'kalibrasyon') || null,
    certificates: detail.certificates || [],
    currentUser: getCurrentUser_({ parameter: {} })
  };
}
