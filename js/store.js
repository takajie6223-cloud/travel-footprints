/* 数据层：所有记录存于浏览器 localStorage。
   读写全部走异步接口，以后要支持手机/朋友访问时，可在此替换为服务器数据源而不必改动页面逻辑。 */
const Store = (() => {
  const KEY = 'travel_footprint_records_v1';
  /* 分享模式：发布上网后（http/https）只读展示打包进站点的数据快照，
     录入数据请用电脑上双击 index.html 打开的本地版。调试可在网址后加 ?edit 强制编辑模式 */
  const SHARE_MODE = !new URLSearchParams(location.search).has('edit') &&
    (location.protocol === 'http:' || location.protocol === 'https:');
  let records = null;

  async function all() {
    if (records) return records;
    if (SHARE_MODE) {
      records = Array.isArray(window.RECORDS_SNAPSHOT) ? window.RECORDS_SNAPSHOT : [];
      return records;
    }
    try {
      records = JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch (e) {
      records = [];
    }
    if (!Array.isArray(records)) records = [];
    return records;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(records));
      return true;
    } catch (e) {
      alert('保存失败：浏览器存储空间已满。建议减少图片链接数量，或先导出备份再清理旧数据。');
      return false;
    }
  }

  function newId() {
    return (crypto.randomUUID
      ? crypto.randomUUID()
      : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
  }

  async function add(data) {
    if (SHARE_MODE) return null;
    await all();
    const rec = { ...data, id: newId(), createdAt: Date.now(), updatedAt: Date.now() };
    records.push(rec);
    return persist() ? rec : null;
  }

  async function update(id, patch) {
    if (SHARE_MODE) return null;
    await all();
    const rec = records.find(r => r.id === id);
    if (!rec) return null;
    Object.assign(rec, patch, { updatedAt: Date.now() });
    return persist() ? rec : null;
  }

  async function remove(id) {
    if (SHARE_MODE) return;
    await all();
    records = records.filter(r => r.id !== id);
    persist();
  }

  /* 合并导入：按 id 去重，备份文件中的同名记录覆盖本地 */
  async function importJson(text) {
    if (SHARE_MODE) throw new Error('分享模式下不可导入');
    await all();
    let list;
    try {
      list = JSON.parse(text);
    } catch (e) {
      throw new Error('文件不是有效的 JSON');
    }
    if (!Array.isArray(list)) throw new Error('备份文件格式不正确');
    const map = new Map(records.map(r => [r.id, r]));
    let added = 0, updated = 0;
    for (const item of list) {
      if (!item || !item.name || !item.district) continue;
      if (map.has(item.id)) { Object.assign(map.get(item.id), item); updated++; }
      else { records.push(item); map.set(item.id, item); added++; }
    }
    persist();
    return { added, updated };
  }

  function exportJson() {
    if (SHARE_MODE) return;
    const blob = new Blob([JSON.stringify(records || [], null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    const ds = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    a.href = URL.createObjectURL(blob);
    a.download = '足迹备份_' + ds + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  /* 按 adcode 汇总省/市/县三级的记录数 */
  async function counts() {
    await all();
    const byAd = new Map();
    const bump = (ad, type) => {
      if (!ad) return;
      const c = byAd.get(ad) || { total: 0, scenic: 0, hotel: 0, restaurant: 0 };
      c.total++; c[type] = (c[type] || 0) + 1;
      byAd.set(ad, c);
    };
    for (const r of records) {
      bump(r.province && r.province.adcode, r.type);
      bump(r.city && r.city.adcode, r.type);
      bump(r.district && r.district.adcode, r.type);
    }
    return byAd;
  }

  async function stats() {
    await all();
    const ps = new Set(), ds = new Set();
    const byType = { scenic: 0, hotel: 0, restaurant: 0 };
    for (const r of records) {
      if (r.province) ps.add(r.province.adcode);
      if (r.district) ds.add(r.district.adcode);
      byType[r.type] = (byType[r.type] || 0) + 1;
    }
    return { provinces: ps.size, districts: ds.size, total: records.length, byType };
  }

  return { all, add, update, remove, importJson, exportJson, counts, stats, SHARE_MODE };
})();
