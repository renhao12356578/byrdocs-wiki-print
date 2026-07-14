# BYR Docs Wiki Print

[![Release](https://img.shields.io/github/v/release/renhao12356578/byrdocs-wiki-print?label=Release)](https://github.com/renhao12356578/byrdocs-wiki-print/releases/latest)
[![Build](https://github.com/renhao12356578/byrdocs-wiki-print/actions/workflows/build.yml/badge.svg)](https://github.com/renhao12356578/byrdocs-wiki-print/actions/workflows/build.yml)

为 [BYR Docs 维基真题](https://wiki.byrdocs.org) 试卷页提供打印选项的浏览器扩展，**无需修改或部署主站**即可使用。

## 功能概览

| 能力 | 说明 |
| --- | --- |
| 打印按钮 | 默认插入主站右侧工具栏**最上方**，样式与原有按钮一致；可**拖拽**到任意位置，拖回工具栏附近自动吸附 |
| 打印对话框 | 点打印按钮或 `Ctrl/Cmd + P`（接管开启时）弹出，可配置下方选项 |
| 答案位置 | **默认统一放在文档末尾**（附录页）；也可选「放在原题位置」内联显示 |
| 试题概要 | 右侧「试题信息」卡片，**默认不打印** |
| 接管打印 | **默认开启**：拦截快捷键与主站 `#examPrint`，避免两个打印对话框冲突 |
| 打印排版 | 自动隐藏导航、工具栏、相关试卷、主站打印页脚等无关内容 |

## 打印选项默认值

| 选项 | 默认 |
| --- | --- |
| 打印试题概要信息 | 不勾选 |
| 打印答案 | 勾选 |
| 答案位置 | 统一放在最后 |
| 仅扩展接管打印 | 勾选 |

上次选择会记住，下次打开对话框时沿用。

## 答案放在最后时

- 原题区域**不显示**答案（填空、解析、选择题标记均隐藏）
- 文档末尾自动生成「答案」附录，按大题/小题编号整理
- 与主站 `ExamToolbar` 的打印样式兼容（扩展 CSS 优先级更高）

## 支持的页面

- `https://wiki.byrdocs.org/exam/*`
- `http://localhost:4321/exam/*`（本地 `byrdocs-neowiki` 开发预览）
- `http://127.0.0.1:4321/exam/*`

## 安装

### 从 Release 安装（推荐）

1. **[下载最新版 zip](https://github.com/renhao12356578/byrdocs-wiki-print/releases/latest/download/byrdocs-wiki-print.zip)**（一键下载，文件名固定）
2. 解压后在 Chrome → `chrome://extensions/` → 开发者模式 → **加载已解压的扩展程序** → 选择解压目录

也可前往 [Releases 页面](https://github.com/renhao12356578/byrdocs-wiki-print/releases) 查看版本说明与带版本号的安装包。

### 本地构建

```bash
git clone https://github.com/renhao12356578/byrdocs-wiki-print.git
cd byrdocs-wiki-print
npm install
npm run build
```

然后在 Chrome 中加载 `dist/` 目录。

Firefox：`about:debugging` →「临时载入附加组件」→ 选择 `dist/manifest.json`。

## 使用

1. 打开任意试卷页（如 [示例](https://wiki.byrdocs.org/exam/25-26-2-%E9%AB%98%E7%AD%89%E6%95%B0%E5%AD%A6B%EF%BC%88%E4%B8%8B%EF%BC%89-%E6%9C%9F%E6%9C%AB/)）
2. 点击工具栏最上方的扩展打印按钮（打印机图标）
3. 按需调整选项，点「打印」
4. 修改代码或更新扩展后，到 `chrome://extensions/` 点刷新，并**刷新试卷页**

### 设置「仅扩展接管打印」

- **开启**（默认）：`Ctrl/Cmd + P` 与主站打印按钮均打开**扩展**对话框
- **关闭**：恢复主站原有打印行为；扩展按钮仍可用

修改方式：

- 打印对话框内勾选/取消「仅扩展接管打印」
- 或右键扩展图标 → **选项**

两处设置同步，保存在 `chrome.storage.local`。

## 开发

```bash
npm run watch    # 监听源码，自动构建到 dist/
npm run package  # 构建并打包 release/byrdocs-wiki-print-v<version>.zip
```

### 项目结构

```
src/
  content.ts        # 入口：检测试卷页、挂载打印功能
  print.ts          # 打印对话框、beforeprint/afterprint 逻辑
  print-appendix.ts # 答案附录生成
  print-button.ts   # 可拖拽打印按钮
  print-takeover.ts # 拦截 Ctrl+P / 主站打印按钮
  settings.ts       # 扩展设置读写
  print.css         # @media print 样式
  ui.css            # 对话框与按钮 UI
options/            # 扩展选项页
dist/               # 构建产物（加载此目录）
```

## CI 与 Release

推送到 `main` / `master` 时，GitHub Actions 会：

1. 运行 `npm run package` 构建 zip
2. 创建/更新 GitHub Release（标签 `v<version>`，与 `package.json` 版本一致）
3. 上传两个安装包：
   - `byrdocs-wiki-print.zip` — 固定文件名，适合 [latest 一键下载](https://github.com/renhao12356578/byrdocs-wiki-print/releases/latest/download/byrdocs-wiki-print.zip)
   - `byrdocs-wiki-print-v<version>.zip` — 带版本号，便于归档

PR 也会打包并上传 artifact，但不会创建 Release。

发布新版本时，请先 bump `package.json` 中的 `version`，再 push 到 `main`。

## 与主站的关系

扩展在试卷页注入 UI 与打印样式，依赖主站已有 DOM：

| 依赖 | 用途 |
| --- | --- |
| `.exam-page-main` | 判断试卷页、定位试题信息卡片 |
| `.wiki-content` | 挂载答案附录 |
| `#examInfoBox` / `.exam-page-main > aside` | 试题概要（线上版无 id，扩展兼容两种结构） |
| `.exam-blank`、`.exam-solution`、`.exam-choices` | 答案收集与显示控制 |
| `window.__examState` | 展开/收起全部答案 |
| `#examToolbarActions` | 打印按钮默认停靠位置 |

主站 [byrdocs-neowiki](https://github.com/byrdocs/byrdocs-neowiki) 的 DOM 或打印逻辑发生较大变更时，可能需要更新扩展。

## 常见问题

**打印里还有「试题信息」？**

- 确认对话框里「打印试题概要信息」未勾选
- 确认已刷新扩展与页面（加载最新 `dist/`）
- 线上 wiki 的 InfoBox 没有 `id="examInfoBox"`，旧版扩展可能无法隐藏；请使用当前版本

**原题里还有答案？**

- 确认答案位置选的是「统一放在最后」
- 刷新扩展后再试

**点打印没反应或出现两个对话框？**

- 检查「仅扩展接管打印」是否与你期望的行为一致
- 关闭接管后，主站与扩展各有一套打印入口，请使用扩展按钮

## 许可证

MIT
