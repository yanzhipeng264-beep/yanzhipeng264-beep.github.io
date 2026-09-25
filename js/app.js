(function () {
  'use strict';

  var state = {
    settings: null,
    products: [],
    activeCategory: '全部',
    query: ''
  };

  var $ = function (s) { return document.querySelector(s); };

  function api(path) {
    return fetch(path, { headers: { 'Accept': 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('请求失败');
      return r.json();
    });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 1800);
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
    if (phone) {
      callEl.href = 'tel:' + phone;
      callEl.onclick = null;
    } else {
      callEl.href = '#';
      callEl.onclick = function (e) { e.preventDefault(); toast('暂未填写联系电话'); };
    }
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

    // values
    var vals = (s.values && s.values.length) ? s.values : ['明码标价', '一口价', '包安装配送', '一站式配齐', '为河源人民省钱'];
    var icons = ['💰', '🧾', '🚚', '🛋️', '❤️', '⭐'];
    var vHtml = vals.map(function (v, i) {
      return '<span class="value"><span class="v-ic">' + (icons[i] || '⭐') + '</span>' + esc(v) + '</span>';
    }).join('');
    $('#values').innerHTML = vHtml;

    // info
    $('#infoAddress').textContent = s.address || '';
    $('#infoHours').textContent = s.hours || '';
    $('#infoPhone').innerHTML = (s.phone ? '<a href="tel:' + digits(s.phone) + '">' + esc(s.phone) + '</a>' : '暂未填写');
    var notice = $('#infoNotice');
    if (s.notice) { notice.textContent = '温馨提示：' + s.notice; notice.style.display = 'block'; }
    else { notice.style.display = 'none'; }

    applyContact();
  }

  function renderCategories() {
    var cats = ['全部'];
    state.products.forEach(function (p) { if (cats.indexOf(p.category) === -1 && p.category) cats.push(p.category); });
    var html = cats.map(function (c) {
      return '<button class="cat' + (c === state.activeCategory ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    $('#cats').innerHTML = html;
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

  function init() {
    // close modal
    $('#detailModal').querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', closeDetail);
    });

    // copy address
    $('#btnCopy').addEventListener('click', function () {
      var addr = (state.settings || {}).address || '';
      if (!addr) { toast('暂未填写地址'); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(function () { toast('地址已复制'); }, function () { fallbackCopy(addr); });
      } else { fallbackCopy(addr); }
    });

    // search
    var qEl = $('#q');
    var timer = null;
    qEl.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.query = qEl.value; renderProducts(); }, 250);
    });

    // load
    Promise.all([fetch('data/settings.json').then(function(r){ return r.json(); }), fetch('data/products.json').then(function(r){ return r.json(); })]).then(function (res) {
      state.settings = res[0];
      state.products = res[1] || [];
      renderSettings();
      renderCategories();
      renderProducts();
    }).catch(function (e) {
      toast('加载失败，请刷新重试');
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('地址已复制'); } catch (e) { toast('请长按地址手动复制'); }
    document.body.removeChild(ta);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();