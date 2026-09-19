/* 主逻辑：导航（地图点击 + 侧栏列表 + 面包屑）、县级记录列表、增删改表单、导入导出 */
const TYPES = {
  scenic:     { label: '景区', icon: '🏞️', costLabel: '门票' },
  hotel:      { label: '酒店', icon: '🏨', costLabel: '每晚' },
  restaurant: { label: '餐厅', icon: '🍜', costLabel: '人均' }
};
const TAG_PRESETS = ['值得一去', '会再来', '一次就好', '性价比高', '环境好', '服务好', '亲子友好', '停车方便', '排队久', '踩雷'];
const COUNTRY = { adcode: '100000', name: '全国', level: 'country' };

const state = { province: null, city: null, district: null, tab: 'all' };
let countsCache = new Map();
let editingId = null;
let formType = 'scenic', formRating = 0, formTags = [];

const $ = id => document.getElementById(id);

function childrenOf(node) {
  if (node.level === 'country') return REGIONS.root.map(a => REGIONS.nodes[a]);
  const meta = REGIONS.nodes[node.adcode];
  return ((meta && meta.children) || []).map(a => REGIONS.nodes[a]);
}

async function refreshCounts() { countsCache = await Store.counts(); }
const countOf = ad => { const c = countsCache.get(ad); return c ? c.total : 0; };

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ================= 渲染调度 ================= */

async function renderAll() {
  await refreshCounts();
  renderBreadcrumb();
  renderSide();
  renderTopStats();
  if (state.district) await showCountyView();
  else await showMapView();
}

function renderTopStats() {
  Store.stats().then(s => {
    $('topStats').innerHTML =
      '<span>📍 足迹 ' + s.provinces + ' 省</span>' +
      '<span>🏙 ' + s.districts + ' 区县</span>' +
      '<span>📝 ' + s.total + ' 条记录</span>';
  });
}

function showMapView() {
  $('countyView').hidden = true;
  $('mapWrap').hidden = false;
  MapView.disposeMini();
  const node = state.city || state.province || COUNTRY;
  const items = childrenOf(node).map(ch => ({ name: ch.name, adcode: ch.adcode, value: countOf(ch.adcode) }));
  return MapView.render(node, items, null, pick);
}

/* 点击某区域/列表项后的导航：有下级则下钻，无下级则作为目的地进入县级视图 */
function pick(node) {
  const kids = childrenOf(node);
  if (node.level === 'province') {
    state.province = node; state.city = null; state.district = null;
    if (!kids.length) state.district = node;   // 港澳台等无下级的省级
  } else if (node.level === 'city') {
    if (kids.length) { state.city = node; state.district = null; }
    else { state.city = null; state.district = node; }  // 济源、仙桃等省直辖县级
  } else {
    state.district = node;
  }
  if (!state.district && kids.length) {
    renderBreadcrumb();
    renderSide();
    MapView.drillTo(node, showMapView);
  } else {
    renderAll();
  }
}

function renderBreadcrumb() {
  const bc = $('breadcrumb');
  const crumbs = [];
  crumbs.push({ name: '全国', fn: () => { state.province = state.city = state.district = null; state.tab = 'all'; renderAll(); } });
  if (state.province) crumbs.push({
    name: state.province.name,
    fn: () => { state.city = null; state.district = null; state.tab = 'all'; renderAll(); }
  });
  if (state.city) crumbs.push({
    name: state.city.name,
    fn: () => { state.district = null; state.tab = 'all'; renderAll(); }
  });
  const dup = state.district && ((state.city && state.district.adcode === state.city.adcode) ||
    (state.province && state.district.adcode === state.province.adcode));
  if (state.district && !dup) crumbs.push({ name: state.district.name, fn: null });

  bc.innerHTML = '';
  crumbs.forEach((c, i) => {
    if (i) {
      const s = document.createElement('span');
      s.className = 'sep'; s.textContent = '›';
      bc.appendChild(s);
    }
    if (c.fn) {
      const a = document.createElement('a');
      a.textContent = c.name; a.onclick = c.fn;
      bc.appendChild(a);
    } else {
      const b = document.createElement('b');
      b.textContent = c.name;
      bc.appendChild(b);
    }
  });
}

function renderSide() {
  const head = $('sideHead'), list = $('sideList');
  let container, title, sub;
  if (state.district) {
    container = state.city || state.province;
    title = (state.city || state.province).name;
    sub = '同区域的其它区县';
  } else {
    container = state.city || state.province || COUNTRY;
    title = container.name;
    sub = container.level === 'country' ? '点击省份开始记录足迹' : '点击进入下一级';
  }
  head.innerHTML = '<h3>' + escapeHtml(title) + '</h3><p class="muted">' + sub + '</p>';

  const kids = childrenOf(container);
  list.innerHTML = '';
  if (!kids.length) {
    list.innerHTML = '<p class="empty">该区域暂无下级区划</p>';
    return;
  }
  for (const ch of kids) {
    const n = countOf(ch.adcode);
    const item = document.createElement('div');
    item.className = 'side-item';
    item.innerHTML = '<span class="nm">' + escapeHtml(ch.name) + '</span>' +
      (n ? '<span class="cnt">' + n + '</span>' : '<span class="cnt zero">0</span>');
    item.onclick = () => pick(ch);
    list.appendChild(item);
  }
}

/* ================= 县级视图 ================= */

async function showCountyView() {
  $('mapWrap').hidden = true;
  const view = $('countyView');
  view.hidden = false;
  const d = state.district;

  $('countyName').textContent = d.name;
  const path = [];
  if (state.province) path.push(state.province.name);
  if (state.city) path.push(state.city.name);
  $('countyPath').textContent = path.join(' · ') || '直辖区划';

  MapView.renderMini(state.city || state.province, d.name);

  const all = (await Store.all()).filter(r => r.district && r.district.adcode === d.adcode);
  const byType = { all: all.length, scenic: 0, hotel: 0, restaurant: 0 };
  for (const r of all) if (byType[r.type] !== undefined) byType[r.type]++;

  const tabs = [['all', '全部'], ['scenic', '🏞️ 景区'], ['hotel', '🏨 酒店'], ['restaurant', '🍜 餐厅']];
  const tabsEl = $('countyTabs');
  tabsEl.innerHTML = '';
  for (const [key, label] of tabs) {
    const b = document.createElement('button');
    b.className = 'tab' + (state.tab === key ? ' active' : '');
    b.innerHTML = label + ' <i>' + byType[key] + '</i>';
    b.onclick = () => { state.tab = key; showCountyView(); };
    tabsEl.appendChild(b);
  }

  const listEl = $('cardList');
  listEl.innerHTML = '';
  const recs = all
    .filter(r => state.tab === 'all' || r.type === state.tab)
    .sort((a, b) =>
      (b.date || '').localeCompare(a.date || '') ||
      (b.rating || 0) - (a.rating || 0) ||
      (b.createdAt || 0) - (a.createdAt || 0));

  if (!recs.length) {
    const label = state.tab === 'all' ? '' : TYPES[state.tab].label;
    listEl.innerHTML =
      '<div class="empty-block"><p>这里还没有' + label + '记录</p>' +
      '<button class="btn primary" id="emptyAdd">＋ 添加第一条</button></div>';
    $('emptyAdd').onclick = () => openForm();
    return;
  }
  for (const r of recs) listEl.appendChild(cardFor(r));
}

function cardFor(r) {
  const t = TYPES[r.type] || TYPES.scenic;
  const card = document.createElement('article');
  card.className = 'card ' + r.type;
  const stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
  const meta = [
    r.date ? '<span>📅 ' + escapeHtml(r.date) + '</span>' : '',
    r.cost ? '<span>💰 ' + t.costLabel + ' ¥' + escapeHtml(r.cost) + '</span>' : '',
    r.address ? '<span>📍 ' + escapeHtml(r.address) + '</span>' : ''
  ].filter(Boolean).join('');

  card.innerHTML =
    '<div class="card-top">' +
      '<span class="badge b-' + r.type + '">' + t.icon + ' ' + t.label + '</span>' +
      '<h3>' + escapeHtml(r.name) + '</h3>' +
      '<span class="stars">' + stars + '</span>' +
    '</div>' +
    (meta ? '<div class="card-meta">' + meta + '</div>' : '') +
    (r.tags && r.tags.length
      ? '<div class="chips">' + r.tags.map(x => '<i>' + escapeHtml(x) + '</i>').join('') + '</div>' : '') +
    (r.notes ? '<p class="notes">' + escapeHtml(r.notes) + '</p>' : '') +
    (r.photos && r.photos.length
      ? '<div class="photos">' + r.photos.slice(0, 4).map(u =>
          '<a href="' + escapeHtml(u) + '" target="_blank" rel="noopener">' +
          '<img src="' + escapeHtml(u) + '" alt="" onerror="this.parentNode.style.display=\'none\'"></a>'
        ).join('') + '</div>' : '') +
    '<div class="card-actions">' +
      '<button class="btn mini">编辑</button>' +
      '<button class="btn mini ghost">删除</button>' +
    '</div>';

  const btns = card.querySelectorAll('.card-actions .btn');
  btns[0].onclick = () => openForm(r);
  btns[1].onclick = () => del(r);
  return card;
}

async function del(r) {
  if (!confirm('确定删除「' + r.name + '」吗？删除后无法恢复。')) return;
  await Store.remove(r.id);
  toast('已删除');
  renderAll();
}

/* ================= 表单 ================= */

function openForm(rec) {
  editingId = rec ? rec.id : null;
  $('formTitle').textContent = rec ? '编辑记录' : '添加记录';
  $('btnDelete').hidden = !rec;
  const f = $('recordForm');
  f.recName.value = rec ? rec.name : '';
  f.recDate.value = rec ? (rec.date || '') : '';
  f.recCost.value = rec && rec.cost != null ? rec.cost : '';
  f.recPhone.value = rec ? (rec.phone || '') : '';
  f.recAddress.value = rec ? (rec.address || '') : '';
  f.recPhotos.value = rec && rec.photos ? rec.photos.join('\n') : '';
  f.recNotes.value = rec ? (rec.notes || '') : '';
  formType = rec ? rec.type : (state.tab !== 'all' ? state.tab : 'scenic');
  formRating = rec ? (rec.rating || 0) : 0;
  formTags = rec && rec.tags ? rec.tags.slice() : [];
  renderTypeSeg(); renderStars(); renderTagChips(); updateCostLabel();
  $('modalMask').hidden = false;
  setTimeout(() => f.recName.focus(), 60);
}

function closeModal() { $('modalMask').hidden = true; }

function renderTypeSeg() {
  const seg = $('typeSeg');
  seg.innerHTML = '';
  for (const [key, t] of Object.entries(TYPES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg-btn' + (formType === key ? ' active' : '');
    b.textContent = t.icon + ' ' + t.label;
    b.onclick = () => { formType = key; renderTypeSeg(); updateCostLabel(); };
    seg.appendChild(b);
  }
}

function updateCostLabel() { $('costLabel').textContent = TYPES[formType].costLabel; }

function renderStars() {
  const s = $('starInput');
  s.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const st = document.createElement('span');
    st.className = 'star' + (i <= formRating ? ' on' : '');
    st.textContent = i <= formRating ? '★' : '☆';
    st.onclick = () => { formRating = i; renderStars(); };
    s.appendChild(st);
  }
}

function renderTagChips() {
  const box = $('tagChips');
  box.innerHTML = '';
  const all = [...new Set([...TAG_PRESETS, ...formTags])];
  for (const t of all) {
    const on = formTags.includes(t);
    const c = document.createElement('i');
    c.textContent = t;
    c.className = 'chip' + (on ? ' on' : '');
    c.onclick = () => {
      formTags = on ? formTags.filter(x => x !== t) : formTags.concat(t);
      renderTagChips();
    };
    box.appendChild(c);
  }
}

/* ================= 导入导出 / Toast ================= */

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._h);
  toast._h = setTimeout(() => { t.hidden = true; }, 2200);
}

/* ================= 初始化 ================= */

window.backToCityMap = () => { state.district = null; state.tab = 'all'; renderAll(); };

(async function init() {
  if (!window.REGIONS || !window.echarts) {
    document.body.innerHTML =
      '<p style="padding:40px;font-size:15px">资源加载失败：请确认 lib/echarts.min.js 与 data/regions.js 文件存在。</p>';
    return;
  }

  $('btnAdd').onclick = () => openForm();
  $('formClose').onclick = closeModal;
  $('btnCancel').onclick = closeModal;
  $('modalMask').addEventListener('click', e => { if (e.target === $('modalMask')) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('modalMask').hidden) closeModal();
  });

  $('btnDelete').onclick = async () => {
    const rec = (await Store.all()).find(r => r.id === editingId);
    if (rec) { closeModal(); del(rec); }
  };

  $('recordForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const name = f.recName.value.trim();
    if (!name) { toast('请填写名称'); f.recName.focus(); return; }
    const photos = f.recPhotos.value.split('\n').map(s => s.trim()).filter(Boolean);
    const data = {
      type: formType,
      name,
      date: f.recDate.value || '',
      rating: formRating,
      cost: f.recCost.value === '' ? null : Number(f.recCost.value),
      phone: f.recPhone.value.trim(),
      address: f.recAddress.value.trim(),
      tags: formTags,
      photos,
      notes: f.recNotes.value.trim(),
      province: state.province ? { adcode: state.province.adcode, name: state.province.name } : null,
      city: state.city ? { adcode: state.city.adcode, name: state.city.name } : null,
      district: state.district ? { adcode: state.district.adcode, name: state.district.name } : null
    };
    if (!data.district) { toast('请先选择到区县再添加记录'); return; }
    const ok = editingId ? await Store.update(editingId, data) : await Store.add(data);
    if (!ok) return;
    closeModal();
    toast(editingId ? '已更新' : '已添加');
    state.tab = 'all';
    renderAll();
  });

  $('tagInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = e.target.value.trim();
      if (v && !formTags.includes(v)) {
        formTags = formTags.concat(v);
        e.target.value = '';
        renderTagChips();
      }
    }
  });

  $('btnExport').onclick = () => {
    Store.exportJson();
    toast('备份文件已下载，建议保存到 backup 文件夹');
  };
  $('btnImport').onclick = () => $('importFile').click();
  $('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await Store.importJson(String(reader.result));
        renderAll();
        toast('导入完成：新增 ' + res.added + ' 条，更新 ' + res.updated + ' 条');
      } catch (err) {
        alert('导入失败：' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsText(file, 'utf-8');
  });

  await refreshCounts();
  if (Store.SHARE_MODE) {
    document.body.classList.add('share-mode');
    const badge = document.createElement('span');
    badge.className = 'share-badge';
    badge.textContent = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
      ? '👁 只读预览 · 录入数据请双击 index.html'
      : '👁 分享模式（只读）';
    document.querySelector('.top-actions').prepend(badge);
  }
  renderAll();
})();
