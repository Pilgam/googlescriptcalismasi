<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      :root {
        --bg: #f4f7fb;
        --card: #ffffff;
        --text: #1f2937;
        --muted: #6b7280;
        --primary: #2563eb;
        --primary-dark: #1d4ed8;
        --border: #dfe7f5;
        --danger: #dc2626;
        --success: #16a34a;
        --warning: #f59e0b;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background: var(--bg);
        font-family: Arial, sans-serif;
        color: var(--text);
      }

      .container {
        max-width: 1100px;
        margin: 32px auto;
        padding: 20px;
      }

      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .topbar a {
        text-decoration: none;
        color: var(--primary);
        font-weight: 700;
      }

      .panel {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 20px;
        margin-bottom: 18px;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
      }

      .search-wrap {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      input, select, textarea, button {
        font: inherit;
      }

      input, select, textarea {
        width: 100%;
        padding: 12px 14px;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: #fff;
      }

      .search-input {
        flex: 1;
        min-width: 220px;
      }

      .primary-btn {
        border: none;
        border-radius: 10px;
        padding: 12px 18px;
        background: var(--primary);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .primary-btn:hover {
        background: var(--primary-dark);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }

      .result-card {
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        background: #fff;
      }

      .result-card:hover {
        border-color: var(--primary);
      }

      .result-card.active {
        border-color: var(--primary);
        background: #eff6ff;
      }

      .detail-title {
        font-size: 22px;
        margin: 0 0 12px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 0;
        border-bottom: 1px solid #eef2f7;
      }

      .info-row:last-child {
        border-bottom: none;
      }

      .label {
        color: var(--muted);
      }

      .history-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }

      .history-table th, .history-table td {
        border-bottom: 1px solid var(--border);
        padding: 10px 8px;
        text-align: left;
        vertical-align: top;
      }

      .muted {
        color: var(--muted);
      }

      .message {
        display: none;
        margin-top: 12px;
        padding: 10px 12px;
        border-radius: 10px;
        font-weight: 600;
      }

      .message.success {
        display: block;
        background: #ecfdf5;
        color: var(--success);
      }

      .message.error {
        display: block;
        background: #fef2f2;
        color: var(--danger);
      }

      .hidden {
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="topbar">
        <h2 style="margin:0;">Mastar Takip</h2>
        <a href="?page=Index">Ana Menü</a>
      </div>

      <div class="panel">
        <div class="search-wrap">
          <input id="searchInput" class="search-input" type="text" placeholder="Ürün no, isim veya açıklama girin" />
          <button id="searchBtn" class="primary-btn" type="button">Ara</button>
        </div>
      </div>

      <div id="results" class="panel"></div>

      <div id="detailPanel" class="panel hidden">
        <h3 class="detail-title">Ürün Detayı</h3>

        <div class="grid" style="margin-bottom: 20px;">
          <div>
            <div class="info-row"><span class="label">Ürün No</span> <strong id="productNo"></strong></div>
            <div class="info-row"><span class="label">Ürün Adı</span> <strong id="productName"></strong></div>
            <div class="info-row"><span class="label">Açıklama</span> <span id="productDescription"></span></div>
          </div>
          <div>
            <div class="info-row"><span class="label">Ana Konum</span> <strong id="productLocation"></strong></div>
            <div class="info-row"><span class="label">Detay Konum</span> <strong id="productDetailLocation"></strong></div>
            <div class="info-row"><span class="label">Durum</span> <strong id="productStatus"></strong></div>
          </div>
        </div>

        <h4 style="margin: 0 0 12px;">Yeni Hareket</h4>
        <div class="grid">
          <div>
            <label class="muted" for="userName">Kullanıcı</label>
            <input id="userName" type="text" value="Yönetici" />
          </div>
          <div>
            <label class="muted" for="movementType">Hareket Türü</label>
            <select id="movementType">
              <option value="Teslim">Teslim</option>
              <option value="Giris">Giriş</option>
              <option value="Cikis">Çıkış</option>
              <option value="Transfer">Transfer</option>
              <option value="Kontrol">Kontrol</option>
            </select>
          </div>
          <div>
            <label class="muted" for="newLocation">Yeni Konum</label>
            <input id="newLocation" type="text" placeholder="Depo-1 / Raf-A2" />
          </div>
        </div>

        <div style="margin-top: 16px;">
          <label class="muted" for="movementDescription">Açıklama</label>
          <textarea id="movementDescription" rows="3" placeholder="Kullanıcı, neden, tarih, not vb."></textarea>
        </div>

        <div style="margin-top: 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button id="saveMovementBtn" class="primary-btn" type="button">Kaydet</button>
          <span id="statusMessage" class="message"></span>
        </div>

        <div style="margin-top: 24px;">
          <h4 style="margin: 0 0 10px;">Hareket Geçmişi</h4>
          <div id="historyList"></div>
        </div>
      </div>
    </div>

    <script>
      let selectedProduct = null;

      document.getElementById('searchBtn').addEventListener('click', searchProducts);
      document.getElementById('searchInput').addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          searchProducts();
        }
      });

      document.getElementById('saveMovementBtn').addEventListener('click', saveMovement);

      function searchProducts() {
        const query = document.getElementById('searchInput').value;

        if (!query.trim()) {
          showStatus('Lütfen arama kriteri girin.', 'error');
          return;
        }

        showStatus('', '');

        google.script.run.withSuccessHandler(renderResults).searchProducts(query);
      }

      function renderResults(products) {
        const resultsContainer = document.getElementById('results');

        if (!products || products.length === 0) {
          resultsContainer.innerHTML = '<p class="muted">Sonuç bulunamadı.</p>';
          return;
        }

        resultsContainer.innerHTML = '<h3 style="margin-top:0;">Sonuçlar</h3>' +
          '<div class="grid">' +
          products.map(function (product) {
            return '<div class="result-card" data-product-no="' + product.UrunNo + '" onclick="selectProduct(this)">' +
              '<strong>' + product.UrunAdi + '</strong><br>' +
              '<span class="muted">No: ' + product.UrunNo + '</span><br>' +
              '<span class="muted">Konum: ' + (product.AnaKonum || '-') + '</span>' +
              '</div>';
          }).join('') +
          '</div>';
      }

      function selectProduct(element) {
        const clickedNo = element.getAttribute('data-product-no');
        const product = JSON.parse(JSON.stringify(selectedProduct || {}));

        google.script.run.withSuccessHandler(function (result) {
          const found = result && result.length > 0 ? result[0] : null;

          if (!found) {
            showStatus('Ürün detay bilgisi yüklenemedi.', 'error');
            return;
          }

          selectedProduct = found;
          document.getElementById('detailPanel').classList.remove('hidden');
          document.getElementById('productNo').textContent = found.UrunNo;
          document.getElementById('productName').textContent = found.UrunAdi;
          document.getElementById('productDescription').textContent = found.Aciklama || '-';
          document.getElementById('productLocation').textContent = found.AnaKonum || '-';
          document.getElementById('productDetailLocation').textContent = found.DetayKonum || '-';
          document.getElementById('productStatus').textContent = found.Durum || '-';

          var cards = document.querySelectorAll('.result-card');
          cards.forEach(function (card) {
            card.classList.remove('active');
            if (card.getAttribute('data-product-no') === clickedNo) {
              card.classList.add('active');
            }
          });

          google.script.run.withSuccessHandler(renderHistory).getMovementHistory(found.UrunNo);
        }).searchProducts(clickedNo);
      }

      function saveMovement() {
        if (!selectedProduct) {
          showStatus('Önce ürün seçin.', 'error');
          return;
        }

        const productNo = document.getElementById('productNo').textContent.trim();
        const movementType = document.getElementById('movementType').value;
        const newLocation = document.getElementById('newLocation').value.trim();
        const description = document.getElementById('movementDescription').value.trim();
        const userName = document.getElementById('userName').value.trim() || 'Yönetici';

        google.script.run
          .withSuccessHandler(function (response) {
            showStatus('Kayıt başarılı.', 'success');
            document.getElementById('newLocation').value = '';
            document.getElementById('movementDescription').value = '';
            document.getElementById('productLocation').textContent = response.newLocation;
            google.script.run.withSuccessHandler(renderHistory).getMovementHistory(productNo);
          })
          .withFailureHandler(function (error) {
            showStatus(error.message || 'Kayıt sırasında hata oluştu.', 'error');
          })
          .saveMovement(productNo, movementType, newLocation, description, userName);
      }

      function renderHistory(history) {
        const historyList = document.getElementById('historyList');

        if (!history || history.length === 0) {
          historyList.innerHTML = '<p class="muted">Henüz hareket kaydı yok.</p>';
          return;
        }

        historyList.innerHTML = '<table class="history-table">' +
          '<thead>' +
          '<tr><th>Tarih</th><th>Kullanıcı</th><th>Hareket</th><th>Eski</th><th>Yeni</th><th>Açıklama</th></tr>' +
          '</thead>' +
          '<tbody>' +
          history.map(function (row) {
            return '<tr>' +
              '<td>' + (row.Tarih || '-') + '</td>' +
              '<td>' + (row.Kullanici || '-') + '</td>' +
              '<td>' + (row.HareketTuru || '-') + '</td>' +
              '<td>' + (row.EskiKonum || '-') + '</td>' +
              '<td>' + (row.YeniKonum || '-') + '</td>' +
              '<td>' + (row.Aciklama || '-') + '</td>' +
              '</tr>';
          }).join('') +
          '</tbody>' +
          '</table>';
      }

      function showStatus(message, type) {
        const messageBox = document.getElementById('statusMessage');
        messageBox.textContent = message;
        messageBox.className = 'message ' + type;
      }
    </script>
  </body>
</html>
