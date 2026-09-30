(function () {
  'use strict';

  var SUPABASE_URL = 'https://bettcoexauuhqlngmggp.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldHRjb2V4YXV1aHFsbmdtZ2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyODcwNzIsImV4cCI6MjEwNTg2MzA3Mn0.gshK5D8qn498gUz23pQZEg2pWRwek8T1sdwg1lTSYn4';

  var BASE_CATS = ['实木床','软体床','餐桌','实木沙发','软体沙发','子母床','儿童床','茶台','茶几和电视柜','梳妆台','衣柜','鞋柜','床头柜','书桌','床垫'];

  var $ = function (s) { return document.querySelector(s); };
  var PASS_KEY = 'ky_admin_pass';
  var products = [];
  var editingId = null;
  var sortable = null;
  var filterCat = '';
  var imgList = [];
  var itemList = [];
  var posts = [];
  var editingPostId = null;
  var postImgList = [];

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
    var headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'Accept': 'application/json' };
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
        price: p.price || '', image: p.image || '', featured: !!p.featured, onSale: p.on_sale !== false,
        sort_order: p.sort_order || 0, views: p.views || 0, images: (p.images && p.images.length) ? p.images : [], items: (p.items && p.items.length) ? p.items : [], content: p.content || '', priceSum: p.price_sum !== false, remark: p.remark || ''
      }; });
      renderRows(); renderCatList(); renderFilter();
    }).catch(function (e) { if (e.status === 401 || e.status === 403) { clearPass(); showLogin(); } else toast(e.message); });
  }

  function renderRows() {
    var tbody = $('#prodRows');
    var list = products;
    if (filterCat) { list = products.filter(function (p) { return p.category === filterCat; }); }
    $('#countHint').textContent = '共 ' + list.length + ' 款产品（长按拖动左侧 ⋮⋮ 可排序）';
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" class="muted">该分类下暂无产品。</td></tr>'; return; }
    tbody.innerHTML = list.map(function (p) {
      return '<tr data-id="' + esc(p.id) + '">' +
        '<td class="drag-cell"><span class="drag-handle">⋮⋮</span></td>' +
        '<td><img src="' + esc(p.image || '/img/logo.png') + '" alt="" onerror="this.src=\'/img/logo.png\'"></td>' +
        '<td><b>' + esc(p.name) + '</b><br><span class="muted">' + esc(p.model || '') + '</span>' + (p.remark ? '<br><span class="muted">注：' + esc(p.remark) + '</span>' : '') + '</td>' +
        '<td>' + esc(p.category || '-') + '</td>' +
        '<td class="muted">' + esc(p.spec || '-') + '</td>' +
        '<td class="price">¥' + esc(p.price || '0') + '</td>' +
        '<td class="ops"><button class="btn small" data-copy="' + esc(p.id) + '">复制</button> ' +
        '<button class="btn small" data-edit="' + esc(p.id) + '">编辑</button>' +
        '<button class="btn small" data-del="' + esc(p.id) + '">删除</button></td>' +
      '</tr>';
    }).join('');
    tbody.querySelectorAll('[data-copy]').forEach(function (b) { b.onclick = function () { copyProduct(b.getAttribute('data-copy')); }; });
    tbody.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { openModal(b.getAttribute('data-edit')); }; });
    tbody.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { delProduct(b.getAttribute('data-del')); }; });
  }

  function persistOrder() {
    var items = [];
    document.querySelectorAll('#prodRows tr[data-id]').forEach(function (tr) {
      var id = tr.getAttribute('data-id');
      var p = null;
      for (var i = 0; i < products.length; i++) { if (products[i].id === id) { p = products[i]; break; } }
      items.push({ id: id, so: p ? (p.sort_order || 0) : 0 });
    });
    if (!items.length) return;
    var sos = items.map(function (x) { return x.so; }).sort(function (a, b) { return a - b; });
    var tasks = items.map(function (item, i) {
      return sb('/rest/v1/products?id=eq.' + encodeURIComponent(item.id), { method: 'PATCH', body: JSON.stringify({ sort_order: sos[i] }), prefer: 'return=representation' });
    });
    Promise.all(tasks).then(function () { toast('排序已保存'); loadProducts(); }).catch(function (e) { toast(e.message); });
  }

  function renderFilter() {
    var sel = $('#filterCat');
    var cats = BASE_CATS.slice();
    products.forEach(function (p) { if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category); });
    var cur = sel.value;
    sel.innerHTML = '<option value="">全部分类</option>' + cats.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === cur ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
  }

  function renderCatList() {
    var cats = BASE_CATS.slice();
    products.forEach(function (p) { if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category); });
    $('#catList').innerHTML = cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
  }

  // ===== 多图管理 =====
  function renderImgs() {
    var box = $('#pm_imgs');
    if (!imgList.length) { box.innerHTML = '<div class="muted">还没有图片，可上传或粘贴链接。</div>'; return; }
    box.innerHTML = imgList.map(function (url, i) {
      return '<div class="img-item">' +
        '<img src="' + esc(url) + '" class="img-view" alt="" onerror="this.style.opacity=.3">' +
        (i === 0 ? '<div class="img-cover">封面</div>' : '') +
        '<button type="button" class="img-del" data-idx="' + i + '" title="删除">×</button>' +
        (i > 0 ? '<button type="button" class="img-up" data-idx="' + i + '" title="设为封面">↑</button>' : '') +
      '</div>';
    }).join('');
    box.querySelectorAll('.img-del').forEach(function (b) {
      b.onclick = function () { imgList.splice(parseInt(b.getAttribute('data-idx'), 10), 1); renderImgs(); };
    });
    box.querySelectorAll('.img-up').forEach(function (b) {
      b.onclick = function () { var idx = parseInt(b.getAttribute('data-idx'), 10); var u = imgList.splice(idx, 1)[0]; imgList.unshift(u); renderImgs(); };
    });
    box.querySelectorAll('.img-view').forEach(function (img) {
      img.onclick = function () { openLightbox(img.getAttribute('src')); };
    });
  }
  function addImg(url) {
    url = (url || '').trim();
    if (!url) return;
    if (imgList.indexOf(url) === -1) { imgList.push(url); renderImgs(); }
  }

  var lbZoom = 1;
  var currentLbUrl = '';
  function openLightbox(url) {
    currentLbUrl = url;
    lbZoom = 1;
    var img = $('#lbImg');
    img.src = url;
    img.style.maxWidth = '92vw';
    img.style.maxHeight = '92vh';
    $('#lightbox').classList.add('open');
    $('#lbWrap').scrollTop = 0; $('#lbWrap').scrollLeft = 0;
  }
  function closeLightbox() { $('#lightbox').classList.remove('open'); }
  function lbZoomIn() { if (lbZoom < 5) { lbZoom += 0.5; applyLbZoom(); } }
  function lbZoomOut() { if (lbZoom > 1) { lbZoom -= 0.5; applyLbZoom(); } }
  function lbReset() { lbZoom = 1; applyLbZoom(); }
  function applyLbZoom() { var img = $('#lbImg'); img.style.maxWidth = (92 * lbZoom) + 'vw'; img.style.maxHeight = (92 * lbZoom) + 'vh'; }

  var cropState = { img: null, dragging: false, startX: 0, startY: 0 };
  function openCrop(url) {
    closeLightbox();
    var img = $('#cropImg');
    img.crossOrigin = 'anonymous';
    img.onload = function () { cropState.img = img; resetCropSel(); };
    img.src = url;
    $('#cropbox').classList.add('open');
  }
  function closeCrop() { $('#cropbox').classList.remove('open'); }
  function saveImage(url) {
    if (!url) return;
    fetch(url).then(function (r) { return r.blob(); }).then(function (blob) {
      var objUrl = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = objUrl;
      a.download = (url.split('/').pop() || 'image.jpg');
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(objUrl); document.body.removeChild(a); }, 1000);
    }).catch(function () { window.open(url, '_blank'); });
  }
  function resetCropSel() { var sel = $('#cropSel'); sel.style.display = 'none'; sel.style.left = '0px'; sel.style.top = '0px'; sel.style.width = '0px'; sel.style.height = '0px'; }
  function setCropSel(x1, y1, x2, y2) { var holder = $('#cropHolder').getBoundingClientRect(); var l = Math.min(x1, x2), t = Math.min(y1, y2); var w = Math.abs(x2 - x1), h = Math.abs(y2 - y1); var W = Math.max(w, h * 4 / 3); var H = W * 3 / 4; if (W > holder.width) { W = holder.width; H = W * 3 / 4; } if (H > holder.height) { H = holder.height; W = H * 4 / 3; } l = Math.max(0, Math.min(holder.width - W, l)); t = Math.max(0, Math.min(holder.height - H, t)); var sel = $('#cropSel'); sel.style.left = l + 'px'; sel.style.top = t + 'px'; sel.style.width = W + 'px'; sel.style.height = H + 'px'; sel.style.display = 'block'; }
  function autoCrop() {
    var img = $('#cropImg');
    if (!img || !img.naturalWidth) { toast('图片未加载'); return; }
    var maxSide = 600;
    var sc = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    var cw = Math.max(1, Math.round(img.naturalWidth * sc));
    var ch = Math.max(1, Math.round(img.naturalHeight * sc));
    var canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext('2d');
    try { ctx.drawImage(img, 0, 0, cw, ch); } catch (e) { toast('无法分析该图片'); return; }
    var data = ctx.getImageData(0, 0, cw, ch).data;
    var tol = 36, tol2 = tol * tol;
    // average border color
    var sr = 0, sg = 0, sb = 0, bn = 0;
    for (var x = 0; x < cw; x++) { for (var k = 0; k < 2; k++) { var y = k ? ch - 1 : 0; var i = (y * cw + x) * 4; sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; bn++; } }
    for (var y = 0; y < ch; y++) { for (var k = 0; k < 2; k++) { var x = k ? cw - 1 : 0; var i = (y * cw + x) * 4; sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; bn++; } }
    var br = sr / bn, bg = sg / bn, bb = sb / bn;
    var visited = new Uint8Array(cw * ch);
    var q = [];
    function seed(x, y) { var idx = y * cw + x; if (visited[idx]) return; var i = idx * 4; var dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb; if (dr * dr + dg * dg + db * db <= tol2) { visited[idx] = 1; q.push(x, y); } }
    for (var x = 0; x < cw; x++) { seed(x, 0); seed(x, ch - 1); }
    for (var y = 0; y < ch; y++) { seed(0, y); seed(cw - 1, y); }
    var head = 0;
    while (head < q.length) {
      var x = q[head++], y = q[head++];
      var i = (y * cw + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      var nx, ny, ni;
      if (x > 0) { nx = x - 1; ny = y; ni = ny * cw + nx; if (!visited[ni]) { var dr = data[ni * 4] - r, dg = data[ni * 4 + 1] - g, db = data[ni * 4 + 2] - b; if (dr * dr + dg * dg + db * db <= tol2) { visited[ni] = 1; q.push(nx, ny); } } }
      if (x < cw - 1) { nx = x + 1; ny = y; ni = ny * cw + nx; if (!visited[ni]) { var dr = data[ni * 4] - r, dg = data[ni * 4 + 1] - g, db = data[ni * 4 + 2] - b; if (dr * dr + dg * dg + db * db <= tol2) { visited[ni] = 1; q.push(nx, ny); } } }
      if (y > 0) { nx = x; ny = y - 1; ni = ny * cw + nx; if (!visited[ni]) { var dr = data[ni * 4] - r, dg = data[ni * 4 + 1] - g, db = data[ni * 4 + 2] - b; if (dr * dr + dg * dg + db * db <= tol2) { visited[ni] = 1; q.push(nx, ny); } } }
      if (y < ch - 1) { nx = x; ny = y + 1; ni = ny * cw + nx; if (!visited[ni]) { var dr = data[ni * 4] - r, dg = data[ni * 4 + 1] - g, db = data[ni * 4 + 2] - b; if (dr * dr + dg * dg + db * db <= tol2) { visited[ni] = 1; q.push(nx, ny); } } }
    }
    var minX = cw, minY = ch, maxX = 0, maxY = 0, fg = 0;
    for (var y = 0; y < ch; y++) for (var x = 0; x < cw; x++) { var idx = y * cw + x; if (!visited[idx]) { fg++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } }
    if (fg === 0 || maxX <= minX || maxY <= minY) { toast('未检测到产品区域，请手动框选'); return; }
    var fx = img.naturalWidth / cw, fy = img.naturalHeight / ch;
    var holder = $('#cropHolder').getBoundingClientRect();
    var sx = holder.width / img.naturalWidth, sy = holder.height / img.naturalHeight;
    setCropSel(minX * fx * sx, minY * fy * sy, maxX * fx * sx, maxY * fy * sy);
    toast('已自动框选，可拖动调整后再保存');
  }

  function cropSave() {
    var img = $('#cropImg');
    var sel = $('#cropSel');
    if (!img || !img.naturalWidth || sel.style.display === 'none') { toast('请先拖动框选要裁剪的区域'); return; }
    var r = $('#cropHolder').getBoundingClientRect();
    var l = parseFloat(sel.style.left), t = parseFloat(sel.style.top), w = parseFloat(sel.style.width), h = parseFloat(sel.style.height);
    if (w < 10 || h < 10) { toast('选区太小'); return; }
    var sx = img.naturalWidth / r.width, sy = img.naturalHeight / r.height;
    var cx = Math.round(l * sx), cy = Math.round(t * sy), cw = Math.round(w * sx), ch = Math.round(h * sy);
    try {
      var canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
      canvas.toBlob(function (blob) {
        if (!blob) { toast('裁剪失败（图片可能受跨域保护）'); return; }
        uploadBlob(blob, 'crop_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.jpg');
      }, 'image/jpeg', 0.92);
    } catch (err) { toast('裁剪失败：' + err.message); }
  }
  function uploadBlob(blob, fname) {
    fetch(SUPABASE_URL + '/storage/v1/object/product-images/' + fname, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'x-admin-password': pass(), 'Content-Type': 'image/jpeg' },
      body: blob
    }).then(function (r) {
      if (!r.ok) throw new Error('上传失败 ' + r.status);
      var url = SUPABASE_URL + '/storage/v1/object/public/product-images/' + fname;
      addImg(url);
      closeCrop();
      toast('已裁剪并添加到图片列表');
    }).catch(function (e) { toast(e.message); });
  }

  function openModal(id) {
    editingId = id || null;
    var p = id ? products.filter(function (x) { return x.id === id; })[0] : null;
    imgList = p ? ((p.images && p.images.length) ? p.images.slice() : (p.image ? [p.image] : [])) : [];
    $('#pmTitle').textContent = p ? '编辑产品' : '新增产品';
    $('#pm_name').value = p ? p.name : '';
    $('#pm_category').value = p ? p.category : '';
    $('#pm_model').value = p ? p.model : '';
    $('#pm_price').value = p ? p.price : '';
    $('#pm_spec').value = p ? p.spec : '';
    $('#pm_dimensions').value = p ? p.dimensions : '';
    $('#pm_material').value = p ? p.material : '';
    $('#pm_imgurl').value = '';
    $('#pm_featured').checked = p ? !!p.featured : false;
    $('#pm_onSale').checked = p ? p.onSale !== false : true;
    $('#pm_content').value = p ? (p.content || '') : '';
    $('#pm_remark').value = p ? (p.remark || '') : '';
    $('#pm_priceSum').checked = p ? p.priceSum !== false : true;
    itemList = p ? ((p.items && p.items.length) ? p.items.slice() : []) : [];
    renderItems();
    renderImgs();
    $('#prodModal').classList.add('open');
  }
  function closeModal() { $('#prodModal').classList.remove('open'); }

  function syncItems() {
    document.querySelectorAll('#pm_items .item-card').forEach(function (card) {
      var i = parseInt(card.getAttribute('data-i'), 10);
      if (!itemList[i]) itemList[i] = {};
      itemList[i].name = card.querySelector('.it-name').value.trim();
      itemList[i].model = card.querySelector('.it-model').value.trim();
      itemList[i].dimensions = card.querySelector('.it-dim').value.trim();
      itemList[i].material = card.querySelector('.it-mat').value.trim();
      itemList[i].price = card.querySelector('.it-price').value.trim();
    });
  }

  function renderItems() {
    var box = $('#pm_items');
    if (!itemList.length) { box.innerHTML = '<div class="muted">暂无组合，普通产品可跳过此项。</div>'; return; }
    box.innerHTML = itemList.map(function (it, i) {
      it = it || {};
      return '<div class="item-card" data-i="' + i + '">' +
        '<div class="row2"><input class="it-name" placeholder="名称（如 茶几）" value="' + esc(it.name || '') + '"><input class="it-model" placeholder="型号" value="' + esc(it.model || '') + '"></div>' +
        '<div class="row2"><input class="it-dim" placeholder="尺寸" value="' + esc(it.dimensions || '') + '"><input class="it-price" placeholder="价格" value="' + esc(it.price || '') + '"></div>' +
        '<input class="it-mat" placeholder="材质" value="' + esc(it.material || '') + '">' +
        '<button type="button" class="item-del" data-i="' + i + '">×</button>' +
      '</div>';
    }).join('');
    box.querySelectorAll('.item-del').forEach(function (b) {
      b.onclick = function () { syncItems(); itemList.splice(parseInt(b.getAttribute('data-i'), 10), 1); renderItems(); };
    });
  }
  function collectItems() {
    var items = [];
    document.querySelectorAll('#pm_items .item-card').forEach(function (card) {
      var it = {
        name: card.querySelector('.it-name').value.trim(),
        model: card.querySelector('.it-model').value.trim(),
        dimensions: card.querySelector('.it-dim').value.trim(),
        material: card.querySelector('.it-mat').value.trim(),
        price: card.querySelector('.it-price').value.trim()
      };
      if (it.name || it.model || it.price) items.push(it);
    });
    return items;
  }

  function saveProduct() {
    var name = $('#pm_name').value.trim();
    var price = $('#pm_price').value.trim();
    var items = collectItems();
    if (!name) { toast('请填写产品名称'); return; }
    if (!price && !items.length) { toast('请填写一口价'); return; }
    var d = {
      name: name,
      category: $('#pm_category').value.trim(),
      model: $('#pm_model').value.trim(),
      price: price,
      spec: $('#pm_spec').value.trim(),
      dimensions: $('#pm_dimensions').value.trim(),
      material: $('#pm_material').value.trim(),
      content: $('#pm_content').value.trim(),
      remark: $('#pm_remark').value.trim(),
      price_sum: $('#pm_priceSum').checked,
      image: imgList[0] || '',
      images: imgList,
      items: items,
      featured: $('#pm_featured').checked,
      on_sale: $('#pm_onSale').checked
    };
    if (items.length && $('#pm_priceSum').checked) {
      var total = 0;
      items.forEach(function (it) { total += parseFloat(it.price) || 0; });
      d.price = String(total);
    }
    var p;
    if (editingId) {
      p = sb('/rest/v1/products?id=eq.' + encodeURIComponent(editingId), { method: 'PATCH', body: JSON.stringify(d), prefer: 'return=representation' });
    } else {
      d.id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      var maxSo = 0;
      products.forEach(function (x) { if ((x.sort_order || 0) > maxSo) maxSo = x.sort_order || 0; });
      d.sort_order = maxSo + 1;
      p = sb('/rest/v1/products', { method: 'POST', body: JSON.stringify(d), prefer: 'return=representation' });
    }
    p.then(function () { toast('已保存'); closeModal(); loadProducts(); })
      .catch(function (e) { if (e.status === 401 || e.status === 403) { toast('密码错误或无权限'); } else toast(e.message); });
  }

  function copyProduct(id) {
    var src = null;
    for (var i = 0; i < products.length; i++) { if (products[i].id === id) { src = products[i]; break; } }
    if (!src) return;
    var maxSo = 0;
    products.forEach(function (x) { if ((x.sort_order || 0) > maxSo) maxSo = x.sort_order || 0; });
    var d = {
      id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      category: src.category,
      name: src.name,
      model: src.model,
      spec: src.spec,
      dimensions: src.dimensions,
      material: src.material,
      price: src.price,
      image: src.image,
      images: (src.images && src.images.length) ? src.images : [],
      featured: !!src.featured,
      on_sale: src.onSale !== false,
      sort_order: maxSo + 1
    };
    sb('/rest/v1/products', { method: 'POST', body: JSON.stringify(d), prefer: 'return=representation' })
      .then(function () { toast('已复制，可在列表中编辑'); loadProducts(); })
      .catch(function (e) { toast(e.status === 401 || e.status === 403 ? '密码错误或无权限' : e.message); });
  }

  function openBatch() { $('#batchModal').classList.add('open'); $('#batchText').value = ''; }
  function closeBatch() { $('#batchModal').classList.remove('open'); }
  function submitBatch() {
    var text = $('#batchText').value;
    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) { toast('请先粘贴产品数据'); return; }
    var maxSo = 0;
    products.forEach(function (x) { if ((x.sort_order || 0) > maxSo) maxSo = x.sort_order || 0; });
    var items = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var cols = line.indexOf('\t') !== -1 ? line.split('\t') : line.split('|');
      cols = cols.map(function (c) { return c.trim(); });
      var name = cols[0] || '';
      var price = cols[6] || '';
      if (!name || !price) { toast('第 ' + (i + 1) + ' 行缺少名称或价格，已跳过'); continue; }
      var img = cols[7] || '';
      items.push({
        id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + i,
        name: name, category: cols[1] || '', model: cols[2] || '', spec: cols[3] || '',
        dimensions: cols[4] || '', material: cols[5] || '', price: price,
        image: img, images: img ? [img] : [], featured: false, on_sale: true, sort_order: maxSo + i + 1
      });
    }
    if (!items.length) { toast('没有可添加的产品'); return; }
    var tasks = items.map(function (d) { return sb('/rest/v1/products', { method: 'POST', body: JSON.stringify(d), prefer: 'return=representation' }); });
    Promise.all(tasks).then(function () { toast('已添加 ' + items.length + ' 款产品'); closeBatch(); loadProducts(); }).catch(function (e) { toast(e.message); });
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
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'x-admin-password': pass(), 'Content-Type': file.type || 'application/octet-stream' },
        body: reader.result
      }).then(function (r) {
        if (!r.ok) throw new Error('上传失败 ' + r.status);
        var url = SUPABASE_URL + '/storage/v1/object/public/product-images/' + fname;
        addImg(url); toast('图片已上传');
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
      $('#s_catorder').value = (s.category_order || []).join('\n');
      $('#s_coupons').value = (s.coupons || []).map(function (c) { return (c.title || '') + ' | ' + (c.amount || '') + ' | ' + (c.condition || ''); }).join('\n');
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
      core_values: $('#s_values').value.split('\n').map(function (v) { return v.trim(); }).filter(Boolean),
      category_order: $('#s_catorder').value.split('\n').map(function (v) { return v.trim(); }).filter(Boolean),
      coupons: $('#s_coupons').value.split('\n').map(function (l) { var p = l.split('|'); return { title: (p[0] || '').trim(), amount: (p[1] || '').trim(), condition: (p[2] || '').trim() }; }).filter(function (c) { return c.title || c.amount || c.condition; })
    };
    sb('/rest/v1/settings', { method: 'POST', body: JSON.stringify(d), prefer: 'resolution=merge-duplicates,return=representation' })
      .then(function () { toast('门店设置已保存'); })
      .catch(function (e) { toast(e.status === 401 || e.status === 403 ? '密码错误或无权限' : e.message); });
  }

  function initSortable() {
    var tbody = $('#prodRows');
    if (!window.Sortable || !tbody || sortable) return;
    sortable = window.Sortable.create(tbody, {
      handle: '.drag-handle', animation: 150, delay: 350, delayOnTouchOnly: true,
      ghostClass: 'sort-ghost', onEnd: function () { persistOrder(); }
    });
  }

  function loadPosts() {
    return sb('/rest/v1/posts?select=*&order=sort_order.asc,created_at.asc').then(function (rows) {
      posts = (rows || []).map(function (p) { return { id: p.id, title: p.title || '', content: p.content || '', cover: p.cover || '', images: (p.images && p.images.length) ? p.images : [], sort_order: p.sort_order || 0, published: p.published !== false }; });
      renderPosts();
    }).catch(function (e) { toast(e.message); });
  }
  function renderPosts() {
    $('#postCountHint').textContent = '共 ' + posts.length + ' 篇图文';
    if (!posts.length) { $('#postList').innerHTML = '<div class="muted">暂无图文，点击“新增图文”。</div>'; return; }
    $('#postList').innerHTML = posts.map(function (p) {
      return '<div class="post-item">' +
        (p.cover ? '<img src="' + esc(p.cover) + '" alt="" onerror="this.style.display=\'none\'">' : '<div class="post-noimg">图</div>') +
        '<div class="post-info"><b>' + esc(p.title) + '</b><span class="muted">' + (p.published ? '已发布' : '未发布') + '</span></div>' +
        '<button class="btn small" data-pedit="' + esc(p.id) + '">编辑</button>' +
        '<button class="btn small" data-pdel="' + esc(p.id) + '">删除</button>' +
      '</div>';
    }).join('');
    $('#postList').querySelectorAll('[data-pedit]').forEach(function (b) { b.onclick = function () { openPostModal(b.getAttribute('data-pedit')); }; });
    $('#postList').querySelectorAll('[data-pdel]').forEach(function (b) { b.onclick = function () { delPost(b.getAttribute('data-pdel')); }; });
  }
  function renderPostImgs() {
    var box = $('#pt_imgs');
    if (!postImgList.length) { box.innerHTML = '<div class="muted">暂无图片</div>'; return; }
    box.innerHTML = postImgList.map(function (url, i) {
      return '<div class="img-item"><img src="' + esc(url) + '" alt="" onerror="this.style.opacity=.3"><button type="button" class="img-del" data-i="' + i + '">×</button></div>';
    }).join('');
    box.querySelectorAll('.img-del').forEach(function (b) { b.onclick = function () { postImgList.splice(parseInt(b.getAttribute('data-i'), 10), 1); renderPostImgs(); }; });
  }
  function updatePostCover(url) { var img = $('#pt_cover_preview'); if (url) { img.src = url; img.style.display = 'block'; } else { img.style.display = 'none'; } }
  function openPostModal(id) {
    editingPostId = id || null;
    var p = id ? posts.filter(function (x) { return x.id === id; })[0] : null;
    postImgList = p ? ((p.images && p.images.length) ? p.images.slice() : []) : [];
    $('#ptTitle').textContent = p ? '编辑图文' : '新增图文';
    $('#pt_title').value = p ? p.title : '';
    $('#pt_content').value = p ? p.content : '';
    $('#pt_cover').value = p ? p.cover : '';
    $('#pt_imgurl').value = '';
    $('#pt_published').checked = p ? p.published !== false : true;
    updatePostCover(p ? p.cover : '');
    renderPostImgs();
    $('#postModal').classList.add('open');
  }
  function closePostModal() { $('#postModal').classList.remove('open'); }
  function savePost() {
    var title = $('#pt_title').value.trim();
    if (!title) { toast('请填写标题'); return; }
    var d = { title: title, content: $('#pt_content').value.trim(), cover: $('#pt_cover').value.trim(), images: postImgList, published: $('#pt_published').checked };
    var p;
    if (editingPostId) { p = sb('/rest/v1/posts?id=eq.' + encodeURIComponent(editingPostId), { method: 'PATCH', body: JSON.stringify(d), prefer: 'return=representation' }); }
    else {
      d.id = 'po' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      var maxSo = 0; posts.forEach(function (x) { if ((x.sort_order || 0) > maxSo) maxSo = x.sort_order || 0; });
      d.sort_order = maxSo + 1;
      p = sb('/rest/v1/posts', { method: 'POST', body: JSON.stringify(d), prefer: 'return=representation' });
    }
    p.then(function () { toast('已保存'); closePostModal(); loadPosts(); }).catch(function (e) { toast(e.status === 401 || e.status === 403 ? '密码错误或无权限' : e.message); });
  }
  function delPost(id) {
    if (!confirm('确定删除该图文？')) return;
    sb('/rest/v1/posts?id=eq.' + encodeURIComponent(id), { method: 'DELETE' }).then(function () { toast('已删除'); loadPosts(); }).catch(function (e) { toast(e.message); });
  }
  function uploadPostFile(file, cb) {
    var ext = (file.name.match(/.w+$/) || ['.jpg'])[0].toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].indexOf(ext) === -1) { toast('仅支持图片格式'); return; }
    var fname = 'img_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + ext;
    var reader = new FileReader();
    reader.onload = function () {
      fetch(SUPABASE_URL + '/storage/v1/object/product-images/' + fname, { method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY, 'x-admin-password': pass(), 'Content-Type': file.type || 'application/octet-stream' }, body: reader.result })
        .then(function (r) { if (!r.ok) throw new Error('上传失败 ' + r.status); cb(SUPABASE_URL + '/storage/v1/object/public/product-images/' + fname); })
        .catch(function (e) { toast(e.message); });
    };
    reader.readAsArrayBuffer(file);
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

    $('#filterCat').addEventListener('change', function () { filterCat = this.value; renderRows(); });

    $('#btnAdd').onclick = function () { openModal(null); };
    $('#lbClose').onclick = closeLightbox;
    $('#lbCrop').onclick = function () { if (currentLbUrl) openCrop(currentLbUrl); };
    $('#lbSave').onclick = function () { if (currentLbUrl) saveImage(currentLbUrl); };
    $('#cropCancel').onclick = closeCrop;
    $('#cropSave').onclick = cropSave;
    $('#cropAuto').onclick = autoCrop;
    (function () {
      var holder = $('#cropHolder');
      holder.addEventListener('pointerdown', function (e) { e.preventDefault(); var r = holder.getBoundingClientRect(); cropState.dragging = true; cropState.startX = e.clientX - r.left; cropState.startY = e.clientY - r.top; setCropSel(cropState.startX, cropState.startY, cropState.startX, cropState.startY); try { holder.setPointerCapture(e.pointerId); } catch (err) {} });
      holder.addEventListener('pointermove', function (e) { if (!cropState.dragging) return; var r = holder.getBoundingClientRect(); var x = Math.max(0, Math.min(r.width, e.clientX - r.left)); var y = Math.max(0, Math.min(r.height, e.clientY - r.top)); setCropSel(cropState.startX, cropState.startY, x, y); });
      holder.addEventListener('pointerup', function () { cropState.dragging = false; });
    })();
    $('#lbClose').onclick = closeLightbox;
    $('#lbZoomIn').onclick = lbZoomIn;
    $('#lbZoomOut').onclick = lbZoomOut;
    $('#lbReset').onclick = lbReset;
    $('#lightbox').addEventListener('click', function (e) { if (e.target === this) closeLightbox(); });
    $('#btnBatch').onclick = openBatch;
    $('#batchClose').onclick = closeBatch;
    $('#batchSubmit').onclick = submitBatch;
    $('#batchModal').addEventListener('click', function (e) { if (e.target === this) closeBatch(); });
    $('#pmClose').onclick = closeModal;
    $('#pmSave').onclick = saveProduct;
    $('#btnUpload').onclick = function () { $('#fileInput').click(); };
    $('#fileInput').onchange = function () { if (this.files && this.files[0]) uploadImage(this.files[0]); };
    $('#btnAddUrl').onclick = function () { addImg($('#pm_imgurl').value); $('#pm_imgurl').value = ''; };
    $('#btnAddItem').onclick = function () { syncItems(); itemList.push({ name: '', model: '', dimensions: '', material: '', price: '' }); renderItems(); };
    $('#btnSaveSettings').onclick = saveSettings;
    $('#prodModal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    $('#postListClose').onclick = function () { $('#postListModal').classList.remove('open'); };
    $('#postListModal').addEventListener('click', function (e) { if (e.target === this) $('#postListModal').classList.remove('open'); });
    $('#btnAddPost').onclick = function () { openPostModal(null); };
    $('#ptClose').onclick = closePostModal;
    $('#ptSave').onclick = savePost;
    $('#btnUploadCover').onclick = function () { $('#fileCover').click(); };
    $('#fileCover').onchange = function () { if (this.files && this.files[0]) uploadPostFile(this.files[0], function (url) { $('#pt_cover').value = url; updatePostCover(url); toast('封面已上传'); }); };
    $('#btnAddPostImg').onclick = function () { $('#filePostImg').click(); };
    $('#filePostImg').onchange = function () { if (this.files && this.files[0]) uploadPostFile(this.files[0], function (url) { postImgList.push(url); renderPostImgs(); toast('图片已上传'); }); };
    $('#btnAddPostUrl').onclick = function () { var u = $('#pt_imgurl').value.trim(); if (u) { postImgList.push(u); renderPostImgs(); $('#pt_imgurl').value = ''; } };
    $('#pt_cover').addEventListener('input', function () { updatePostCover(this.value.trim()); });
    $('#postModal').addEventListener('click', function (e) { if (e.target === this) closePostModal(); });
    $('#prodModal').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && $('#prodModal').classList.contains('open')) {
        var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
        if (tag === 'TEXTAREA') return;
        e.preventDefault();
        saveProduct();
      }
    });

    initSortable();
  }

  bind();
  tryAutoLogin();
})();