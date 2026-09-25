(function () {
  'use strict';

  var SUPABASE_URL = 'https://bettcoexauuhqlngmggp.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldHRjb2V4YXV1aHFsbmdtZ2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyODcwNzIsImV4cCI6MjEwNTg2MzA3Mn0.gshK5D8qn498gUz23pQZEg2pWRwek8T1sdwg1lTSYn4';

  var $ = function (s) { return document.querySelector(s); };
  var PASS_KEY = 'ky_admin_pass';
  var products = [];
  var editingId = null;

  function pass() { return localStorage.getItem(PASS_KEY) || ''; }
  function setPass(p) { localStorage.setItem(PASS_KEY, p); }
  function clearPass() { localStorage.removeItem(PASS_KEY); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, 2000);
  }

  function sb(path, opts) {
    opts = opts || {};
    var headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Accept': 'application/json'
    };
    if (pass()) headers['x-admin-password'] = pass();
    if (opts.prefer) headers['Prefer'] = opts.prefer;
    if (opts.body && !opts.raw) headers['Content-Type'] = 'application/json';
    return fetch(SUPABASE_URL + path, { method: opts.method || 'GET', headers: headers, body: opts.body })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) {
          if (!r.ok) { var e = new Error((j && j.message) || ('请求失败 ' + r.status)); e.status = r.status; throw e; }
          return j;
        });
      });
  }

  function showMain() {
    $('#loginBox').classList.add('hidden');
    $('#mainBox').classList.remove('hidden');
    $('#btnLogout').style.display = '';
    loadProducts(); loadSettings();
  }
  function showLogin() {
    $('#loginBox').classList.remove('hidden');
    $('#mainBox').classList.add('hidden');
    $('#btnLogout').style.display = 'none';
  }
  function tryAutoLogin() {
    if (pass()) { verify(pass()).then(function (ok) { ok ? showMain() : (clearPass(), showLogin()); }).catch(function () { showMain(); }); }
    else showLogin();
  }
  function verify(p) {
    return sb('/rest/v1/rpc/check_password', { method: 'POST', body: JSON.stringify({ pass: p }) })
      .then(function (r) { return r === true; }).catch(function () { return false; });
  }

  function loadProducts() {
    return sb('/rest/v1/products?select=*&order=sort_order.asc,created_at.asc').then(function (rows) {
      products = (rows || []).map(function (p) { return {
        id: p.id, category: p.category || '', name: p.name || '', model: p.model || '',
        spec: p.spec || '', dimensions: p.dimensions || '', material: p.material || '',
        price: p.price || '', image: p.image || '', featured: !!p.featured, onSale: p.on_sale !== false
      }; });
      renderRows(); renderCatList();
    }).catch(function (e) { if (e.status === 401 || e.status === 403) { clearPass(); showLogin(); } else toast(e.message); });
  }

  function renderRows() {
    var tbody = $('#prodRows');
    $('#countHint').textContent = '共 ' + products.length + ' 款产品';
    if (!products.length) { tbody.innerHTML = '<tr><td colspan="6" class="muted">暂无产品，点击“新增产品”添加。</td></tr>'; return; }
    tbody.innerHTML = products.map(function (p) {
      return '<tr>' +
        '<td><img src="' + esc(p.image || '/img/logo.png') + '" alt="" onerror="this.src=\'/img/logo.png\'"></td>' +
        '<td><b>' + esc(p.name) + '</b><br><span class="muted">' + esc(p.model || '') + '</span></td>' +
        '<td>' + esc(p.category || '-') + '</td>' +
        '<td class="muted">' + esc(p.spec || '-') + '</td>' +
        '<td class="price">¥' + esc(p.price || '0') + '</td>' +
        '<td class="ops"><button class="btn small" data-edit="' + esc(p.id) + '">编辑</button><button class="btn small" data-del="' + esc(p.id) + '">删除</button></td>' +
      '</tr>';
    }).join('');
    tbody.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { openModal(b.getAttribute('data-edit')); }; });
    tbody.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { delProduct(b.getAttribute('data-del')); }; });
  }

  function renderCatList() {
    var cats = []; products.forEach(function (p) { if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category); });
    $('#catList').innerHTML = cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
  }

  function openModal(id) {
    editingId = id || null;
    var p = id ? products.filter(function (x) { return x.id === id; })[0] : null;
    $('#pmTitle').textContent = p ? '编辑产品' : '新增产品';
    $('#pm_name').value = p ? p.name : '';
    $('#pm_category').value = p ? p.category : '';
    $('#pm_model').value = p ? p.model : '';
    $('#pm_price').value = p ? p.price : '';
    $('#pm_spec').value = p ? p.spec : '';
    $('#pm_dimensions').value = p ? p.dimensions : '';
    $('#pm_material').value = p ? p.material : '';
    $('#pm_image').value = p ? p.image : '';
    $('#pm_featured').checked = p ? !!p.featured : false;
    $('#pm_onSale').checked = p ? p.onSale !== false : true;
    updatePreview(p ? p.image : '');
    $('#prodModal').classList.add('open');
  }
  function closeModal() { $('#prodModal').classList.remove('open'); }
  function updatePreview(url) {
    var img = $('#pm_preview');
    if (url) { img.src = url; img.style.display = 'block'; } else { img.style.display = 'none'; }
  }
  function collectForm() {
    return {
      name: $('#pm_name').value.trim(),
      category: $('#pm_category').value.trim(),
      model: $('#pm_model').value.trim(),
      price: $('#pm_price').value.trim(),
      spec: $('#pm_spec').value.trim(),
      dimensions: $('#pm_dimensions').value.trim(),
      material: $('#pm_material').value.trim(),
      image: $('#pm_image').value.trim(),
      featured: $('#pm_featured').checked,
      on_sale: $('#pm_onSale').checked
    };
  }

  function saveProduct() {
    var d = collectForm();
    if (!d.name) { toast('请填写产品名称'); return; }
    if (!d.price) { toast('请填写一口价'); return; }
    var p;
    if (editingId) {
      p = sb('/rest/v1/products?id=eq.' + encodeURIComponent(editingId), { method: 'PATCH', body: JSON.stringify(d), prefer: 'return=representation' });
    } else {
      d.id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      p = sb('/rest/v1/products', { method: 'POST', body: JSON.stringify(d), prefer: 'return=representation' });
    }
    p.then(function () { toast('已保存'); closeModal(); loadProducts(); })
      .catch(function (e) { if (e.status === 401 || e.status === 403) { toast('密码错误或无权限'); } else toast(e.message); });
  }

  function delProduct(id) {
    if (!confirm('确定删除该产品？')) return;
    sb('/rest/v1/products?id=eq.' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function () { toast('已删除'); loadProducts(); })
      .catch(function (e) { toast(e.status === 401 || e.status === 403 ? '密码错误或无权限' : e.message); });
  }

  function uploadImage(file) {
    var ext = (file.name.match(/\.\w+$/) || ['.jpg'])[0].toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].indexOf(ext) === -1) { toast('仅支持图片格式'); return; }
    var fname = 'img_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + ext;
    var reader = new FileReader();
    reader.onload = function () {
      fetch(SUPABASE_URL + '/storage/v1/object/product-images/' + fname, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'x-admin-password': pass(),
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: reader.result
      }).then(function (r) {
        if (!r.ok) throw new Error('上传失败 ' + r.status);
        var url = SUPABASE_URL + '/storage/v1/object/public/product-images/' + fname;
        $('#pm_image').value = url; updatePreview(url); toast('图片已上传');
      }).catch(function (e) { toast(e.message); });
    };
    reader.readAsArrayBuffer(file);
  }

  function loadSettings() {
    return sb('/rest/v1/settings?id=eq.1&select=*').then(function (rows) {
      var s = (rows && rows[0]) || {};
      $('#s_storeName').value = s.store_name || '';
      $('#s_slogan').value = s.slogan || '';
      $('#s_hours').value = s.hours || '';
      $('#s_address').value = s.address || '';
      $('#s_phone').value = s.phone || '';
      $('#s_wechat').value = s.wechat || '';
      $('#s_notice').value = s.notice || '';
      $('#s_values').value = (s.core_values || []).join('\n');
    });
  }
  function saveSettings() {
    var d = {
      id: 1,
      store_name: $('#s_storeName').value.trim(),
      slogan: $('#s_slogan').value.trim(),
      hours: $('#s_hours').value.trim(),
      address: $('#s_address').value.trim(),
      phone: $('#s_phone').value.trim(),
      wechat: $('#s_wechat').value.trim(),
      notice: $('#s_notice').value.trim(),
      core_values: $('#s_values').value.split('\n').map(function (v) { return v.trim(); }).filter(Boolean)
    };
    sb('/rest/v1/settings', { method: 'POST', body: JSON.stringify(d), prefer: 'resolution=merge-duplicates,return=representation' })
      .then(function () { toast('门店设置已保存'); })
      .catch(function (e) { toast(e.status === 401 || e.status === 403 ? '密码错误或无权限' : e.message); });
  }

  function bind() {
    $('#btnLogin').onclick = function () {
      var pw = $('#loginPass').value;
      if (!pw) { toast('请输入密码'); return; }
      verify(pw).then(function (ok) {
        if (ok) { setPass(pw); toast('登录成功'); showMain(); } else { toast('密码错误'); }
      }).catch(function () { toast('网络错误，请重试'); });
    };
    $('#loginPass').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#btnLogin').click(); });
    $('#btnLogout').onclick = function () { clearPass(); showLogin(); };

    document.querySelectorAll('.tab').forEach(function (t) {
      t.onclick = function () {
        document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        var tab = t.getAttribute('data-tab');
        $('#tab-products').classList.toggle('hidden', tab !== 'products');
        $('#tab-settings').classList.toggle('hidden', tab !== 'settings');
      };
    });

    $('#btnAdd').onclick = function () { openModal(null); };
    $('#pmClose').onclick = closeModal;
    $('#pmSave').onclick = saveProduct;
    $('#pm_image').addEventListener('input', function () { updatePreview(this.value.trim()); });
    $('#btnUpload').onclick = function () { $('#fileInput').click(); };
    $('#fileInput').onchange = function () { if (this.files && this.files[0]) uploadImage(this.files[0]); };
    $('#btnSaveSettings').onclick = saveSettings;
    $('#prodModal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  }

  bind();
  tryAutoLogin();
})();