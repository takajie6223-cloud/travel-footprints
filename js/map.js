/* 地图视图：边界数据按需从阿里 DataV 免费接口加载（浏览器自动缓存），
   支持下钻放大动画、滚轮缩放、拖拽平移。 */
const MapView = (() => {
  const DATAV = 'https://geo.datav.aliyun.com/areas_v3/bound/';
  const geoCache = new Map();
  let chart = null;
  let miniChart = null;
  let lastArgs = null;

  function mainChart() {
    if (!chart) {
      chart = echarts.init(document.getElementById('map'));
      window.addEventListener('resize', () => {
        if (chart) chart.resize();
        if (miniChart) miniChart.resize();
      });
    }
    return chart;
  }

  function loadGeo(adcode) {
    if (!geoCache.has(adcode)) {
      geoCache.set(adcode,
        fetch(DATAV + adcode + '_full.json')
          .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .catch(e => { geoCache.delete(adcode); throw e; })
      );
    }
    return geoCache.get(adcode);
  }

  function tip(html) {
    const t = document.getElementById('mapTip');
    if (!html) { t.hidden = true; t.innerHTML = ''; return; }
    t.hidden = false;
    t.innerHTML = html;
    const retry = document.getElementById('retryMap');
    if (retry) retry.onclick = () => render(...lastArgs);
  }

  /* node：当前展示的地图节点；items：[{name, value, adcode}] 记录数着色；
     selectedName：高亮的区域名；onPick(childNode)：点击区域回调 */
  async function render(node, items, selectedName, onPick) {
    lastArgs = [node, items, selectedName, onPick];
    const c = mainChart();
    tip('<span class="spin"></span> 地图边界加载中…');
    let geo;
    try {
      geo = await loadGeo(node.adcode);
    } catch (e) {
      tip('地图数据加载失败，请确认电脑已联网后 <a href="javascript:void(0)" id="retryMap">点此重试</a>');
      return;
    }
    tip('');
    echarts.registerMap('m_' + node.adcode, geo);
    const maxV = Math.max(1, ...items.map(d => d.value || 0));
    c.setOption({
      animationDuration: 300,
      animationDurationUpdate: 450,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(58, 49, 40, .92)',
        textStyle: { color: '#fffdf8', fontSize: 12 },
        formatter: p => {
          const v = p.value || 0;
          return p.name + '<br/>' + (v > 0 ? '📝 已有 ' + v + ' 条记录' : '暂无记录，点击进入');
        }
      },
      visualMap: {
        show: false, min: 0, max: maxV,
        inRange: { color: ['#f7f1e6', '#eed9a4', '#e2a95c', '#cf5b2e'] }
      },
      series: [{
        type: 'map', map: 'm_' + node.adcode,
        roam: true, scaleLimit: { min: 0.5, max: 10 },
        zoom: 1,
        label: { show: true, fontSize: 11, color: '#94897a' },
        itemStyle: { areaColor: '#f7f1e6', borderColor: '#ffffff', borderWidth: 1 },
        emphasis: {
          label: { color: '#3a3128', fontWeight: 'bold' },
          itemStyle: { areaColor: '#f0c264', shadowBlur: 10, shadowColor: 'rgba(80, 60, 20, .3)' }
        },
        select: {
          label: { color: '#fffdf8', fontWeight: 'bold' },
          itemStyle: { areaColor: '#cf5b2e' }
        },
        data: items.map(d => ({ name: d.name, value: d.value || 0 }))
      }]
    }, true);
    c.off('click');
    c.on('click', p => {
      if (!onPick || !p.name) return;
      const child = childrenOf(node).find(ch => ch.name === p.name);
      if (child) onPick(child);
    });
  }

  /* 下钻动画：先在当前地图上放大到目标区域，再切换到子地图 */
  function drillTo(childNode, renderChildFn) {
    const c = mainChart();
    const meta = REGIONS.nodes[childNode.adcode];
    try {
      c.setOption({ series: [{ center: (meta && meta.centroid) || undefined, zoom: 2.4 }] });
    } catch (e) { /* 动画失败不影响功能 */ }
    setTimeout(renderChildFn, 430);
  }

  /* 县级视图顶部的小地图：展示所属市/省并高亮当前区县；点击返回上级地图 */
  async function renderMini(containerNode, selectedName) {
    const dom = document.getElementById('miniMap');
    if (!dom) return;
    let geo;
    try {
      geo = await loadGeo(containerNode.adcode);
    } catch (e) {
      dom.innerHTML = '<p class="mini-fallback">小地图加载失败（需要联网）</p>';
      return;
    }
    echarts.registerMap('m_' + containerNode.adcode, geo);
    disposeMini();
    miniChart = echarts.init(dom);
    miniChart.setOption({
      animation: false,
      series: [{
        type: 'map', map: 'm_' + containerNode.adcode,
        roam: false, selectedMode: 'single', zoom: 1.05,
        label: { show: true, fontSize: 9, color: '#94897a' },
        itemStyle: { areaColor: '#f2ead9', borderColor: '#ffffff', borderWidth: 1 },
        emphasis: {
          label: { color: '#3a3128' },
          itemStyle: { areaColor: '#f0c264' }
        },
        select: {
          label: { color: '#fffdf8', fontWeight: 'bold', fontSize: 10 },
          itemStyle: { areaColor: '#cf5b2e' }
        },
        data: [{ name: selectedName, value: 1, selected: true }]
      }]
    });
    miniChart.on('click', () => { if (window.backToCityMap) window.backToCityMap(); });
  }

  function disposeMini() {
    if (miniChart) { miniChart.dispose(); miniChart = null; }
  }

  return { render, drillTo, renderMini, disposeMini };
})();
