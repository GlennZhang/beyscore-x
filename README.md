# Beyscore X 网页版（Web）

> Beyblade X（战斗陀螺 X）玩家的对战计分与赛事管理工具 —— 纯前端网页版 MVP，数据本地存储，**不实现多人联机 / 扫码加入 / 任何后端或硬件链接**。

---

## 1. 需求背景

原始需求：把 App Store 上的 **Beyscore X**（[App Store 链接](https://apps.apple.com/tw/app/beyscore-x/id6782795887)，一款 Beyblade X 对战计分与赛事管理工具）做成网页版。

约束：
- **不需要实现硬件连接**：陀螺发射器、蓝牙/扫码对战等依赖硬件或后端的模块全部跳过。
- **纯前端 MVP**：所有数据存在浏览器 `localStorage`，可离线运行，无需服务器。
- 还原 App 的**比赛模式（Battle Mode）**体验：双端 Ready → 全屏倒计时 → 局内计分界面。

---

## 2. 功能特性

| 模块 | 功能 |
|------|------|
| **对战（比赛模式）** | 两人对战计分；每局双端 Tap-to-Ready 确认；全屏倒计时（READY→3→2→1→GO→SHOOT）；黑底局内计分界面（SPIN/OVER/BURST/XTREME + 平手 + 發射失敗 + 重賽 + 離開）；先到 4 分获胜 |
| **计分规则** | SPIN Finish +1 / OVER Finish +2 / BURST Finish +2 / XTREME Finish +3 / Draw 平手 0 / 發射失敗 对方 +1；每局记录胜方、终结类型、时间戳；每 3 局提示重排；随机站位 |
| **我的陀螺 / 战队** | 战队（Team）与陀螺组合（Combo）增删改查；Standard 系统（Blade/Ratchet/Bit）与 CX 系统（Lock Chip / Main / Over / Assist Blade / Ratchet / Bit）双套部件 |
| **产品与零件图鉴** | 223 个真实零件 + 146 条官方产品（另保留301条社区配置变体）；支持多语言 / Code 搜索、系统与分类过滤，并内置离线图片 |
| **历史与统计** | 对战历史（可展开每局）；排行榜（按胜场 / 胜率排序）；战绩统计（总对战 / 回合 / 参战玩家 / 终结方式分布） |

---

## 3. 技术栈

- **构建**：[Vite](https://vitejs.dev/) 5 + React 18
- **UI**：[Material UI (MUI)](https://mui.com/) v5 + [Tailwind CSS](https://tailwindcss.com/) v3
- **字体**：Orbitron + Chakra Petch（Google Fonts，离线时回退系统无衬线字体）
- **状态 / 持久化**：React Context（`AppContext`）+ 浏览器 `localStorage`
- **测试**：[Vitest](https://vitest.dev/) 2 + Testing Library
- **语言**：JavaScript (JSX)

---

## 4. 设计

### 4.1 架构总览

```
App.jsx (Theme + 四模块 Tab 导航)
  └─ AppProvider (context/AppContext.jsx)
       ├─ Layout.jsx          顶部 AppBar + 底部 BottomNavigation
       ├─ BattlePage.jsx      对战编排（Setup → ReadyConfirm → Countdown → BattleScreen → ResultPanel）
       ├─ PartsPage.jsx       零件图鉴
       ├─ MyBeybladesPage.jsx 战队 / 陀螺管理
       └─ HistoryPage.jsx     历史 / 排行榜 / 统计

核心逻辑（无 UI 依赖，可独立测试）：
  ├─ lib/scoring.js   计分引擎（纯函数）
  └─ lib/storage.js   localStorage 读写封装
```

### 4.2 数据流

```
用户操作 (BattlePage)
   ↓ 调用 actions
AppContext (teams / combos / battle / history 状态)
   ↓ 变更后
storage.js  →  localStorage 持久化
```

- `battle` 状态在 `AppContext` 中维护；对战过程中通过 `recordRound(winner, finishType)` 累加比分。
- **finished（结束）状态用 ref guard 精确写入 history 一次**，避免刷新页面重复写入。
- 对战结束后写入 `history`（不可变快照），供历史页与排行榜使用。

### 4.3 计分引擎（lib/scoring.js）

设计为一个**无 DOM / 无 React 依赖的纯函数模块**，便于单元测试：

| 导出 | 说明 |
|------|------|
| `WIN_SCORE` | 目标分（Beyblade X 标准规则：先到 `4` 分获胜） |
| `FINISH` / `FINISH_META` | 终结类型枚举与各类型元数据（`points` 分值、`label`、`zh` 文案、`color`） |
| `createBattle(a, b)` | 创建一场空对战 |
| `beginBattle()` | 开始（倒计时结束后调用） |
| `recordRound(winner, type)` | 记录一局并累加比分（加分使用 `FINISH_META[type].points`，非硬编码） |
| `drawPosition()` | 随机站位（Position Draw） |
| `shouldReorganize(roundIndex)` | 每 3 局触发重排提示 |
| `battleSummary(battle)` | 汇总胜者、终结方式分布、回合数 |

### 4.4 比赛模式 UI 还原（BattlePage.jsx）

按 App 截图分四个阶段：

1. **SetupForm** — 新建对战（双方名字、可选从「我的陀螺」选组合、随机站位开关）。
2. **ReadyConfirm** — 深绿全屏 + X 型交叉线；左右两侧 Z 形点击区 + 竖排 `TAP TO READY`；双方都 READY 后自动进入倒计时。
3. **Countdown** — 全屏白底 `READY → 3 → 2 → 1 → GO → SHOOT`，每个约 1 秒。
4. **BattleScreen** — 黑底局内计分：顶部 `ROUND {n}` + 秒表，中央大比分 + `SCORE`，左右四组得分按钮（SPIN+1/OVER+2/BURST+2/XTREME+3），底部平手 / 發射失敗 / 重賽 / 離開；记录一次结果后锁定并返回下一局准备页，任一方达 4 分自动结算。

---

## 5. 目录结构

```
beyscore-x/
├── index.html                 # 入口，引入 Google Fonts，lang=zh-Hant
├── package.json
├── vite.config.js             # Vite + React 插件；已配置 Vitest test
├── tailwind.config.js         # 扩展 bey 红/黑/黄配色
├── postcss.config.js
└── src/
    ├── main.jsx               # React 根渲染
    ├── App.jsx                # ThemeProvider + 四模块 Tab 切换
    ├── theme.js               # MUI 暗色主题（红/黄/黑）
    ├── index.css              # Tailwind 指令 + 动画 keyframes
    ├── data/
    │   ├── parts.js           # 真实零件数据映射（223 条）
    │   ├── products.js        # 官方产品（146条）+ 社区配置变体（301条）
    │   └── raw/               # go-shoot 数据快照（见第 6 节）
    │       ├── meta.json
    │       ├── part-blade.json / part-blade-divided.json / part-blade-collab.json
    │       ├── part-ratchet.json / part-bit.json
    │       ├── prod-beys.json / prod-gear.json / prod-keihin.json
    ├── lib/
    │   ├── scoring.js         # 计分引擎（纯函数）
    │   ├── scoring.test.js
    │   ├── storage.js         # localStorage 封装
    │   └── storage.test.js
    ├── context/
    │   ├── AppContext.jsx     # 全局状态 + 持久化 + actions
    │   └── AppContext.test.jsx
    └── components/
        ├── Layout.jsx
        ├── Countdown.jsx
        ├── BattlePage.jsx     # Setup / ReadyConfirm / BattleScreen / ResultPanel / RoundHistory
        ├── PartsPage.jsx
        ├── MyBeybladesPage.jsx
        └── HistoryPage.jsx
```

---

## 6. 真实数据源（go-shoot wiki）与图片

图鉴数据来自社区非官方资讯站 **[go-shoot.github.io/x/](https://go-shoot.github.io/x/)**，产品信息可与 [Takara Tomy 官方产品页](https://beyblade.takaratomy.co.jp/beyblade-x/lineup/)交叉核对。当前快照对应 go-shoot commit `c238ddbe66fe0ba25c6d5ef2e3dc29ce35074df4`（2026-07-16）。

### 6.1 数据在哪里

该站**没有 REST API**，其"接口"本质是 GitHub 仓库 [`go-shoot/x`](https://github.com/go-shoot/x) 中 **`db/` 目录的一批静态 JSON 文件**（GitHub Pages 直接部署仓库内容）。核心文件：

| 文件 | 内容 |
|------|------|
| `part-blade.json` | Blade（刃击环） |
| `part-blade-divided.json` | 分裂型 Blade（CX 的 Main/Over/Assist 组件） |
| `part-blade-collab.json` | 合作款 Blade |
| `part-ratchet.json` | Ratchet（核轮） |
| `part-bit.json` | Bit（轴心） |
| `prod-beys.json` | 陀螺产品（含组合规格） |
| `prod-gear.json` | 发射器 / 装备 |
| `prod-keihin.json` | 配件 |
| `meta.json` | 字段字典 + 术语表（中文）+ CX 组件拆解规则 |

### 6.2 数据结构要点

- **零件**：顶层为对象，键 = 产品代码（如 `HlNt` / `9-80`），值含 `names{jap/eng/hasbro/chi}`、`desc`（繁中）、`stat`、`attr`、`group`。
- **产品**（`prod-beys.json`）：顶层为数组，每项形如 `["产品Code", "世代", "组合规格"]`。规格字符串需解析：
  - `"WyHv 8-80 B"` → Blade `WyHv` + Ratchet `8-80` + Bit `B`
  - `"GlVl = LF"` → CX fused（锁片+刃）
  - `"/ / U"` → 空 / 自选
  - 另有可选 `coat` / `get` / `mode`
- **中文**：数据为**繁体中文**（`names.chi`、`desc`），可直接使用；如需简体可接 OpenCC。
- `stat` 是上游资料中的规格/性能值，并非统一的实测重量字段。
- 268 张透明零件图位于 `public/assets/parts/`；147 张 Takara Tomy 产品图位于 `public/assets/products/`，构建后均可离线使用。上游尚未提供 `5-50` Ratchet 和 `LP` Bit 图片，界面会显示占位提示。

### 6.3 下载方式（重要：网络注意事项）

> ⚠️ **网络坑**：在部分网络环境下 `raw.githubusercontent.com` 会被墙 / 超时。请改用 **jsDelivr CDN**（带 CORS 头、可缓存、国内可达）。

```bash
# ✅ 推荐：通过 jsDelivr 下载（已验证可用）
cd beyscore-x/src/data/raw
for f in part-blade part-blade-divided part-blade-collab part-ratchet part-bit prod-beys prod-gear prod-keihin meta; do
  curl -sSL "https://cdn.jsdelivr.net/gh/go-shoot/x@main/db/$f.json" -o "$f.json"
done

# ❌ 不推荐：raw.githubusercontent.com 可能超时
# https://raw.githubusercontent.com/go-shoot/x/main/db/part-blade.json
```

项目内已按上述方式下载好 9 个 JSON（`src/data/raw/`），并接入图鉴。

### 6.4 当前接入方式

1. `parts.js` 在构建时读取 Blade / CX 分件 / Ratchet / Bit JSON，生成统一的223条零件记录。
2. `official-products.json` 从 Takara Tomy 产品目录生成146条官方产品资料（名称、分类、价格、发布日期、详情链接），并关联官方商品图。
3. `products.js` 同时保留 `prod-beys.json` 的301条社区配置变体，用相同产品编号为官方产品补充组合规格。
4. 图鉴支持零件与产品视图切换，全部图片使用本地路径，不依赖运行时网络。

---

## 7. 安装与运行

```bash
cd beyscore-x
npm install
npm run dev        # 本地开发，默认 http://localhost:5173
npm run build      # 生产构建，产物在 dist/
npm run preview    # 预览生产构建
npm test           # 运行测试（等同 npx vitest run）
```

---

## 8. 测试

- 框架：**Vitest 2** + Testing Library
- 覆盖：
  - `lib/scoring.test.js` — 各 Finish 类型分值、4 分胜利条件、回合状态转换、回合记录、随机站位、重排规则
  - `context/AppContext.test.jsx` — history 聚合去重（含"页面重载不重复写入"）
  - `lib/storage.test.js` — localStorage 读写 round-trip 与损坏 JSON 容错
  - `data/parts.test.js` — 图鉴条目数量、ID 唯一性、CX 通用组件兼容性及本地图片完整性

---

## 9. 已知限制

- **无多人联机 / 扫码加入 / 后端 / 硬件或蓝牙链接**（纯前端 MVP，符合范围）。
- 上游暂缺 `5-50` Ratchet 与 `LP` Bit 图片，图鉴使用“暂无图片”占位。
- 联网字体在无网时回退系统字体（不影响功能）。
- 历史为对战结束时的不可变快照，不支持事后编辑；无数据导出 / 导入。
- 未附带端到端 / 自动化 UI 测试（计分引擎已隔离为纯函数，便于补单测）。

---

## 10. 后续计划

- [ ] 为社区限定款 / 异色款补充更多官方图片与发布日期
- [ ] 数据导出 / 导入（JSON 备份）
- [ ] 可选：简体中文切换（OpenCC）
- [ ] 可选：端到端 UI 测试

---

_项目由软件开发团队（主理人齐活林 / 工程师寇豆码 / QA 严过关）协作交付。_
