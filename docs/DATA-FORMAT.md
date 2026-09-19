# 数据格式文档

本项目的所有足迹数据都在一个文件里：[`data/records.js`](../data/records.js)。模板化使用时，**你只需要维护这一个文件**（其余两个数据文件是"基础设施"，不用动）。

## data/ 目录里有什么

| 文件 | 作用 | 需要你改吗 |
|---|---|---|
| `data/records.js` | **你的足迹数据**（发布到线上的只读快照） | ✅ 只改这个 |
| `data/config.js` | 站点标题、副标题、Logo（可选） | 想改名字时改 |
| `data/regions.js` | 全国行政区划树（省→市→县，含 adcode、中心点坐标） | ❌ 别动 |
| `data/geo/*.js` | 本地缓存的地图边界数据（可选） | ❌ 不用管 |

> **为什么数据文件是 `.js` 而不是 `.json`？**
> 因为 `.js` 可以用普通 `<script>` 标签加载——这样你**双击 `index.html` 就能本地使用**（录入模式），不需要起本地服务器。`.json` 用 `fetch` 加载会被浏览器的 file:// 安全策略拦住。

## 记录（Record）结构

`data/records.js` 的内容就是一个全局变量赋值：

```js
window.RECORDS_SNAPSHOT = [ /* 一条条记录 */ ];
```

每条记录的字段：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `type` | string | ✅ | `scenic` 景区 / `hotel` 酒店 / `restaurant` 餐厅 |
| `name` | string | ✅ | 名称，最长 60 字 |
| `date` | string | — | 到访日期，`YYYY-MM-DD` 格式，空字符串表示未填 |
| `rating` | number | — | 评分 0~5 的整数（对应页面上的星级） |
| `cost` | number \| null | — | 人均消费（景区=门票价、酒店=每晚、餐厅=人均），未填为 `null` |
| `phone` | string | — | 电话 |
| `address` | string | — | 地址 |
| `tags` | string[] | — | 标签，如 `["值得一去","亲子友好"]` |
| `photos` | string[] | — | 图片链接，每条记录最多展示前 4 张，**必须是可以外链的 https 图片** |
| `notes` | string | — | 推荐理由 / 备注 |
| `province` | object | ✅ | `{ "adcode": "430000", "name": "湖南省" }` |
| `city` | object \| null | — | 同上格式；**直辖市（北京/上海/天津/重庆）为 `null`** |
| `district` | object | ✅ | 区县级，格式同上；记录必须精确到区县 |
| `id` | string | ✅ | 唯一 ID，建议 UUID；用于编辑定位和备份合并去重 |
| `createdAt` | number | ✅ | 创建时间，毫秒时间戳 |
| `updatedAt` | number | ✅ | 更新时间，毫秒时间戳 |

### 完整示例

```js
window.RECORDS_SNAPSHOT = [{"type":"scenic","name":"风动石","date":"2026-08-01","rating":4,"cost":45,"phone":"","address":"漳州市东山县","tags":["值得一去"],"photos":["https://example.com/photo.jpg"],"notes":"海边的巨石很出片","province":{"adcode":"350000","name":"福建省"},"city":{"adcode":"350600","name":"漳州市"},"district":{"adcode":"350626","name":"东山县"},"id":"71344e42-8a15-4896-af0a-5397cf737f2b","createdAt":1789823679615,"updatedAt":1789823679615}];
```

## 关于 adcode（行政区划代码）

`adcode` 是阿里 DataV 使用的 6 位行政区划代码（如 `350000` 福建省、`350600` 漳州市、`350626` 东山县）。**代码必须是字符串**（带引号）。

查询入口：[DataV GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector)，点选任意区域即可看到 adcode。

`name` 需要和 DataV 返回的名称一致（如"湖南省"而不是"湖南"），否则地图上的记录数着色会对不上。

## 备份 JSON 和 records.js 的关系

本地录入模式（双击 `index.html` 打开）导出的"足迹备份_日期.json"，内容就是**不含 `window.RECORDS_SNAPSHOT =` 包装的记录数组**。

所以发布流程是：

```
本地录入 → 导出备份 JSON → tools/publish.html 转换 → 覆盖 data/records.js → 推送发布
```

`tools/publish.html` 会自动完成包装、字段校验、补全 id 和时间戳、adcode 字符串化，建议每次发布都用它。手写 JSON 的高手也可以直接编辑 `records.js`，只要保持 `window.RECORDS_SNAPSHOT = [ ... ];` 这个外壳即可。

## 手改数据后如何自查

1. 用浏览器打开 `data/records.js`，按 F12 看 Console 有没有红色报错（最常见：少了逗号/引号）；
2. 双击 `index.html`，侧栏和地图上的记录数是否正确；
3. 线上发布后，顶部统计的"足迹 N 省"是否符合预期。
