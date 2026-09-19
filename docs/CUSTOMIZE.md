# 自定义指南

从 Fork 到拥有一个属于你自己的足迹地图，只需要下面几步。全程不需要安装任何东西。

## 快速开始（5 步）

1. **Fork 或 Use this template** —— 右上角按钮，把本仓库复制到你的账号下；
2. **开启 GitHub Pages**（Fork 的话需要自己开一次）：
   仓库 Settings → Pages → Build and deployment → Source 选 **Deploy from a branch** → Branch 选 **main / (root)** → Save。
   一分钟后 `https://你的用户名.github.io/travel-footprints/` 就是你自己的站点了；
3. **本地录入数据**：把仓库下载/`git clone` 到电脑，**双击 `index.html`**——这是录入模式，点省份下钻到区县，"＋ 添加记录"开始写；
   > 本地录入存在浏览器 localStorage 里，和线上站点互不影响，随时可以"导出备份"；
4. **发布**：点"导出备份"得到 JSON → 打开 `tools/publish.html` 转成 `records.js` → 用它覆盖仓库里的 `data/records.js` → 提交并推送到 main → Pages 自动重新发布；
5. **改名字**：编辑 `data/config.js`（见下）。

## 改标题、副标题、Logo

编辑 `data/config.js`：

```js
window.FT_CONFIG = {
  siteName: "Jason travel-footprints",   // 页面大标题 + 浏览器标签页标题
  tagline: "景区 · 酒店 · 餐厅 足迹手账",  // 标题下面那行小字
  logo: "🗺️"                              // 左上角表情符号
};
```

## 换主题色（进阶）

页面配色集中在两处：

- **页面底色、文字、按钮**：`css/style.css` 顶部的 `:root` 变量块（`--primary` 主色、`--bg` 背景、`--ink` 文字色等），改一处全站生效；
- **地图的省份着色**：`js/map.js` 里 `visualMap` 的 `inRange` 数组（4 个颜色，从"没去过"到"记录最多"渐变）。

改完刷新页面即可看到效果。

## 地图边界数据说明

地图加载顺序：**本地 `data/geo/` 缓存 → 阿里 DataV 在线接口**。所以：

- `data/geo/` 里**没有**某个省份的文件完全不影响使用，会自动走在线接口；
- 内置缓存的意义是：即使 DataV 接口打不开（网络波动），去过的省份依然能渲染；
- 想给某个省补充本地缓存的话，文件格式非常简单（一行包装 + GeoJSON）：

  ```js
  window.__GEO_CACHE__=window.__GEO_CACHE__||{};window.__GEO_CACHE__["440000"]={ /* 该省的 GeoJSON */ };
  ```

  GeoJSON 从 DataV 下载：`https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json`（如广东省 `440000`）。

## 常见问题

**Q：为什么本地打开 index.html 显示"编辑模式"，线上却是"分享模式（只读）"？**
这是设计如此：`file://` 协议打开 = 录入；`http(s)://` 打开 = 只读快照，防止访客改你的数据。想在预览线上效果时临时录入，可在网址后加 `?edit`。

**Q：图片应该用什么图床？**
任何能直链访问的 https 图片服务都可以。推荐把图片上传到 GitHub 的一个私有/公开仓库（如 `你的用户名/pics`），用 `raw.githubusercontent.com` 或 jsDelivr 的链接。记录里最多展示前 4 张。

**Q：推送后地图上没有我的记录？**
九成是 adcode 或 `name` 和 DataV 标准不一致（比如把 adcode 写成了数字、或省名少了"省"字）。对照[数据格式文档](DATA-FORMAT.md)检查，用 `tools/publish.html` 重新生成一遍可以自动修掉大部分问题。

**Q：能多个人一起维护吗？**
可以。数据就是一个 JSON 文件，走 Git 协作流程即可；也可以多人各自录入后，用"导入备份"的按 id 合并能力汇总到一个人的浏览器里再统一发布。

**Q：想改"景区/酒店/餐厅"这三个分类？**
编辑 `js/app.js` 顶部的 `TYPES` 常量（label / icon / costLabel），并在 `js/store.js` 的 `counts()` 与 `stats()` 里同步类型名。改动很小，但注意三处要保持一致。
