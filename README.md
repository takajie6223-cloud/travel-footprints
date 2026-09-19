# travel-footprints 🗺️

> 纯前端的旅行足迹手账：把去过的景区、住过的酒店、吃过的餐厅，按 全国 → 省 → 市 → 县 整理在地图上。

![全国足迹地图](docs/preview.png)

**本站既是作者的实时足迹，也是一个开箱即用的模板**——Fork（或点右上角 *Use this template*）换上你自己的数据，就是你的足迹地图。👉 [在线演示](https://takajie6223-cloud.github.io/travel-footprints/)

## 特性

- 🇨🇳 全国地图点击省份**逐级下钻**（省 → 市 → 县），去过的省自动涂色，县级视图配小地图
- 📝 每条记录含**评分、人均消费、电话、地址、标签、图片、推荐理由**
- 🔒 **双模式**：本地双击 `index.html` = 录入模式（数据存浏览器，支持导入导出备份）；发布上线 = 只读快照，访客改不了
- 📦 **零依赖、零构建**：原生 HTML/CSS/JS + ECharts（已内置在 `lib/`，无需联网加载）
- 🌐 地图边界本地缓存优先，[阿里 DataV](https://datav.aliyun.com/portal/school/atlas/area_selector) 在线接口兜底
- 🧰 附**发布助手**：本地导出的备份 JSON 一键转成发布文件，字段校验、自动补全

## 快速开始

1. **Use this template** / Fork 本仓库到你的账号；
2. 仓库 Settings → Pages，Source 选 **Deploy from a branch**（main / root）；
3. 把仓库克隆到电脑，**双击 `index.html`** 开始录入足迹；
4. 点"导出备份"得到 JSON，打开 `tools/publish.html` 转成 `records.js`，覆盖 `data/records.js` 后推送——完成，你的足迹地图上线了。

详细步骤、主题配色、图床建议、常见问题见 **[docs/CUSTOMIZE.md](docs/CUSTOMIZE.md)**；数据字段说明见 **[docs/DATA-FORMAT.md](docs/DATA-FORMAT.md)**。

## 目录结构

```
├── index.html          # 页面骨架（双击本地使用 = 录入模式）
├── css/style.css       # 样式（:root 变量 = 全站配色）
├── js/
│   ├── app.js          # 主逻辑：导航、下钻、表单、导入导出
│   ├── map.js          # 地图渲染：本地边界优先，DataV 在线兜底
│   └── store.js        # 数据层：localStorage / 快照双模式
├── data/
│   ├── records.js      # ✏️ 你的足迹数据（唯一需要维护的文件）
│   ├── config.js       # ✏️ 站点标题 / 副标题 / Logo
│   ├── regions.js      # 全国区划树（含 adcode，勿动）
│   └── geo/*.js        # 本地地图边界缓存（可选，缺失自动走在线）
├── lib/echarts.min.js  # ECharts 本地副本
└── tools/publish.html  # 🧰 备份 JSON → records.js 发布助手
```

## 致谢

- [ECharts](https://echarts.apache.org/)（Apache-2.0）—— 地图可视化
- [阿里 DataV GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector) —— 行政区划数据与地图边界

## License

[MIT](LICENSE)
