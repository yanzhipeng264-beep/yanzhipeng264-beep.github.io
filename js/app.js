(function () {
  'use strict';

  var SUPABASE_URL = 'https://bettcoexauuhqlngmggp.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldHRjb2V4YXV1aHFsbmdtZ2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyODcwNzIsImV4cCI6MjEwNTg2MzA3Mn0.gshK5D8qn498gUz23pQZEg2pWRwek8T1sdwg1lTSYn4';

  var state = { settings: null, products: [], activeCategory: '全部', query: '' };

  var $ = function (s) { return document.querySelector(s); };

  function sb(path, options) {
    options = options || {};
    var headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Accept': 'application/json'
    };
    if (options.headers) { for (var k in options.headers) headers[k] = options.headers[k]; }
    if (options.body && !options.raw) headers['Content-Type'] = 'application/json';
    return fetch(SUPABASE_URL + path, { method: options.method || 'GET', headers: headers, body: options.body })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) {
          if (!r.ok) throw new Error((j && j.message) || ('请求失败 ' + r.status));
          return j;
        });
      });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer); t._timer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }

  function navUrl() {
    var s = state.settings || {};
    var kw = (s.storeName || '康艺省钱家具超市') + ' ' + (s.address || '');
    return 'https://uri.amap.com/search?keyword=' + encodeURIComponent(kw) + '&city=' + encodeURIComponent('河源');
  }

  function applyContact() {
    var s = state.settings || {};
    var phone = digits(s.phone);
    var callEl = $('#btnCall');
    if (phone) { callEl.href = 'tel:' + phone; callEl.onclick = null; }
    else { callEl.href = '#'; callEl.onclick = function (e) { e.preventDefault(); toast('暂未填写联系电话'); }; }
    $('#btnNav').href = navUrl();
    $('#mNav').href = navUrl();
  }

  function renderSettings() {
    var s = state.settings || {};
    document.title = (s.storeName || '康艺省钱家具超市') + ' · 产品画册';
    $('#heroName').textContent = s.storeName || '康艺省钱家具超市（河源店）';
    $('#heroSlogan').textContent = s.slogan || '';
    $('#heroHours').textContent = s.hours || '09:00 - 21:00';
    $('#footName').textContent = s.storeName || '康艺省钱家具超市（河源店）';
    $('#year').textContent = new Date().getFullYear();

    var vals = (s.values && s.values.length) ? s.values : ['明码标价', '一口价', '包安装配送', '一站式配齐', '为河源人民省钱'];
    var icons = ['💰', '🧾', '🚚', '🛋️', '❤️', '⭐'];
    $('#values').innerHTML = vals.map(function (v, i) {
      return '<span class="value"><span class="v-ic">' + (icons[i] || '⭐') + '</span>' + esc(v) + '</span>';
    }).join('');

    $('#infoAddress').textContent = s.address || '';
    $('#infoHours').textContent = s.hours || '';
    $('#infoPhone').innerHTML = (s.phone ? '<a href="tel:' + digits(s.phone) + '">' + esc(s.phone) + '</a>' : '暂未填写');
    var notice = $('#infoNotice');
    if (s.notice) { notice.textContent = '温馨提示：' + s.notice; notice.style.display = 'block'; }
    else { notice.style.display = 'none'; }

    applyContact();
  }

  function renderCategories() {
    var cats = [];
    var seen = {};
    state.products.forEach(function (p) { if (p.onSale === false) return; if (p.category && !seen[p.category]) { seen[p.category] = true; cats.push(p.category); } });
    var order = (state.settings && state.settings.categoryOrder) || [];
    cats.sort(function (a, b) { var ia = order.indexOf(a), ib = order.indexOf(b); if (ia === -1) ia = 9999; if (ib === -1) ib = 9999; return ia - ib; });
    cats.unshift('全部');
    $('#cats').innerHTML = cats.map(function (c) {
      return '<button class="cat' + (c === state.activeCategory ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    $('#cats').querySelectorAll('.cat').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.activeCategory = btn.getAttribute('data-cat');
        renderCategories();
        renderProducts();
      });
    });
  }

  function cardHtml(p) {
    return '' +
      '<article class="card" data-id="' + esc(p.id) + '">' +
        '<div class="card-imgwrap">' +
          '<img class="card-img" loading="lazy" src="' + esc(p.image || '/img/logo.png') + '" alt="' + esc(p.name) + '" onerror="this.src=\'/img/logo.png\'">' +
          (p.category ? '<span class="card-tag">' + esc(p.category) + '</span>' : '') +
          '<span class="card-price-tag">一口价</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<h3 class="card-name">' + esc(p.name) + '</h3>' +
          (p.model ? '<div class="card-meta">型号 ' + esc(p.model) + '</div>' : '') +
          '<div class="card-spec">' +
            (p.dimensions ? '<span>外径 ' + esc(p.dimensions) + '</span>' : '') +
            (p.material ? '<span>材质 ' + esc(p.material) + '</span>' : '') +
          '</div>' +
          '<div class="card-foot">' +
            '<div class="card-price"><small>¥</small>' + esc(p.price || '0') + '<span class="card-price-label">一口价</span></div>' +
            '<span class="card-service">包安装配送</span>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderProducts() {
    var list = state.products.filter(function (p) {
      if (p.onSale === false) return false;
      var okCat = state.activeCategory === '全部' || p.category === state.activeCategory;
      var q = state.query.trim().toLowerCase();
      var okQ = !q || ((p.name + ' ' + p.model + ' ' + p.spec + ' ' + p.category + ' ' + p.dimensions).toLowerCase().indexOf(q) !== -1);
      return okCat && okQ;
    });
    $('#countbar').textContent = '共 ' + list.length + ' 款产品 · 全部一口价';
    $('#grid').innerHTML = list.map(cardHtml).join('');
    $('#empty').style.display = list.length ? 'none' : 'block';
    $('#grid').querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-id');
        var p = state.products.filter(function (x) { return x.id === id; })[0];
        if (p) openDetail(p);
      });
    });
  }

  function openDetail(p) {
    $('#mImg').src = p.image || '/img/logo.png';
    $('#mImg').onerror = function () { this.src = '/img/logo.png'; };
    $('#mCat').textContent = p.category || '家具';
    $('#mName').textContent = p.name || '';
    $('#mPrice').textContent = p.price || '0';
    $('#mModel').textContent = p.model || '—';
    $('#mSpec').textContent = p.spec || '—';
    $('#mDim').textContent = p.dimensions || '—';
    $('#mMat').textContent = p.material || '—';
    var phone = digits((state.settings || {}).phone);
    $('#mCall').href = phone ? 'tel:' + phone : '#';
    $('#mCall').onclick = phone ? null : function (e) { e.preventDefault(); toast('暂未填写联系电话'); };
    $('#mNav').href = navUrl();
    $('#detailModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    $('#detailModal').classList.remove('open');
    document.body.style.overflow = '';
  }

  function loadData() {
    return Promise.all([
      sb('/rest/v1/settings?id=eq.1&select=*').then(function (rows) {
        var r = (rows && rows[0]) || {};
        state.settings = {
          storeName: r.store_name || '',
          slogan: r.slogan || '',
          hours: r.hours || '',
          address: r.address || '',
          phone: r.phone || '',
          wechat: r.wechat || '',
          notice: r.notice || '',
          values: (r.core_values && r.core_values.length) ? r.core_values : [],
          categoryOrder: (r.category_order && r.category_order.length) ? r.category_order : []
        };
      }),
      sb('/rest/v1/products?select=*&order=sort_order.asc,created_at.asc').then(function (rows) {
        state.products = (rows || []).map(function (p) {
          return {
            id: p.id, category: p.category || '', name: p.name || '', model: p.model || '',
            spec: p.spec || '', dimensions: p.dimensions || '', material: p.material || '',
            price: p.price || '', image: p.image || '', featured: !!p.featured, onSale: p.on_sale !== false
          };
        });
      })
    ]);
  }

  function init() {
    $('#detailModal').querySelectorAll('[data-close]').forEach(function (el) { el.addEventListener('click', closeDetail); });
    $('#btnCopy').addEventListener('click', function () {
      var addr = (state.settings || {}).address || '';
      if (!addr) { toast('暂未填写地址'); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(function () { toast('地址已复制'); }, function () { fallbackCopy(addr); });
      } else { fallbackCopy(addr); }
    });
    var qEl = $('#q');
    var timer = null;
    qEl.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.query = qEl.value; renderProducts(); }, 250);
    });
    loadData().then(function () {
      renderSettings(); renderCategories(); renderProducts();
    }).catch(function (e) { toast('加载失败，请刷新重试'); });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('地址已复制'); } catch (e) { toast('请长按地址手动复制'); }
    document.body.removeChild(ta);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();